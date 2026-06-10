// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from '../db';
import { 
  teams,
  teamMembers,
  teamStats,
  events,
  eventParticipants,
  eventRsvps,
  eventAnalytics,
  users,
  analyticsEvents
} from '@shared/schema';
import { eq, and, desc, count, avg, sql, gte, lte } from 'drizzle-orm';

export interface TeamAnalytics {
  teamId: string;
  teamName: string;
  totalMembers: number;
  activeMembers: number;
  avgAttendance: number;
  gamesPlayed: number;
  winRate: number;
  memberRetention: number;
  growthRate: number;
  engagementScore: number;
  recentActivity: any[];
}

export interface EventAnalytics {
  eventId: string;
  eventTitle: string;
  totalRsvps: number;
  confirmedAttendees: number;
  actualAttendees: number;
  noShowRate: number;
  satisfactionScore: number;
  avgSkillLevel: string;
  participantFeedback: any[];
  popularTimeSlots: any[];
}

export interface PlatformAnalytics {
  totalTeams: number;
  totalEvents: number;
  totalUsers: number;
  activeUsers: number;
  teamParticipationRate: number;
  eventParticipationRate: number;
  userGrowthRate: number;
  popularSports: any[];
  peakActivityHours: any[];
  geographicDistribution: any[];
}

export class AnalyticsService {
  // Get comprehensive team analytics
  async getTeamAnalytics(teamId: string, timeframe = '30d'): Promise<TeamAnalytics> {
    const startDate = this.getStartDate(timeframe);

    // Basic team info
    const team = await db.select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team[0]) {
      throw new Error('Team not found');
    }

    // Member statistics
    const memberStats = await db.select({
      totalMembers: count(),
      activeMembers: sql<number>`count(*) filter (where status = 'active')`,
      avgAttendance: avg(teamMembers.attendance),
    })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

    // Team performance stats
    const teamPerformance = await db.select()
      .from(teamStats)
      .where(eq(teamStats.teamId, teamId))
      .limit(1);

