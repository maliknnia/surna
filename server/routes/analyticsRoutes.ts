// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Analytics Routes - Event tracking and analytics API endpoints
import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";

// Validation schemas
const pageViewSchema = z.object({
  page: z.string().min(1),
  title: z.string().optional(),
  userId: z.string().optional(),
  timestamp: z.string().optional()
});

const eventSchema = z.object({
  event: z.string().min(1),
  category: z.string().min(1),
  label: z.string().optional(),
  value: z.number().optional(),
  properties: z.record(z.any()).optional(),
  userId: z.string().optional(),
  timestamp: z.string().optional()
});

const batchEventsSchema = z.object({
  events: z.array(eventSchema).max(50) // Limit batch size
});

export function registerAnalyticsRoutes(app: Express) {
  // Track page view
  app.post("/api/analytics/pageview", async (req, res) => {
    try {
      const data = pageViewSchema.parse(req.body);
      
      // Log page view
      console.log('📊 Page View:', {
        page: data.page,
        title: data.title,
        userId: data.userId || 'anonymous',
        timestamp: data.timestamp || new Date().toISOString()
      });

      // In a real implementation, store in analytics database
      // await AnalyticsService.trackPageView(data);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking page view:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to track page view" 
      });
    }
  });

  // Track custom event
  app.post("/api/analytics/event", async (req, res) => {
    try {
      const data = eventSchema.parse(req.body);
      
      // Log event
      console.log('📊 Event:', {
        event: data.event,
        category: data.category,
        label: data.label,
        value: data.value,
        properties: data.properties,
        userId: data.userId || 'anonymous',
        timestamp: data.timestamp || new Date().toISOString()
      });

      // In a real implementation, store in analytics database
      // await AnalyticsService.trackEvent(data);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking event:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to track event" 
      });
    }
  });

  // Track batch events
  app.post("/api/analytics/events/batch", async (req, res) => {
    try {
      const { events } = batchEventsSchema.parse(req.body);
      
      // Log batch events
      console.log(`📊 Batch Events (${events.length} events):`, events);

      // In a real implementation, store all events in analytics database
      // await AnalyticsService.trackBatchEvents(events);
      
      res.json({ 
        success: true, 
        processed: events.length 
      });
    } catch (error) {
      console.error("Error tracking batch events:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to track batch events" 
      });
    }
  });

  // Get analytics dashboard data (protected route)
  app.get("/api/analytics/dashboard", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // In a real implementation, query analytics database
      const dashboardData = {
        pageViews: {
          total: 12543,
          unique: 8921,
          growth: 12.5
        },
        events: {
          total: 45231,
          categories: {
            engagement: 25432,
            social: 8901,
            ecommerce: 3456,
            forms: 7442
          }
        },
        users: {
          total: 1234,
          active: 567,
          returning: 345
        },
        topPages: [
          { page: '/', views: 3421, title: 'Home' },
          { page: '/feed', views: 2987, title: 'Social Feed' },
          { page: '/events', views: 1876, title: 'Events' },
          { page: '/teams', views: 1543, title: 'Teams' },
          { page: '/shop', views: 1298, title: 'Shop' }
        ],
        timeRange: {
          start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: endDate || new Date().toISOString()
        }
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching analytics dashboard:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch analytics data" 
      });
    }
  });

  // Get user journey/funnel data (protected route)
  app.get("/api/analytics/funnel/:funnelName", isAuthenticated, async (req, res) => {
    try {
      const { funnelName } = req.params;
      const { startDate, endDate } = req.query;
      
      // Mock funnel data - in real implementation, query analytics database
      const funnelData = {
        funnel: funnelName,
        steps: [
          { step: 'landing', users: 1000, conversionRate: 100 },
          { step: 'signup', users: 650, conversionRate: 65 },
          { step: 'profile_setup', users: 520, conversionRate: 80 },
          { step: 'first_post', users: 390, conversionRate: 75 },
          { step: 'first_connection', users: 280, conversionRate: 72 }
        ],
        timeRange: {
          start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: endDate || new Date().toISOString()
        }
      };
      
      res.json(funnelData);
    } catch (error) {
      console.error("Error fetching funnel data:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch funnel data" 
      });
    }
  });

  // Get real-time analytics (protected route)
  app.get("/api/analytics/realtime", isAuthenticated, async (req, res) => {
    try {
      // Mock real-time data
      const realTimeData = {
        activeUsers: Math.floor(Math.random() * 200) + 50,
        pageViews: Math.floor(Math.random() * 100) + 20,
        events: Math.floor(Math.random() * 300) + 100,
        topPages: [
          { page: '/', activeUsers: 23 },
          { page: '/feed', activeUsers: 18 },
          { page: '/events', activeUsers: 12 },
          { page: '/teams', activeUsers: 8 },
          { page: '/shop', activeUsers: 5 }
        ],
        geography: [
          { country: 'United States', users: 45 },
          { country: 'Canada', users: 12 },
          { country: 'United Kingdom', users: 8 },
          { country: 'Germany', users: 6 },
          { country: 'France', users: 4 }
        ],
        timestamp: new Date().toISOString()
      };
      
      res.json(realTimeData);
    } catch (error) {
      console.error("Error fetching real-time analytics:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch real-time data" 
      });
    }
  });

  // Track conversion events
  app.post("/api/analytics/conversion", async (req, res) => {
    try {
      const schema = z.object({
        conversionType: z.string().min(1),
        value: z.number().optional(),
        currency: z.string().optional().default('USD'),
        transactionId: z.string().optional(),
        userId: z.string().optional(),
        properties: z.record(z.any()).optional()
      });

      const data = schema.parse(req.body);
      
      console.log('💰 Conversion Event:', {
        type: data.conversionType,
        value: data.value,
        currency: data.currency,
        transactionId: data.transactionId,
        userId: data.userId || 'anonymous',
        properties: data.properties,
        timestamp: new Date().toISOString()
      });

      // In a real implementation:
      // await AnalyticsService.trackConversion(data);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking conversion:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to track conversion" 
      });
    }
  });
}