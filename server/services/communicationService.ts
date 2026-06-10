// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from '../db';
import { 
  teamChannels,
  teamChannelMessages,
  teamMembers,
  events,
  eventParticipants,
  teams,
  eventUpdates,
  notifications,
  users 
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { broadcastLiveUpdate } from '../realtime/socketServer';

export interface NotificationPayload {
  userId: string;
  type: 'team_invite' | 'event_rsvp' | 'team_announcement' | 'event_update' | 'role_change';
  title: string;
  message: string;
  data?: any;
}

export class CommunicationService {
  // Send message to team channel
  async sendChannelMessage(channelId: string, senderId: string, content: string, messageType = 'text', priority = 'normal') {
    // Verify user has access to channel
    const channel = await db.select({
      id: teamChannels.id,
      teamId: teamChannels.teamId,
      name: teamChannels.name
    })
    .from(teamChannels)
    .where(eq(teamChannels.id, channelId))
    .limit(1);

    if (!channel[0]) {
      throw new Error('Channel not found');
    }

    // Check if user is team member
    const isMember = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, channel[0].teamId),
        eq(teamMembers.userId, senderId),
        eq(teamMembers.status, 'active')
      ))
      .limit(1);

    if (!isMember[0]) {
      throw new Error('Must be team member to send messages');
    }

    const message = await db.insert(teamChannelMessages).values({
      channelId,
      senderId,
      content,
      messageType,
      priority
    }).returning();

    // Get sender info for broadcast
    const sender = await db.select()
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);

    // Broadcast to team members
    await this.broadcastToTeamMembers(channel[0].teamId, {
      type: 'team_message',
      data: {
        message: message[0],
        sender: sender[0],
        channel: channel[0]
      }
    });

    return message[0];
  }

  // Get channel messages with pagination
  async getChannelMessages(channelId: string, userId: string, limit = 50, offset = 0) {
    // Verify user has access
    const channel = await db.select()
      .from(teamChannels)
      .where(eq(teamChannels.id, channelId))
      .limit(1);

    if (!channel[0]) {
      throw new Error('Channel not found');
    }

    // Check team membership
    const isMember = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, channel[0].teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, 'active')
      ))
      .limit(1);

    if (!isMember[0]) {
      throw new Error('Must be team member to view messages');
    }

    return await db.select({
      id: teamChannelMessages.id,
      content: teamChannelMessages.content,
      messageType: teamChannelMessages.messageType,
      priority: teamChannelMessages.priority,
      createdAt: teamChannelMessages.createdAt,
      isEdited: teamChannelMessages.isEdited,
      editedAt: teamChannelMessages.editedAt,
      senderId: teamChannelMessages.senderId,
      senderFirstName: users.firstName,
      senderLastName: users.lastName,
      senderProfileImage: users.profileImageUrl
    })
    .from(teamChannelMessages)
    .innerJoin(users, eq(teamChannelMessages.senderId, users.id))
    .where(eq(teamChannelMessages.channelId, channelId))
    .orderBy(desc(teamChannelMessages.createdAt))
    .limit(limit)
    .offset(offset);
  }

  // Send notification to user
  async sendNotification(payload: NotificationPayload) {
    const notification = await db.insert(notifications).values({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data
    }).returning();

    // Broadcast real-time notification
    await broadcastLiveUpdate({
      type: 'notification',
      userId: payload.userId,
      data: notification[0]
    });

    return notification[0];
  }

  // Send notifications to multiple users
  async sendBulkNotifications(payloads: NotificationPayload[]) {
    const notifications = await db.insert(notifications).values(
      payloads.map(payload => ({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data
      }))
    ).returning();

    // Broadcast to all users
    for (const notification of notifications) {
      await broadcastLiveUpdate({
        type: 'notification',
        userId: notification.userId,
        data: notification
      });
    }

    return notifications;
  }

  // Notify team members about team events
  async notifyTeamMembers(teamId: string, notification: Omit<NotificationPayload, 'userId'>) {
    // Get active team members
    const members = await db.select({
      userId: teamMembers.userId
    })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.status, 'active')
    ));

    if (members.length === 0) return [];

    const payloads = members.map(member => ({
      ...notification,
      userId: member.userId
    }));

    return await this.sendBulkNotifications(payloads);
  }

  // Notify event participants
  async notifyEventParticipants(eventId: string, notification: Omit<NotificationPayload, 'userId'>) {
    // Get event participants
    const participants = await db.select({
      userId: eventParticipants.userId
    })
    .from(eventParticipants)
    .where(and(
      eq(eventParticipants.eventId, eventId),
      eq(eventParticipants.status, 'confirmed')
    ));

    if (participants.length === 0) return [];

    const payloads = participants.map(participant => ({
      ...notification,
      userId: participant.userId
    }));

    return await this.sendBulkNotifications(payloads);
  }

  // Broadcast message to team members via WebSocket
  private async broadcastToTeamMembers(teamId: string, message: any) {
    // Get team members
    const members = await db.select({
      userId: teamMembers.userId
    })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.status, 'active')
    ));

    // Broadcast to each member
    for (const member of members) {
      await broadcastLiveUpdate({
        ...message,
        userId: member.userId
      });
    }
  }

  // Create event reminder notifications
  async createEventReminders(eventId: string, reminderType: 'day_before' | 'hour_before' | 'starting_soon') {
    // Get event details
    const event = await db.select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event[0]) return;

    let title: string;
    let message: string;

    switch (reminderType) {
      case 'day_before':
        title = 'Event Reminder - Tomorrow';
        message = `Don't forget about "${event[0].title}" tomorrow at ${event[0].startDate}`;
        break;
      case 'hour_before':
        title = 'Event Starting Soon';
        message = `"${event[0].title}" starts in 1 hour at ${event[0].location}`;
        break;
      case 'starting_soon':
        title = 'Event Starting Now';
        message = `"${event[0].title}" is starting now! Don't be late.`;
        break;
    }

    await this.notifyEventParticipants(eventId, {
      type: 'event_rsvp',
      title,
      message,
      data: { eventId, reminderType }
    });
  }

  // Handle team role change notifications
  async notifyRoleChange(teamId: string, userId: string, newRole: string, assignedBy: string) {
    const assigner = await db.select()
      .from(users)
      .where(eq(users.id, assignedBy))
      .limit(1);

    const team = await db.select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    await this.sendNotification({
      userId,
      type: 'role_change',
      title: 'Role Updated',
      message: `You have been assigned the role of ${newRole} in ${team[0]?.name} by ${assigner[0]?.firstName}`,
      data: { teamId, newRole, assignedBy }
    });
  }

  // Handle team join request notifications
  async notifyJoinRequest(teamId: string, requesterId: string, message?: string) {
    // Get team captains and co-captains
    const leaders = await db.select({
      userId: teamMembers.userId
    })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      sql`${teamMembers.role} IN ('captain', 'co-captain')`,
      eq(teamMembers.status, 'active')
    ));

    const requester = await db.select()
      .from(users)
      .where(eq(users.id, requesterId))
      .limit(1);

    const team = await db.select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    const payloads = leaders.map(leader => ({
      userId: leader.userId,
      type: 'team_invite' as const,
      title: 'New Join Request',
      message: `${requester[0]?.firstName} wants to join ${team[0]?.name}${message ? ': ' + message : ''}`,
      data: { teamId, requesterId, message }
    }));

    return await this.sendBulkNotifications(payloads);
  }

  // Edit channel message
  async editChannelMessage(messageId: string, userId: string, newContent: string) {
    // Verify user owns the message
    const message = await db.select()
      .from(teamChannelMessages)
      .where(eq(teamChannelMessages.id, messageId))
      .limit(1);

    if (!message[0]) {
      throw new Error('Message not found');
    }

    if (message[0].senderId !== userId) {
      throw new Error('Can only edit your own messages');
    }

    await db.update(teamChannelMessages)
      .set({
        content: newContent,
        isEdited: true,
        editedAt: new Date()
      })
      .where(eq(teamChannelMessages.id, messageId));

    return { success: true };
  }

  // Delete channel message
  async deleteChannelMessage(messageId: string, userId: string) {
    const message = await db.select()
      .from(teamChannelMessages)
      .where(eq(teamChannelMessages.id, messageId))
      .limit(1);

    if (!message[0]) {
      throw new Error('Message not found');
    }

    if (message[0].senderId !== userId) {
      throw new Error('Can only delete your own messages');
    }

    await db.delete(teamChannelMessages)
      .where(eq(teamChannelMessages.id, messageId));

    return { success: true };
  }

  // Get user notifications
  async getUserNotifications(userId: string, limit = 20, offset = 0) {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string, userId: string) {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));

    return { success: true };
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId: string) {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));

    return { success: true };
  }
}

export const communicationService = new CommunicationService();