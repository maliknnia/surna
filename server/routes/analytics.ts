// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import type { Express } from "express";
import { db } from "../db";
import { 
  analyticsEvents, 
  userSessions, 
  dailyMetrics,
  popularContent,
  users,
  posts,
  events,
  teamMembers
} from "@shared/schema";
import { eq, sql, desc, and, gte, lte, count, avg, sum } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { z } from "zod";

export function registerAnalyticsRoutes(app: Express) {
  // Dashboard metrics endpoint
  app.get("/api/analytics/dashboard-metrics", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, sport, region } = req.query;
      
      const start = startDate ? new Date(startDate as string) : startOfDay(subDays(new Date(), 30));
      const end = endDate ? new Date(endDate as string) : endOfDay(new Date());

      // Build filters
      let userFilters = [];
      let eventFilters = [
        gte(analyticsEvents.createdAt, start),
        lte(analyticsEvents.createdAt, end)
      ];

      if (sport && sport !== "all") {
        userFilters.push(sql`${users.sportsPreferences} @> ARRAY[${sport}]`);
      }

      // Get total users
      const totalUsersQuery = db.select({ count: count() }).from(users);
      if (userFilters.length > 0) {
        totalUsersQuery.where(and(...userFilters));
      }
      const [{ count: totalUsers }] = await totalUsersQuery;

      // Get active users (last 30 days)
      const activeUsersQuery = db
        .select({ count: count() })
        .from(analyticsEvents)
        .innerJoin(users, eq(analyticsEvents.userId, users.id))
        .where(and(
          gte(analyticsEvents.createdAt, subDays(new Date(), 30)),
          ...userFilters
        ));
      const [{ count: activeUsers }] = await activeUsersQuery;

      // Get new users in period
      const newUsersQuery = db
        .select({ count: count() })
        .from(users)
        .where(and(
          gte(users.createdAt, start),
          lte(users.createdAt, end),
          ...userFilters
        ));
      const [{ count: newUsers }] = await newUsersQuery;

      // Get session metrics
      const sessionMetricsQuery = db
        .select({
          totalSessions: count(),
          avgDuration: avg(userSessions.duration)
        })
        .from(userSessions)
        .innerJoin(users, eq(userSessions.userId, users.id))
        .where(and(
          gte(userSessions.sessionStart, start),
          lte(userSessions.sessionStart, end),
          ...userFilters
        ));
      const [sessionMetrics] = await sessionMetricsQuery;

      // Get page views
      const pageViewsQuery = db
        .select({ count: count() })
        .from(analyticsEvents)
        .innerJoin(users, eq(analyticsEvents.userId, users.id))
        .where(and(
          eq(analyticsEvents.eventType, "page_view"),
          ...eventFilters,
          ...userFilters
        ));
      const [{ count: totalPageViews }] = await pageViewsQuery;

      // Get posts count
      const postsQuery = db
        .select({ count: count() })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(and(
          gte(posts.createdAt, start),
          lte(posts.createdAt, end),
          ...userFilters
        ));
      const [{ count: totalPosts }] = await postsQuery;

      // Get events count  
      const eventsQuery = db
        .select({ count: count() })
        .from(events)
        .innerJoin(users, eq(events.organizerId, users.id))
        .where(and(
          gte(events.createdAt, start),
          lte(events.createdAt, end),
          ...userFilters
        ));
      const [{ count: totalEvents }] = await eventsQuery;

      // Get team joins
      const teamJoinsQuery = db
        .select({ count: count() })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(and(
          gte(teamMembers.joinedAt, start),
          lte(teamMembers.joinedAt, end),
          ...userFilters
        ));
      const [{ count: totalTeamJoins }] = await teamJoinsQuery;

      // Calculate metrics
      const metrics = {
        totalUsers,
        activeUsers,
        newUsers,
        totalSessions: sessionMetrics?.totalSessions || 0,
        avgSessionDuration: sessionMetrics?.avgDuration || 0,
        totalPageViews,
        totalPosts,
        totalEvents,
        totalTeamJoins,
        totalRevenue: 0, // Placeholder - would come from payment data
        bounceRate: 0, // Placeholder - would be calculated from session data
        conversionRate: totalUsers > 0 ? (activeUsers / totalUsers * 100) : 0,
        retentionRate: totalUsers > 0 ? (activeUsers / totalUsers * 100) : 0,
      };

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Time series data endpoint
  app.get("/api/analytics/time-series", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, sport, region } = req.query;
      
      const start = startDate ? new Date(startDate as string) : startOfDay(subDays(new Date(), 30));
      const end = endDate ? new Date(endDate as string) : endOfDay(new Date());

      // Generate date range
      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(format(new Date(d), "yyyy-MM-dd"));
      }

      // Get daily metrics from database
      const dailyData = await db
        .select()
        .from(dailyMetrics)
        .where(and(
          gte(dailyMetrics.date, start),
          lte(dailyMetrics.date, end)
        ))
        .orderBy(dailyMetrics.date);

      // Format data for charts
      const userActivity = dates.map(date => {
        const dayData = dailyData.find(d => format(d.date, "yyyy-MM-dd") === date);
        return {
          date,
          activeUsers: dayData?.activeUsers || 0,
          newUsers: dayData?.newUsers || 0
        };
      });

      const userGrowth = dates.map(date => {
        const dayData = dailyData.find(d => format(d.date, "yyyy-MM-dd") === date);
        return {
          date,
          totalUsers: dayData?.newUsers || 0,
          activeUsers: dayData?.activeUsers || 0
        };
      });

      const contentEngagement = dates.map(date => {
        const dayData = dailyData.find(d => format(d.date, "yyyy-MM-dd") === date);
        return {
          date,
          posts: dayData?.postsCreated || 0,
          events: 0,
          interactions: (dayData?.totalLikes ?? 0) + (dayData?.totalComments ?? 0)
        };
      });

      // Sample demographics data
      const demographics = [
        { sport: "Soccer", users: 1250 },
        { sport: "Basketball", users: 890 },
        { sport: "Tennis", users: 670 },
        { sport: "Running", users: 1430 },
        { sport: "Swimming", users: 540 }
      ];

      // Sample content performance data
      const contentPerformance = [
        { type: "Posts", engagementRate: 4.2 },
        { type: "Events", engagementRate: 6.8 },
        { type: "Teams", engagementRate: 3.1 },
        { type: "Stories", engagementRate: 7.5 }
      ];

      res.json({
        userActivity,
        userGrowth,
        contentEngagement,
        demographics,
        contentPerformance
      });
    } catch (error) {
      console.error("Error fetching time series data:", error);
      res.status(500).json({ error: "Failed to fetch time series data" });
    }
  });

  // Event types distribution endpoint
  app.get("/api/analytics/event-types", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : startOfDay(subDays(new Date(), 30));
      const end = endDate ? new Date(endDate as string) : endOfDay(new Date());

      const eventTypesData = await db
        .select({
          eventType: analyticsEvents.eventType,
          count: count()
        })
        .from(analyticsEvents)
        .where(and(
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ))
        .groupBy(analyticsEvents.eventType)
        .orderBy(desc(count()));

      const total = eventTypesData.reduce((sum, item) => sum + item.count, 0);
      
      const eventTypes = eventTypesData.map(item => ({
        eventType: item.eventType,
        count: item.count,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
      }));

      res.json(eventTypes);
    } catch (error) {
      console.error("Error fetching event types:", error);
      res.status(500).json({ error: "Failed to fetch event types" });
    }
  });

  // Popular content endpoint
  app.get("/api/analytics/popular-content", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : startOfDay(subDays(new Date(), 30));
      const end = endDate ? new Date(endDate as string) : endOfDay(new Date());

      const popularContentData = await db
        .select()
        .from(popularContent)
        .where(and(
          gte(popularContent.periodStart, start),
          lte(popularContent.periodEnd, end),
          eq(popularContent.timeframe, "daily")
        ))
        .orderBy(desc(popularContent.score))
        .limit(10);

      // Transform data to include content details
      const contentDetails = await Promise.all(
        popularContentData.map(async (item) => {
          let title = "Unknown Content";
          
          if (item.contentType === "post") {
            const [post] = await db
              .select({ content: posts.content })
              .from(posts)
              .where(eq(posts.id, item.contentId))
              .limit(1);
            title = post?.content.substring(0, 50) + "..." || "Post";
          } else if (item.contentType === "event") {
            const [event] = await db
              .select({ title: events.title })
              .from(events)
              .where(eq(events.id, item.contentId))
              .limit(1);
            title = event?.title || "Event";
          }

          return {
            contentType: item.contentType,
            contentId: item.contentId,
            title,
            score: item.score,
            views: item.views,
            engagement: item.likes && item.views ? 
              Math.round((item.likes / item.views) * 100) : 0
          };
        })
      );

      res.json(contentDetails);
    } catch (error) {
      console.error("Error fetching popular content:", error);
      res.status(500).json({ error: "Failed to fetch popular content" });
    }
  });

  // User retention endpoint
  app.get("/api/analytics/retention", isAuthenticated, async (req, res) => {
    try {
      // Sample retention data - would be calculated from user cohorts
      const retentionData = {
        cohorts: [
          { period: "Day 1", retentionRate: 85 },
          { period: "Day 7", retentionRate: 65 },
          { period: "Day 14", retentionRate: 45 },
          { period: "Day 30", retentionRate: 25 },
          { period: "Day 60", retentionRate: 15 },
          { period: "Day 90", retentionRate: 12 }
        ]
      };

      res.json(retentionData);
    } catch (error) {
      console.error("Error fetching retention data:", error);
      res.status(500).json({ error: "Failed to fetch retention data" });
    }
  });

  // Export data endpoint
  app.post("/api/analytics/export", isAuthenticated, async (req, res) => {
    try {
      const { dateRange, sport, region, format } = req.body;
      
      const start = new Date(dateRange.from);
      const end = new Date(dateRange.to);

      // Fetch comprehensive analytics data
      const analyticsData = await db
        .select({
          date: analyticsEvents.createdAt,
          userId: analyticsEvents.userId,
          eventType: analyticsEvents.eventType,
          entityType: analyticsEvents.entityType,
          entityId: analyticsEvents.entityId
        })
        .from(analyticsEvents)
        .where(and(
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ))
        .orderBy(analyticsEvents.createdAt);

      if (format === "csv") {
        const csvHeader = "Date,User ID,Event Type,Entity Type,Entity ID\n";
        const csvData = analyticsData
          .map(row => `${row.date},${row.userId},${row.eventType},${row.entityType},${row.entityId}`)
          .join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=analytics-${format(new Date(), "yyyy-MM-dd")}.csv`);
        res.send(csvHeader + csvData);
      } else {
        res.json(analyticsData);
      }
    } catch (error) {
      console.error("Error exporting analytics data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Real-time metrics endpoint
  app.get("/api/analytics/real-time", isAuthenticated, async (req, res) => {
    try {
      // Get live users (active in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const [{ count: liveUsers }] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, fiveMinutesAgo));

      // Get recent events (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [{ count: recentEvents }] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, oneHourAgo));

      res.json({
        liveUsers,
        recentEvents,
        systemHealth: "operational"
      });
    } catch (error) {
      console.error("Error fetching real-time metrics:", error);
      res.status(500).json({ error: "Failed to fetch real-time metrics" });
    }
  });

  // Client-side tracking beacons (CSRF-exempt — see csrfMiddleware.ts)
  const pageViewSchema = z.object({
    page: z.string().min(1),
    title: z.string().optional(),
    userId: z.string().optional(),
    timestamp: z.string().optional(),
  });
  const eventSchema = z.object({
    event: z.string().min(1),
    category: z.string().min(1),
    label: z.string().optional(),
    value: z.number().optional(),
    properties: z.record(z.any()).optional(),
    userId: z.string().optional(),
    timestamp: z.string().optional(),
  });
  const batchEventsSchema = z.object({
    events: z.array(eventSchema).max(50),
  });

  app.post("/api/analytics/pageview", async (req, res) => {
    try {
      pageViewSchema.parse(req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking page view:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to track page view",
      });
    }
  });

  app.post("/api/analytics/event", async (req, res) => {
    try {
      eventSchema.parse(req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking event:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to track event",
      });
    }
  });

  app.post("/api/analytics/events/batch", async (req, res) => {
    try {
      const { events } = batchEventsSchema.parse(req.body);
      res.json({ success: true, processed: events.length });
    } catch (error) {
      console.error("Error tracking batch events:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to track batch events",
      });
    }
  });

  app.post("/api/analytics/conversion", async (req, res) => {
    try {
      z.object({
        conversionType: z.string().min(1),
        value: z.number().optional(),
        currency: z.string().optional().default("USD"),
        transactionId: z.string().optional(),
        userId: z.string().optional(),
        properties: z.record(z.any()).optional(),
      }).parse(req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking conversion:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to track conversion",
      });
    }
  });
}