// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from '../db';
import { 
  teams, 
  teamMembers, 
  teamJoinRequests, 
  teamStats, 
  teamChannels,
  teamChannelMessages,
  users 
} from '@shared/schema';
import { eq, and, desc, count, avg, sql } from 'drizzle-orm';

export interface TeamRole {
  canManageMembers: boolean;
  canManageEvents: boolean;
  canManageChannels: boolean;
  canKickMembers: boolean;
  canEditTeam: boolean;
}

export const TEAM_ROLES: Record<string, TeamRole> = {
  captain: {
    canManageMembers: true,
    canManageEvents: true,
    canManageChannels: true,
    canKickMembers: true,
    canEditTeam: true,
  },
  'co-captain': {
    canManageMembers: true,
    canManageEvents: true,
    canManageChannels: true,
    canKickMembers: true,
    canEditTeam: false,
  },
  member: {
    canManageMembers: false,
    canManageEvents: false,
    canManageChannels: false,
    canKickMembers: false,
    canEditTeam: false,
  },
};

export class TeamManagementService {
  // Check if user has permission for a specific action
  async hasPermission(teamId: string, userId: string, permission: keyof TeamRole): Promise<boolean> {
    const member = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, 'active')
      ))
      .limit(1);

    if (!member[0]) return false;

    const role = TEAM_ROLES[member[0].role];
    return role?.[permission] || false;
  }

  // Get team with enhanced member information
  async getTeamWithMembers(teamId: string) {
    const team = await db.select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team[0]) return null;

    const members = await db.select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      role: teamMembers.role,
      status: teamMembers.status,
      joinedAt: teamMembers.joinedAt,
      skillLevel: teamMembers.skillLevel,
      attendance: teamMembers.attendance,
      gamesPlayed: teamMembers.gamesPlayed,
      lastActive: teamMembers.lastActive,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(desc(teamMembers.joinedAt));

    const stats = await this.getTeamStats(teamId);

    return {
      ...team[0],
      members,
      stats
    };
  }

  // Handle team join requests
  async requestToJoinTeam(teamId: string, userId: string, message?: string) {
    // Check if user is already a member or has pending request
    const existingMember = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ))
      .limit(1);

    if (existingMember[0]) {
      throw new Error('User is already a member or has a pending request');
    }

    const existingRequest = await db.select()
      .from(teamJoinRequests)
      .where(and(
        eq(teamJoinRequests.teamId, teamId),
        eq(teamJoinRequests.userId, userId),
        eq(teamJoinRequests.status, 'pending')
      ))
      .limit(1);

    if (existingRequest[0]) {
      throw new Error('Join request already pending');
    }

    return await db.insert(teamJoinRequests).values({
      teamId,
      userId,
      message: message || '',
      status: 'pending'
    }).returning();
  }

  // Approve or reject join request
  async reviewJoinRequest(requestId: string, reviewerId: string, decision: 'approved' | 'rejected') {
    const request = await db.select()
      .from(teamJoinRequests)
      .where(eq(teamJoinRequests.id, requestId))
      .limit(1);

    if (!request[0]) {
      throw new Error('Join request not found');
    }

    // Check if reviewer has permission
    const hasPermission = await this.hasPermission(request[0].teamId, reviewerId, 'canManageMembers');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to review join requests');
    }

    await db.update(teamJoinRequests)
      .set({
        status: decision,
        reviewedBy: reviewerId,
        reviewedAt: new Date()
      })
      .where(eq(teamJoinRequests.id, requestId));

    // If approved, add user to team
    if (decision === 'approved') {
      await db.insert(teamMembers).values({
        teamId: request[0].teamId,
        userId: request[0].userId,
        role: 'member',
        status: 'active',
        approvedBy: reviewerId,
        approvedAt: new Date()
      });

      // Update team member count
      await this.updateTeamMemberCount(request[0].teamId);
    }

    return request[0];
  }

  // Assign or change member role
  async assignRole(teamId: string, memberId: string, newRole: string, assignerId: string) {
    // Check if assigner has permission
    const hasPermission = await this.hasPermission(teamId, assignerId, 'canManageMembers');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to assign roles');
    }

    // Prevent captain from being demoted (must transfer captainship first)
    const currentMember = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, memberId)
      ))
      .limit(1);

    if (!currentMember[0]) {
      throw new Error('Member not found');
    }

    if (currentMember[0].role === 'captain' && newRole !== 'captain') {
      throw new Error('Cannot demote captain without transferring captainship');
    }

    await db.update(teamMembers)
      .set({ role: newRole })
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, memberId)
      ));

    return { success: true };
  }

  // Remove member from team
  async removeMember(teamId: string, memberId: string, removerId: string) {
    const hasPermission = await this.hasPermission(teamId, removerId, 'canKickMembers');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to remove members');
    }

    // Cannot remove captain
    const member = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, memberId)
      ))
      .limit(1);

    if (member[0]?.role === 'captain') {
      throw new Error('Cannot remove team captain');
    }

    await db.delete(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, memberId)
      ));

    await this.updateTeamMemberCount(teamId);
    return { success: true };
  }

  // Get team statistics
  async getTeamStats(teamId: string) {
    let stats = await db.select()
      .from(teamStats)
      .where(eq(teamStats.teamId, teamId))
      .limit(1);

    if (!stats[0]) {
      // Create initial stats
      await db.insert(teamStats).values({
        teamId,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalEvents: 0,
        avgAttendance: '0'
      });

      stats = await db.select()
        .from(teamStats)
        .where(eq(teamStats.teamId, teamId))
        .limit(1);
    }

    // Get member activity stats
    const memberStats = await db.select({
      totalMembers: count(),
      avgAttendance: avg(teamMembers.attendance),
      avgGamesPlayed: avg(teamMembers.gamesPlayed)
    })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.status, 'active')
    ));

    return {
      ...stats[0],
      totalMembers: memberStats[0]?.totalMembers || 0,
      memberAvgAttendance: memberStats[0]?.avgAttendance || 0,
      memberAvgGames: memberStats[0]?.avgGamesPlayed || 0
    };
  }

  // Update team member count
  private async updateTeamMemberCount(teamId: string) {
    const memberCount = await db.select({ count: count() })
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.status, 'active')
      ));

    await db.update(teams)
      .set({ currentMembers: memberCount[0]?.count || 0 })
      .where(eq(teams.id, teamId));
  }

  // Get pending join requests for team
  async getJoinRequests(teamId: string, requesterId: string) {
    const hasPermission = await this.hasPermission(teamId, requesterId, 'canManageMembers');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to view join requests');
    }

    return await db.select({
      id: teamJoinRequests.id,
      userId: teamJoinRequests.userId,
      message: teamJoinRequests.message,
      status: teamJoinRequests.status,
      createdAt: teamJoinRequests.createdAt,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
    })
    .from(teamJoinRequests)
    .innerJoin(users, eq(teamJoinRequests.userId, users.id))
    .where(and(
      eq(teamJoinRequests.teamId, teamId),
      eq(teamJoinRequests.status, 'pending')
    ))
    .orderBy(desc(teamJoinRequests.createdAt));
  }

  // Create team channel
  async createChannel(teamId: string, creatorId: string, name: string, description?: string, channelType = 'general') {
    const hasPermission = await this.hasPermission(teamId, creatorId, 'canManageChannels');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to create channels');
    }

    return await db.insert(teamChannels).values({
      teamId,
      name,
      description,
      channelType,
      createdBy: creatorId
    }).returning();
  }

  // Get team channels
  async getTeamChannels(teamId: string, userId: string) {
    // Check if user is team member
    const isMember = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, 'active')
      ))
      .limit(1);

    if (!isMember[0]) {
      throw new Error('Must be team member to view channels');
    }

    return await db.select()
      .from(teamChannels)
      .where(eq(teamChannels.teamId, teamId))
      .orderBy(teamChannels.createdAt);
  }

  // Update member activity tracking
  async updateMemberActivity(teamId: string, userId: string, activityType: 'attendance' | 'game') {
    const member = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ))
      .limit(1);

    if (!member[0]) return;

    const updates: any = { lastActive: new Date() };
    
    if (activityType === 'attendance') {
      updates.attendance = member[0].attendance + 1;
    } else if (activityType === 'game') {
      updates.gamesPlayed = member[0].gamesPlayed + 1;
    }

    await db.update(teamMembers)
      .set(updates)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
  }
}

export const teamManagementService = new TeamManagementService();