// Stage 5: Analytics Service for Event Logging and Metrics
import { db } from '../db';
import { analyticsEvents, dailyMetrics, userSessions, popularContent, users, posts, events, teams } from '@shared/schema';
import { eq, desc, count, sum, avg, gte, lte, sql, and, type SQL } from 'drizzle-orm';

export interface AnalyticsEvent {
  userId?: string;
  sessionId?: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
}

export interface MetricsFilter {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  entityType?: string;
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionLength: number;
  totalSessions: number;
  bounceRate: number;
}

export interface ContentMetrics {
  topPosts: Array<{ id: string; title: string; score: number; likes: number; comments: number }>;
  topEvents: Array<{ id: string; name: string; score: number; participants: number }>;
  topTeams: Array<{ id: string; name: string; score: number; members: number }>;
}

// Event logging functions
export async function logEvent(event: AnalyticsEvent): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({
      userId: event.userId,
      sessionId: event.sessionId,
      eventType: event.eventType,
      eventName: event.entityType || event.eventType,
      eventData: event.payload,
      userAgent: event.userAgent,
      ipAddress: event.ipAddress,
      entityType: event.entityType,
      entityId: event.entityId,
    });

    console.log(`ðŸ“Š Analytics event logged: ${event.eventType} by ${event.userId || 'anonymous'}`);
  } catch (error) {
    console.error('Failed to log analytics event:', error);
  }
}

// Batch event logging for high-volume scenarios
export async function logEventsBatch(events: AnalyticsEvent[]): Promise<void> {
  try {
    const eventData = events.map(event => ({
      userId: event.userId,
      sessionId: event.sessionId,
      eventType: event.eventType,
      eventName: event.entityType || event.eventType,
      eventData: event.payload,
      userAgent: event.userAgent,
      ipAddress: event.ipAddress,
      entityType: event.entityType,
      entityId: event.entityId,
    }));

    await db.insert(analyticsEvents).values(eventData);
    console.log(`ðŸ“Š Batch logged ${events.length} analytics events`);
  } catch (error) {
    console.error('Failed to batch log analytics events:', error);
  }
}

// Session tracking
export async function startUserSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
  try {
    const [session] = await db.insert(userSessions).values({
      userId,
      userAgent,
      ipAddress,
    }).returning();

    await logEvent({
      userId,
      sessionId: session.id,
      eventType: 'session_start',
      userAgent,
      ipAddress,
    });

    return session.id;
  } catch (error) {
    console.error('Failed to start user session:', error);
    return `session_${Date.now()}_${userId}`;
  }
}

export async function endUserSession(sessionId: string, pageViews: number = 0, actions: number = 0): Promise<void> {
  try {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, sessionId));

    if (session && session.startTime) {
      const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
      
      await db
        .update(userSessions)
        .set({
          endTime: new Date(),
          duration,
          pageViews,
          actions,
        })
        .where(eq(userSessions.id, sessionId));

      await logEvent({
        userId: session.userId ?? undefined,
        sessionId,
        eventType: 'session_end',
        payload: { duration, pageViews, actions },
      });
    }
  } catch (error) {
    console.error('Failed to end user session:', error);
  }
}

// Metrics calculation functions
export async function calculateDailyMetrics(date: Date = new Date()): Promise<void> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Calculate daily active users
    const [dauResult] = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(
        and(
          gte(analyticsEvents.createdAt, startOfDay),
          lte(analyticsEvents.createdAt, endOfDay),
          eq(analyticsEvents.eventType, 'session_start')
        )
      );

    // Calculate new users
    const [newUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          gte(users.createdAt, startOfDay),
          lte(users.createdAt, endOfDay)
        )
      );

    // Calculate total posts created
    const [postsResult] = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(
        and(
          gte(analyticsEvents.createdAt, startOfDay),
          lte(analyticsEvents.createdAt, endOfDay),
          eq(analyticsEvents.eventType, 'post_create')
        )
      );

    // Calculate total likes
    const [likesResult] = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(
        and(
          gte(analyticsEvents.createdAt, startOfDay),
          lte(analyticsEvents.createdAt, endOfDay),
          eq(analyticsEvents.eventType, 'post_like')
        )
      );

    // Calculate total comments
    const [commentsResult] = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(
        and(
          gte(analyticsEvents.createdAt, startOfDay),
          lte(analyticsEvents.createdAt, endOfDay),
          eq(analyticsEvents.eventType, 'comment_create')
        )
      );

    // Calculate average session length
    const [sessionLengthResult] = await db
      .select({ avg: avg(userSessions.duration) })
      .from(userSessions)
      .where(
        and(
          gte(userSessions.startTime, startOfDay),
          lte(userSessions.startTime, endOfDay)
        )
      );

    // Insert daily metrics
    await db.insert(dailyMetrics).values({
      date: startOfDay,
      activeUsers: dauResult.count,
      newUsers: newUsersResult.count,
      postsCreated: postsResult.count,
      totalLikes: likesResult.count,
      totalComments: commentsResult.count,
      avgSessionLength: Math.floor(Number(sessionLengthResult.avg) || 0),
    });

    console.log(`ðŸ“ˆ Daily metrics calculated for ${startOfDay.toDateString()}`);
  } catch (error) {
    console.error('Failed to calculate daily metrics:', error);
  }
}

