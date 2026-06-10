// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from '../db';
import { 
  events, 
  eventParticipants, 
  eventRsvps,
  eventUpdates,
  recurringEvents,
  eventAnalytics,
  users,
  notifications,
} from '@shared/schema';
import { eq, and, desc, count, sql, gte, lte } from 'drizzle-orm';

export interface RecurrencePattern {
  pattern: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: Date;
  maxOccurrences?: number;
}

export interface SkillMatchingCriteria {
  sport: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  maxParticipants: number;
  balanceTeams?: boolean;
}

export class EventManagementService {
  // Create event with optional recurrence
  async createEvent(eventData: any, recurrence?: RecurrencePattern) {
    const event = await db.insert(events).values(eventData).returning();
    
    if (recurrence && event[0]) {
      await this.createRecurringEventPattern(event[0].id, recurrence);
      
      // Generate recurring instances
      await this.generateRecurringInstances(event[0].id, recurrence);
    }

    return event[0];
  }

  // Handle RSVP with waitlist management
  async rsvpToEvent(eventId: string, userId: string, status: 'attending' | 'not_attending' | 'maybe', notes?: string) {
    // Check if event exists and get details
    const event = await db.select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event[0]) {
      throw new Error('Event not found');
    }

    // Check if registration deadline has passed
    if (event[0].registrationDeadline && new Date() > event[0].registrationDeadline) {
      throw new Error('Registration deadline has passed');
    }

