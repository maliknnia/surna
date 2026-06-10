// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from '../db';
import { events, eventParticipants, users } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  organizer?: string;
  participants?: string[];
  sport?: string;
  isRecurring?: boolean;
}

export interface ICalendarEvent {
  uid: string;
  dtstart: string;
  dtend?: string;
  summary: string;
  description?: string;
  location?: string;
  organizer?: string;
}

export class CalendarService {
  // Export user's events to iCal format
  async exportUserEventsToICal(userId: string, timeframe = '3m'): Promise<string> {
    const events = await this.getUserEvents(userId, timeframe);
    return this.generateICalData(events);
  }

  // Export team's events to iCal format
  async exportTeamEventsToICal(teamId: string, timeframe = '3m'): Promise<string> {
    const events = await this.getTeamEvents(teamId, timeframe);
    return this.generateICalData(events);
  }

  // Get user's events for calendar integration
  async getUserEvents(userId: string, timeframe = '3m'): Promise<CalendarEvent[]> {
    const startDate = this.getStartDate(timeframe);
    const endDate = this.getEndDate(timeframe);

    // Get events user is registered for
    const userEvents = await db.select({
      id: events.id,
      title: events.title,
      description: events.description,
      startDate: events.startDate,
      endDate: events.endDate,
      location: events.location,
      sport: events.sport,
      organizerName: users.firstName
    })
    .from(eventParticipants)
    .innerJoin(events, eq(eventParticipants.eventId, events.id))
    .leftJoin(users, eq(events.organizerId, users.id))
    .where(and(
      eq(eventParticipants.userId, userId),
      eq(eventParticipants.status, 'confirmed'),
      gte(events.startDate, startDate),
      lte(events.startDate, endDate)
    ));

    return userEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      startDate: event.startDate,
      endDate: event.endDate || undefined,
      location: event.location || '',
      organizer: event.organizerName || '',
      sport: event.sport || ''
    }));
  }

  // Get team events for calendar integration
  async getTeamEvents(teamId: string, timeframe = '3m'): Promise<CalendarEvent[]> {
    const startDate = this.getStartDate(timeframe);
    const endDate = this.getEndDate(timeframe);

    // Get team-related events
    const teamEvents = await db.select({
      id: events.id,
      title: events.title,
      description: events.description,
      startDate: events.startDate,
      endDate: events.endDate,
      location: events.location,
      sport: events.sport,
      organizerName: users.firstName
    })
    .from(events)
    .leftJoin(users, eq(events.organizerId, users.id))
    .where(and(
      // Could add team-specific filtering here
      gte(events.startDate, startDate),
      lte(events.startDate, endDate)
    ));

    return teamEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      startDate: event.startDate,
      endDate: event.endDate || undefined,
      location: event.location || '',
      organizer: event.organizerName || '',
      sport: event.sport || ''
    }));
  }

  // Generate iCal format data
  private generateICalData(events: CalendarEvent[]): string {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    let icalData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SURNA Sports Platform//NONSGML Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    events.forEach(event => {
      const startDate = this.formatDateForICal(event.startDate);
      const endDate = event.endDate ? this.formatDateForICal(event.endDate) : 
        this.formatDateForICal(new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000)); // Default 2 hour duration

      icalData.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@surna-platform.com`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `DTSTAMP:${now}`,
        `SUMMARY:${this.escapeICalText(event.title)}`,
        `DESCRIPTION:${this.escapeICalText(event.description || '')}`,
        `LOCATION:${this.escapeICalText(event.location || '')}`,
        `ORGANIZER:CN=${this.escapeICalText(event.organizer || 'SURNA Platform')}`,
        `CATEGORIES:${event.sport || 'Sports'}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT'
      );
    });

    icalData.push('END:VCALENDAR');
    return icalData.join('\r\n');
  }

  // Generate Google Calendar URL
  generateGoogleCalendarUrl(event: CalendarEvent): string {
    const startDate = this.formatDateForGoogle(event.startDate);
    const endDate = event.endDate ? 
      this.formatDateForGoogle(event.endDate) : 
      this.formatDateForGoogle(new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000));

    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${startDate}/${endDate}`,
      details: event.description || '',
      location: event.location || '',
      sf: 'true',
      output: 'xml'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  // Generate Outlook calendar URL
  generateOutlookCalendarUrl(event: CalendarEvent): string {
    const startDate = event.startDate.toISOString();
    const endDate = event.endDate ? 
      event.endDate.toISOString() : 
      new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
    const params = new URLSearchParams({
      subject: event.title,
      startdt: startDate,
      enddt: endDate,
      body: event.description || '',
      location: event.location || ''
    });

    return `${baseUrl}?${params.toString()}`;
  }

  // Create calendar webhook for external integration
  async createCalendarWebhook(userId: string, webhookUrl: string, events: string[] = ['event_created', 'event_updated', 'event_cancelled']) {
    // Store webhook configuration for user
    // This would typically be stored in a webhooks table
    return {
      webhookId: `webhook_${userId}_${Date.now()}`,
      userId,
      url: webhookUrl,
      events,
      active: true,
      createdAt: new Date()
    };
  }

  // Sync with external calendar systems
  async syncWithExternalCalendar(userId: string, calendarProvider: 'google' | 'outlook' | 'apple', accessToken: string) {
    // This would implement OAuth flow and calendar sync
    // For now, return configuration object
    return {
      syncId: `sync_${userId}_${calendarProvider}_${Date.now()}`,
      provider: calendarProvider,
      status: 'active',
      lastSync: new Date(),
      eventsSync: true,
      twoWaySync: false // For security, only push events to external calendar
    };
  }

  // Get upcoming events for notifications
  async getUpcomingEvents(userId: string, hours = 24): Promise<CalendarEvent[]> {
    const now = new Date();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const upcoming = await db.select({
      id: events.id,
      title: events.title,
      description: events.description,
      startDate: events.startDate,
      endDate: events.endDate,
      location: events.location,
      sport: events.sport
    })
    .from(eventParticipants)
    .innerJoin(events, eq(eventParticipants.eventId, events.id))
    .where(and(
      eq(eventParticipants.userId, userId),
      eq(eventParticipants.status, 'confirmed'),
      gte(events.startDate, now),
      lte(events.startDate, endTime)
    ));

    return upcoming.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      startDate: event.startDate,
      endDate: event.endDate || undefined,
      location: event.location || '',
      sport: event.sport || ''
    }));
  }

  // Helper methods
  private getStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '1m':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3m':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '6m':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }
  }

  private getEndDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '1m':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case '3m':
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      case '6m':
        return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    }
  }

  private formatDateForICal(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private formatDateForGoogle(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }
}

export const calendarService = new CalendarService();