// Engagement metrics
export async function getEngagementMetrics(filter: MetricsFilter = {}): Promise<EngagementMetrics> {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Daily Active Users
    const [dauResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})` })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, oneDayAgo));

    // Weekly Active Users
    const [wauResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})` })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, oneWeekAgo));

    // Monthly Active Users
    const [mauResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})` })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, oneMonthAgo));

    // Average session length
    const [avgSessionResult] = await db
      .select({ avg: avg(userSessions.duration) })
      .from(userSessions)
      .where(gte(userSessions.startTime, oneMonthAgo));

    // Total sessions
    const [totalSessionsResult] = await db
      .select({ count: count() })
      .from(userSessions)
      .where(gte(userSessions.startTime, oneMonthAgo));

    // Bounce rate (sessions with <= 1 page view)
    const [bounceSessionsResult] = await db
      .select({ count: count() })
      .from(userSessions)
      .where(
        and(
          gte(userSessions.startTime, oneMonthAgo),
          lte(userSessions.pageViews, 1)
        )
      );

    const bounceRate = totalSessionsResult.count > 0 ? 
      (bounceSessionsResult.count / totalSessionsResult.count) * 100 : 0;

    return {
      dailyActiveUsers: dauResult.count,
      weeklyActiveUsers: wauResult.count,
      monthlyActiveUsers: mauResult.count,
      avgSessionLength: Math.floor(Number(avgSessionResult.avg) || 0),
      totalSessions: totalSessionsResult.count,
      bounceRate: Math.round(bounceRate * 100) / 100,
    };
  } catch (error) {
    console.error('Failed to get engagement metrics:', error);
    return {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0,
      avgSessionLength: 0,
      totalSessions: 0,
      bounceRate: 0,
    };
  }
}

// Content performance metrics
export async function getContentMetrics(): Promise<ContentMetrics> {
  try {
    // Get top posts by engagement
    const topPosts = await db
      .select({
        id: popularContent.contentId,
        score: popularContent.engagementScore,
        likes: popularContent.likeCount,
        comments: popularContent.commentCount,
      })
      .from(popularContent)
      .where(eq(popularContent.contentType, 'post'))
      .orderBy(desc(popularContent.engagementScore))
      .limit(10);

    // Get top events by participation
    const topEvents = await db
      .select({
        id: popularContent.contentId,
        score: popularContent.engagementScore,
        participants: popularContent.viewCount,
      })
      .from(popularContent)
      .where(eq(popularContent.contentType, 'event'))
      .orderBy(desc(popularContent.engagementScore))
      .limit(10);

    // Get top teams by activity
    const topTeams = await db
      .select({
        id: popularContent.contentId,
        score: popularContent.engagementScore,
        members: popularContent.viewCount,
      })
      .from(popularContent)
      .where(eq(popularContent.contentType, 'team'))
      .orderBy(desc(popularContent.engagementScore))
      .limit(10);

    const num = (v: string | null | undefined) => Number(v ?? 0);

    return {
      topPosts: topPosts.map(p => ({
        id: p.id,
        title: `Post ${p.id}`,
        score: num(p.score as string | null),
        likes: p.likes ?? 0,
        comments: p.comments ?? 0,
      })),
      topEvents: topEvents.map(e => ({
        id: e.id,
        name: `Event ${e.id}`,
        score: num(e.score as string | null),
        participants: e.participants ?? 0,
      })),
      topTeams: topTeams.map(t => ({
        id: t.id,
        name: `Team ${t.id}`,
        score: num(t.score as string | null),
        members: t.members ?? 0,
      })),
    };
  } catch (error) {
    console.error('Failed to get content metrics:', error);
    return {
      topPosts: [],
      topEvents: [],
      topTeams: [],
    };
  }
}

// Update popular content rankings
export async function updatePopularContent(): Promise<void> {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calculate daily rankings
    await calculateContentRankings('daily', oneDayAgo, now);
    
    // Calculate weekly rankings
    await calculateContentRankings('weekly', oneWeekAgo, now);

    console.log('ðŸ“Š Popular content rankings updated');
  } catch (error) {
    console.error('Failed to update popular content:', error);
  }
}

async function calculateContentRankings(timeframe: string, startDate: Date, endDate: Date): Promise<void> {
  // Calculate post rankings
  const postMetrics = await db
    .select({
      contentId: analyticsEvents.entityId,
      likes: sql<number>`COUNT(CASE WHEN ${analyticsEvents.eventType} = 'post_like' THEN 1 END)`,
      comments: sql<number>`COUNT(CASE WHEN ${analyticsEvents.eventType} = 'comment_create' THEN 1 END)`,
      views: sql<number>`COUNT(CASE WHEN ${analyticsEvents.eventType} = 'post_view' THEN 1 END)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.entityType, 'post'),
        gte(analyticsEvents.createdAt, startDate),
        lte(analyticsEvents.createdAt, endDate)
      )
    )
    .groupBy(analyticsEvents.entityId);

  // Insert/update post rankings
  for (const metric of postMetrics) {
    if (metric.contentId) {
      const score = (metric.likes * 3) + (metric.comments * 5) + metric.views;
      
      await db.insert(popularContent).values({
        contentType: 'post',
        contentId: metric.contentId,
        engagementScore: String(score),
        likeCount: metric.likes,
        commentCount: metric.comments,
        viewCount: metric.views,
        timeframe,
        date: startDate,
      }).onConflictDoUpdate({
        target: [popularContent.contentType, popularContent.contentId, popularContent.timeframe],
        set: {
          engagementScore: String(score),
          likeCount: metric.likes,
          commentCount: metric.comments,
          viewCount: metric.views,
          updatedAt: new Date(),
          date: startDate,
        },
      });
    }
  }
}