    // Check current RSVP
    const existingRsvp = await db.select()
      .from(eventRsvps)
      .where(and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.userId, userId)
      ))
      .limit(1);

    if (existingRsvp[0]) {
      // Update existing RSVP
      await db.update(eventRsvps)
        .set({ 
          status: status === 'attending' ? 'attending' : status === 'maybe' ? 'maybe' : 'not_attending',
          responseDate: new Date()
        })
        .where(eq(eventRsvps.id, existingRsvp[0].id));
    } else {
      // Create new RSVP
      await db.insert(eventRsvps).values({
        eventId,
        userId,
        status: status === 'attending' ? 'attending' : status === 'maybe' ? 'maybe' : 'not_attending'
      });
    }

    // Handle waitlist logic for events with participant limits
    if (event[0].maxParticipants && status === 'attending') {
      await this.manageEventWaitlist(eventId);
    }

    // Update event participant entry
    await this.updateEventParticipant(eventId, userId, status, notes);

    return { success: true };
  }

  // Manage event waitlist
  private async manageEventWaitlist(eventId: string) {
    const event = await db.select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event[0]?.maxParticipants) return;

    // Count confirmed attendees
    const confirmedCount = await db.select({ count: count() })
      .from(eventRsvps)
      .where(and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.status, 'attending')
      ));

    const confirmed = confirmedCount[0]?.count || 0;

    if (confirmed > event[0].maxParticipants) {
      // Move excess attendees to waitlist
      const excessAttendees = await db.select()
        .from(eventRsvps)
        .where(and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.status, 'attending')
        ))
        .orderBy(desc(eventRsvps.responseDate))
        .limit(confirmed - event[0].maxParticipants);

      for (const attendee of excessAttendees) {
        await db.update(eventParticipants)
          .set({ status: 'waitlist' })
          .where(and(
            eq(eventParticipants.eventId, eventId),
            eq(eventParticipants.userId, attendee.userId)
          ));
        // Keep RSVP counts accurate by moving overflow users out of 'attending'
        await db.update(eventRsvps)
          .set({ status: 'maybe', responseDate: new Date() })
          .where(and(
            eq(eventRsvps.eventId, eventId),
            eq(eventRsvps.userId, attendee.userId)
          ));
      }
    }
  }

  private async promoteWaitlistedUser(eventId: string) {
    const nextWaitlisted = await db.select()
      .from(eventParticipants)
      .where(and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.status, 'waitlist')
      ))
      .orderBy(eventParticipants.registeredAt)
      .limit(1);
    if (!nextWaitlisted[0]) return;
    const userId = nextWaitlisted[0].userId;
    await db.update(eventParticipants)
      .set({ status: 'confirmed', rsvpDate: new Date() })
      .where(eq(eventParticipants.id, nextWaitlisted[0].id));
    await db.update(eventRsvps)
      .set({ status: 'attending', responseDate: new Date() })
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)));
    await db.insert(notifications).values({
      userId,
      type: 'event_spot_opened',
      title: 'Spot Available',
      message: 'A spot opened up and you have been moved from waitlist to confirmed.',
      relatedEntityType: 'event',
      relatedEntityId: eventId,
      isRead: false,
    });
  }

  // Update or create event participant entry
  private async updateEventParticipant(eventId: string, userId: string, status: string, notes?: string) {
    const existing = await db.select()
      .from(eventParticipants)
      .where(and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId)
      ))
      .limit(1);

    const participantStatus = status === 'attending' ? 'confirmed' : 
                             status === 'maybe' ? 'pending' : 'declined';
    const wasLeaving = status === "not_attending";

    if (existing[0]) {
      await db.update(eventParticipants)
        .set({ 
          status: participantStatus,
          notes: notes || existing[0].notes,
          rsvpDate: new Date()
        })
        .where(eq(eventParticipants.id, existing[0].id));
    } else {
      await db.insert(eventParticipants).values({
        eventId,
        userId,
        status: participantStatus,
        notes: notes || ''
      });
    }
    if (wasLeaving) {
      await this.promoteWaitlistedUser(eventId);
    }
  }

  // Create event update/announcement
  async createEventUpdate(eventId: string, authorId: string, title: string, content: string, type = 'announcement', priority = 'normal') {
    // Check if user is event organizer
    const event = await db.select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event[0]) {
      throw new Error('Event not found');
    }

    if (event[0].organizerId !== authorId) {
      throw new Error('Only event organizer can create updates');
    }

    return await db.insert(eventUpdates).values({
      eventId,
      authorId,
      title,
      content,
      type,
      priority
    }).returning();
  }

  // Get event with full details
  async getEventDetails(eventId: string) {
    const event = await db.select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event[0]) return null;

    // Get RSVP counts
    const rsvpCounts = await db.select({
      status: eventRsvps.status,
      count: count()
    })
    .from(eventRsvps)
    .where(eq(eventRsvps.eventId, eventId))
    .groupBy(eventRsvps.status);

    // Get participants with user details
    const participants = await db.select({
      id: eventParticipants.id,
      userId: eventParticipants.userId,
      status: eventParticipants.status,
      skillLevel: eventParticipants.skillLevel,
      notes: eventParticipants.notes,
      checkedIn: eventParticipants.checkedIn,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl
    })
    .from(eventParticipants)
    .innerJoin(users, eq(eventParticipants.userId, users.id))
    .where(eq(eventParticipants.eventId, eventId))
    .orderBy(eventParticipants.registeredAt);

    // Get recent updates
    const updates = await db.select()
      .from(eventUpdates)
      .where(eq(eventUpdates.eventId, eventId))
      .orderBy(desc(eventUpdates.createdAt))
      .limit(10);

    return {
      ...event[0],
      rsvpCounts,
      participants,
      updates
    };
  }

  // Create recurring event pattern
  private async createRecurringEventPattern(parentEventId: string, recurrence: RecurrencePattern) {
    return await db.insert(recurringEvents).values({
      parentEventId,
      recurrencePattern: recurrence.pattern,
      recurrenceInterval: recurrence.interval,
      recurrenceEnd: recurrence.endDate,
      maxOccurrences: recurrence.maxOccurrences
    });
  }

  // Generate recurring event instances
  private async generateRecurringInstances(parentEventId: string, recurrence: RecurrencePattern) {
    const parentEvent = await db.select()
      .from(events)
      .where(eq(events.id, parentEventId))
      .limit(1);

    if (!parentEvent[0]) return;

    let currentDate = new Date(parentEvent[0].startDate);
    let instanceCount = 0;
    const maxInstances = recurrence.maxOccurrences || 52; // Default to 1 year

    while (instanceCount < maxInstances) {
      // Calculate next date based on pattern
      switch (recurrence.pattern) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + recurrence.interval);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + (7 * recurrence.interval));
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + recurrence.interval);
          break;
      }

      // Check if we've reached the end date
      if (recurrence.endDate && currentDate > recurrence.endDate) {
        break;
      }

      // Create recurring instance
      const endDate = parentEvent[0].endDate ? 
        new Date(currentDate.getTime() + (parentEvent[0].endDate.getTime() - parentEvent[0].startDate.getTime())) :
        null;

      await db.insert(events).values({
        title: `${parentEvent[0].title} (Recurring)`,
        description: parentEvent[0].description,
        eventType: parentEvent[0].eventType,
        sport: parentEvent[0].sport,
        location: parentEvent[0].location,
        startDate: new Date(currentDate),
        endDate,
        maxParticipants: parentEvent[0].maxParticipants,
        organizerId: parentEvent[0].organizerId,
        isPublic: parentEvent[0].isPublic,
        registrationDeadline: parentEvent[0].registrationDeadline ? 
          new Date(currentDate.getTime() - (parentEvent[0].startDate.getTime() - parentEvent[0].registrationDeadline.getTime())) :
          null
      });

      instanceCount++;
    }
  }

  // Skill-based team matching for events
  async matchParticipantsBySkill(eventId: string, criteria: SkillMatchingCriteria) {
    const participants = await db.select({
      userId: eventParticipants.userId,
      skillLevel: eventParticipants.skillLevel,
      firstName: users.firstName,
      lastName: users.lastName
    })
    .from(eventParticipants)
    .innerJoin(users, eq(eventParticipants.userId, users.id))
    .where(and(
      eq(eventParticipants.eventId, eventId),
      eq(eventParticipants.status, 'confirmed')
    ));

    // Group by skill level
    const skillGroups = participants.reduce((groups, participant) => {
      const skill = participant.skillLevel || 'intermediate';
      if (!groups[skill]) groups[skill] = [];
      groups[skill].push(participant);
      return groups;
    }, {} as Record<string, typeof participants>);

    // Create balanced teams if requested
    if (criteria.balanceTeams) {
      return this.createBalancedTeams(skillGroups, criteria.maxParticipants);
    }

    return skillGroups;
  }

  // Create balanced teams based on skill levels
  private createBalancedTeams(skillGroups: Record<string, any[]>, maxPerTeam: number) {
    const teams: any[][] = [];
    const skillOrder = ['expert', 'advanced', 'intermediate', 'beginner'];
    
    // Distribute players to create balanced teams
    let teamIndex = 0;
    
    for (const skill of skillOrder) {
      const players = skillGroups[skill] || [];
      
      for (const player of players) {
        if (!teams[teamIndex]) teams[teamIndex] = [];
        
        if (teams[teamIndex].length < maxPerTeam) {
          teams[teamIndex].push({ ...player, assignedSkill: skill });
        } else {
          teamIndex++;
          if (!teams[teamIndex]) teams[teamIndex] = [];
          teams[teamIndex].push({ ...player, assignedSkill: skill });
        }
        
        // Rotate to next team for balance
        teamIndex = (teamIndex + 1) % Math.ceil(Object.values(skillGroups).flat().length / maxPerTeam);
      }
    }

    return teams;
  }

  // Check in participant
  async checkInParticipant(eventId: string, userId: string, organizerId: string) {
    // Verify organizer
    const event = await db.select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event[0] || event[0].organizerId !== organizerId) {
      throw new Error('Only event organizer can check in participants');
    }

    await db.update(eventParticipants)
      .set({ 
        checkedIn: true,
        checkedInAt: new Date()
      })
      .where(and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId)
      ));

    return { success: true };
  }

  // Calculate and update event analytics
  async updateEventAnalytics(eventId: string) {
    const rsvpStats = await db.select({
      totalRsvps: count(),
      confirmedCount: sql<number>`count(*) filter (where status = 'attending')`,
    })
    .from(eventRsvps)
    .where(eq(eventRsvps.eventId, eventId));

    const participantStats = await db.select({
      actualAttendees: sql<number>`count(*) filter (where checked_in = true)`,
      totalParticipants: count()
    })
    .from(eventParticipants)
    .where(eq(eventParticipants.eventId, eventId));

    const stats = {
      totalRsvps: rsvpStats[0]?.totalRsvps || 0,
      confirmedAttendees: rsvpStats[0]?.confirmedCount || 0,
      actualAttendees: participantStats[0]?.actualAttendees || 0
    };

    // Calculate no-show rate
    const noShowRate = stats.confirmedAttendees > 0 ? 
      ((stats.confirmedAttendees - stats.actualAttendees) / stats.confirmedAttendees * 100) : 0;

    // Upsert analytics
    const existing = await db.select()
      .from(eventAnalytics)
      .where(eq(eventAnalytics.eventId, eventId))
      .limit(1);

    if (existing[0]) {
      await db.update(eventAnalytics)
        .set({
          ...stats,
          noShowRate: noShowRate.toString(),
          calculatedAt: new Date()
        })
        .where(eq(eventAnalytics.eventId, eventId));
    } else {
      await db.insert(eventAnalytics).values({
        eventId,
        ...stats,
        noShowRate: noShowRate.toString()
      });
    }

    return stats;
  }

  // Get events by organizer with analytics
  async getOrganizerEvents(organizerId: string) {
    const organizerEvents = await db.select()
      .from(events)
      .where(eq(events.organizerId, organizerId))
      .orderBy(desc(events.startDate));

    // Get analytics for each event
    const eventsWithAnalytics = await Promise.all(
      organizerEvents.map(async (event) => {
        const analytics = await db.select()
          .from(eventAnalytics)
          .where(eq(eventAnalytics.eventId, event.id))
          .limit(1);

        return {
          ...event,
          analytics: analytics[0] || null
        };
      })
    );

    return eventsWithAnalytics;
  }
}

export const eventManagementService = new EventManagementService();