    // Member activity in timeframe
    const recentActivity = await db.select({
      userId: teamMembers.userId,
      userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      lastActive: teamMembers.lastActive,
      attendance: teamMembers.attendance,
      gamesPlayed: teamMembers.gamesPlayed
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.status, 'active'),
      gte(teamMembers.lastActive, startDate)
    ))
    .orderBy(desc(teamMembers.lastActive));

    // Calculate engagement score (based on recent activity, attendance, games played)
    const engagementScore = this.calculateTeamEngagementScore(
      memberStats[0]?.activeMembers || 0,
      memberStats[0]?.avgAttendance || 0,
      recentActivity.length
    );

    // Calculate growth rate (new members in timeframe)
    const newMembersCount = await db.select({ count: count() })
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        gte(teamMembers.joinedAt, startDate)
      ));

    const growthRate = this.calculateGrowthRate(
      newMembersCount[0]?.count || 0,
      memberStats[0]?.totalMembers || 0
    );

    // Calculate member retention
    const memberRetention = this.calculateMemberRetention(memberStats[0]?.activeMembers || 0, memberStats[0]?.totalMembers || 0);

    return {
      teamId,
      teamName: team[0].name,
      totalMembers: memberStats[0]?.totalMembers || 0,
      activeMembers: memberStats[0]?.activeMembers || 0,
      avgAttendance: memberStats[0]?.avgAttendance || 0,
      gamesPlayed: teamPerformance[0]?.gamesPlayed || 0,
      winRate: this.calculateWinRate(teamPerformance[0]),
      memberRetention,
      growthRate,
      engagementScore,
      recentActivity
    };
  }

  // Get comprehensive event analytics
  async getEventAnalytics(eventId: string): Promise<EventAnalytics> {
    // Basic event info
    const event = await db.select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event[0]) {
      throw new Error('Event not found');
    }

    // RSVP statistics
    const rsvpStats = await db.select({
      totalRsvps: count(),
      confirmedCount: sql<number>`count(*) filter (where status = 'attending')`,
    })
    .from(eventRsvps)
    .where(eq(eventRsvps.eventId, eventId));

    // Participant statistics
    const participantStats = await db.select({
      actualAttendees: sql<number>`count(*) filter (where checked_in = true)`,
      avgSkillLevel: sql<string>`mode() within group (order by skill_level)`,
    })
    .from(eventParticipants)
    .where(eq(eventParticipants.eventId, eventId));

    // Get existing analytics if available
    const existingAnalytics = await db.select()
      .from(eventAnalytics)
      .where(eq(eventAnalytics.eventId, eventId))
      .limit(1);

    const totalRsvps = rsvpStats[0]?.totalRsvps || 0;
    const confirmedAttendees = rsvpStats[0]?.confirmedCount || 0;
    const actualAttendees = participantStats[0]?.actualAttendees || 0;

    // Calculate no-show rate
    const noShowRate = confirmedAttendees > 0 ? 
      ((confirmedAttendees - actualAttendees) / confirmedAttendees * 100) : 0;

    // Get participant feedback (placeholder - would come from feedback system)
    const participantFeedback = await this.getEventFeedback(eventId);

    // Calculate satisfaction score from feedback
    const satisfactionScore = this.calculateSatisfactionScore(participantFeedback);

    return {
      eventId,
      eventTitle: event[0].title,
      totalRsvps,
      confirmedAttendees,
      actualAttendees,
      noShowRate,
      satisfactionScore,
      avgSkillLevel: participantStats[0]?.avgSkillLevel || 'intermediate',
      participantFeedback,
      popularTimeSlots: [] // Would be calculated from historical data
    };
  }

  // Get platform-wide analytics
  async getPlatformAnalytics(timeframe = '30d'): Promise<PlatformAnalytics> {
    const startDate = this.getStartDate(timeframe);

    // Basic counts
    const totalTeams = await db.select({ count: count() }).from(teams);
    const totalEvents = await db.select({ count: count() }).from(events);
    const totalUsers = await db.select({ count: count() }).from(users);

    // Active users (based on recent activity)
    const activeUsers = await db.select({ count: count() })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, startDate));

    // Team participation rate
    const usersWithTeams = await db.select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.status, 'active'));

    // Event participation rate
    const usersWithEvents = await db.select({ count: count() })
      .from(eventParticipants)
      .where(gte(eventParticipants.registeredAt, startDate));

    // Popular sports
    const popularSports = await db.select({
      sport: teams.sport,
      teamCount: count()
    })
    .from(teams)
    .groupBy(teams.sport)
    .orderBy(desc(count()))
    .limit(10);

    // User growth rate
    const newUsers = await db.select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, startDate));

    const userGrowthRate = this.calculateGrowthRate(
      newUsers[0]?.count || 0,
      totalUsers[0]?.count || 0
    );

    // Peak activity hours (would require more detailed tracking)
    const peakActivityHours = await this.calculatePeakActivityHours(startDate);

    return {
      totalTeams: totalTeams[0]?.count || 0,
      totalEvents: totalEvents[0]?.count || 0,
      totalUsers: totalUsers[0]?.count || 0,
      activeUsers: activeUsers[0]?.count || 0,
      teamParticipationRate: this.calculateParticipationRate(
        usersWithTeams[0]?.count || 0,
        totalUsers[0]?.count || 0
      ),
      eventParticipationRate: this.calculateParticipationRate(
        usersWithEvents[0]?.count || 0,
        totalUsers[0]?.count || 0
      ),
      userGrowthRate,
      popularSports,
      peakActivityHours,
      geographicDistribution: [] // Would require location data
    };
  }

  // Get team comparison analytics
  async compareTeams(teamIds: string[], metric: 'performance' | 'engagement' | 'growth') {
    const comparisons = await Promise.all(
      teamIds.map(teamId => this.getTeamAnalytics(teamId))
    );

    // Sort by selected metric
    switch (metric) {
      case 'performance':
        return comparisons.sort((a, b) => b.winRate - a.winRate);
      case 'engagement':
        return comparisons.sort((a, b) => b.engagementScore - a.engagementScore);
      case 'growth':
        return comparisons.sort((a, b) => b.growthRate - a.growthRate);
      default:
        return comparisons;
    }
  }

  // Get event performance trends
  async getEventTrends(organizerId: string, timeframe = '90d') {
    const startDate = this.getStartDate(timeframe);

    const events = await db.select({
      id: events.id,
      title: events.title,
      startDate: events.startDate,
      sport: events.sport
    })
    .from(events)
    .where(and(
      eq(events.organizerId, organizerId),
      gte(events.startDate, startDate)
    ))
    .orderBy(events.startDate);

    const trendsData = await Promise.all(
      events.map(async (event) => {
        const analytics = await this.getEventAnalytics(event.id);
        return {
          ...event,
          analytics
        };
      })
    );

    return trendsData;
  }

  // Helper methods
  private getStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateTeamEngagementScore(activeMembers: number, avgAttendance: number, recentActivityCount: number): number {
    // Weighted score out of 100
    const memberWeight = 0.3;
    const attendanceWeight = 0.4;
    const activityWeight = 0.3;

    const memberScore = Math.min(activeMembers * 10, 100); // Cap at 100
    const attendanceScore = (avgAttendance / 100) * 100; // Convert to percentage
    const activityScore = Math.min(recentActivityCount * 5, 100); // Cap at 100

    return (memberScore * memberWeight + attendanceScore * attendanceWeight + activityScore * activityWeight);
  }

  private calculateWinRate(teamStats: any): number {
    if (!teamStats || teamStats.gamesPlayed === 0) return 0;
    return (teamStats.wins / teamStats.gamesPlayed) * 100;
  }

  private calculateGrowthRate(newCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    return (newCount / totalCount) * 100;
  }

  private calculateMemberRetention(activeMembers: number, totalMembers: number): number {
    if (totalMembers === 0) return 0;
    return (activeMembers / totalMembers) * 100;
  }

  private calculateParticipationRate(participants: number, totalUsers: number): number {
    if (totalUsers === 0) return 0;
    return (participants / totalUsers) * 100;
  }

  private async getEventFeedback(eventId: string): Promise<any[]> {
    // Placeholder - would integrate with feedback/rating system
    return [];
  }

  private calculateSatisfactionScore(feedback: any[]): number {
    if (feedback.length === 0) return 0;
    const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
    return (avgRating / 5) * 100; // Convert to percentage
  }

  private async calculatePeakActivityHours(startDate: Date): Promise<any[]> {
    // Placeholder - would analyze user activity patterns
    return [
      { hour: 18, activityCount: 150 },
      { hour: 19, activityCount: 200 },
      { hour: 20, activityCount: 180 }
    ];
  }
}

export const analyticsService = new AnalyticsService();