// Get analytics events with filtering
export async function getAnalyticsEvents(filter: MetricsFilter = {}, limit: number = 100): Promise<any[]> {
  try {
    const conditions: SQL[] = [];
    if (filter.startDate) {
      conditions.push(gte(analyticsEvents.createdAt, filter.startDate));
    }
    if (filter.endDate) {
      conditions.push(lte(analyticsEvents.createdAt, filter.endDate));
    }
    if (filter.eventType) {
      conditions.push(eq(analyticsEvents.eventType, filter.eventType));
    }

    const base = db.select().from(analyticsEvents);
    const filtered =
      conditions.length > 0 ? base.where(and(...conditions)) : base;

    return await filtered
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get analytics events:', error);
    return [];
  }
}

// Interactive User Activity Heatmap Data
export async function getActivityHeatmapData(timeframe: string, activityType: string): Promise<any[]> {
  try {
    let days = 7;
    switch (timeframe) {
      case '7d':
        days = 7;
        break;
      case '30d':
        days = 30;
        break;
      case '90d':
        days = 90;
        break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Create a complete grid of hours (0-23) and days
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    const heatmapData: Array<{
      hour: number;
      day: string;
      value: number;
      activities: {
        posts: number;
        likes: number;
        comments: number;
        logins: number;
        events: number;
      };
    }> = [];

    // For each day and hour combination
    for (const day of daysOfWeek) {
      for (const hour of hours) {
        // Query analytics events for this specific day of week and hour
        let whereClause = sql`
          EXTRACT(DOW FROM ${analyticsEvents.createdAt}) = ${daysOfWeek.indexOf(day)} 
          AND EXTRACT(HOUR FROM ${analyticsEvents.createdAt}) = ${hour}
          AND ${analyticsEvents.createdAt} >= ${startDate}
        `;

        // Base query for all activities
        const baseQuery = db
          .select({
            posts: sql<number>`COUNT(CASE WHEN ${analyticsEvents.eventType} = 'post_create' THEN 1 END)`,
            likes: sql<number>`COUNT(CASE WHEN ${analyticsEvents.eventType} = 'post_like' THEN 1 END)`,
            comments: sql<number>`COUNT(CASE WHEN ${analyticsEvents.eventType} = 'comment_create' THEN 1 END)`,
            logins: sql<number>`COUNT(CASE WHEN ${analyticsEvents.eventType} = 'login' THEN 1 END)`,
            events: sql<number>`COUNT(CASE WHEN ${analyticsEvents.eventType} = 'event_join' THEN 1 END)`,
            total: sql<number>`COUNT(*)`,
          })
          .from(analyticsEvents)
          .where(whereClause);

        try {
          const [result] = await baseQuery;
          
          let value = 0;
          const activities = {
            posts: result?.posts || 0,
            likes: result?.likes || 0,
            comments: result?.comments || 0,
            logins: result?.logins || 0,
            events: result?.events || 0,
          };

          // Calculate value based on activity type filter
          switch (activityType) {
            case 'posts':
              value = activities.posts;
              break;
            case 'likes':
              value = activities.likes;
              break;
            case 'comments':
              value = activities.comments;
              break;
            case 'logins':
              value = activities.logins;
              break;
            case 'events':
              value = activities.events;
              break;
            case 'all':
            default:
              value = activities.posts + activities.likes + activities.comments + activities.logins + activities.events;
              break;
          }

          heatmapData.push({
            hour,
            day,
            value,
            activities,
          });
        } catch (error) {
          // If analytics_events table doesn't exist yet, add empty data
          heatmapData.push({
            hour,
            day,
            value: 0,
            activities: {
              posts: 0,
              likes: 0,
              comments: 0,
              logins: 0,
              events: 0,
            },
          });
        }
      }
    }

    return heatmapData;
  } catch (error) {
    console.error('Failed to get activity heatmap data:', error);
    
    // Return empty heatmap grid if there's an error
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const emptyData: Array<{
      hour: number;
      day: string;
      value: number;
      activities: {
        posts: number;
        likes: number;
        comments: number;
        logins: number;
        events: number;
      };
    }> = [];

    for (const day of daysOfWeek) {
      for (const hour of hours) {
        emptyData.push({
          hour,
          day,
          value: 0,
          activities: {
            posts: 0,
            likes: 0,
            comments: 0,
            logins: 0,
            events: 0,
          },
        });
      }
    }

    return emptyData;
  }
}

// Real-time metrics
export async function getRealTimeMetrics(): Promise<any> {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [activeUsersResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})` })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, oneHourAgo));

    const [recentEventsResult] = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, oneHourAgo));

    return {
      activeUsers: activeUsersResult.count,
      recentEvents: recentEventsResult.count,
      timestamp: now,
    };
  } catch (error) {
    console.error('Failed to get real-time metrics:', error);
    return { activeUsers: 0, recentEvents: 0, timestamp: new Date() };
  }
}

// Get daily metrics for charts
export async function getDailyMetrics(timeframe: string): Promise<any[]> {
  try {
    let days = 30;
    switch (timeframe) {
      case '7d':
        days = 7;
        break;
      case '30d':
        days = 30;
        break;
      case '90d':
        days = 90;
        break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await db
      .select()
      .from(dailyMetrics)
      .where(gte(dailyMetrics.date, startDate))
      .orderBy(dailyMetrics.date);

    return metrics.map(metric => ({
      date: metric.date.toISOString().split('T')[0],
      dailyActiveUsers: metric.activeUsers ?? 0,
      newUsers: metric.newUsers ?? 0,
      totalPosts: metric.postsCreated ?? 0,
      totalLikes: metric.totalLikes ?? 0,
      totalComments: metric.totalComments ?? 0,
      avgSessionLength: metric.avgSessionLength ?? 0,
    }));
  } catch (error) {
    console.error('Failed to get daily metrics:', error);
    return [];
  }
}
