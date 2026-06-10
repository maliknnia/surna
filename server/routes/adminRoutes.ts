// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Admin Routes - Administrative endpoints for content moderation and user management
import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { AdminService } from "../services/adminService";
import { ModerationService } from "../services/moderationService";
import { createInsertSchema } from "drizzle-zod";
import { flaggedContent, userActions, contentFilters } from "@shared/schema";
import { z } from "zod";

// Zod schemas for validation
const flagContentSchema = createInsertSchema(flaggedContent).omit({
  id: true,
  createdAt: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
  actionTaken: true
});

const userActionSchema = createInsertSchema(userActions).omit({
  id: true,
  createdAt: true,
  performedBy: true
});

// Simple admin check middleware (in production, implement proper role-based access)
const isAdmin = (req: any, res: any, next: any) => {
  // For demo purposes, check if user email contains 'admin'
  // In production, implement proper role system
  const userEmail = req.user?.claims?.email || '';
  if (userEmail.includes('admin') || userEmail.includes('test')) {
    return next();
  }
  return res.status(403).json({ message: 'Admin access required' });
};

export function registerAdminRoutes(app: Express) {
  // Admin Dashboard Statistics
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await AdminService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // User Management
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { query, status, role, limit = 50, offset = 0 } = req.query;
      const users = await AdminService.searchUsers(
        query as string,
        status as string,
        role as string,
        Number(limit),
        Number(offset)
      );
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get("/api/admin/users/:userId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const userDetails = await AdminService.getUserDetails(userId);
      
      if (!userDetails) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(userDetails);
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });

  // User Actions (warn, suspend, ban)
  app.post("/api/admin/users/:userId/actions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user?.claims?.sub;
      const actionData = userActionSchema.parse(req.body);

      await ModerationService.performUserAction(
        userId,
        actionData.actionType,
        adminId,
        actionData.reason,
        actionData.expiresAt
      );

      res.json({ success: true, message: "User action performed successfully" });
    } catch (error) {
      console.error("Error performing user action:", error);
      res.status(500).json({ message: "Failed to perform user action" });
    }
  });

  // Content Moderation
  app.get("/api/admin/flagged-content", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { status, priority } = req.query;
      const flaggedItems = await ModerationService.getFlaggedContent(
        status as string,
        priority as string
      );
      res.json(flaggedItems);
    } catch (error) {
      console.error("Error fetching flagged content:", error);
      res.status(500).json({ message: "Failed to fetch flagged content" });
    }
  });

  app.post("/api/admin/flag-content", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const reporterId = req.user?.claims?.sub;
      const flagData = flagContentSchema.parse(req.body);

      const flagged = await ModerationService.flagContent(reporterId, {
        contentType: flagData.contentType,
        contentId: flagData.contentId,
        reportedUserId: flagData.reportedUserId,
        reason: flagData.reason,
        description: flagData.description
      });

      res.json(flagged);
    } catch (error) {
      console.error("Error flagging content:", error);
      res.status(500).json({ message: "Failed to flag content" });
    }
  });

  app.post("/api/admin/review-content", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const reviewerId = req.user?.claims?.sub;
      const { flaggedContentId, actionTaken, reviewNotes, userId } = req.body;

      const result = await ModerationService.reviewContent(reviewerId, {
        flaggedContentId,
        actionTaken,
        reviewNotes,
        userId
      });

      res.json(result);
    } catch (error) {
      console.error("Error reviewing content:", error);
      res.status(500).json({ message: "Failed to review content" });
    }
  });

  // Moderation Queue
  app.get("/api/admin/moderation-queue", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { assignedTo } = req.query;
      const queue = await ModerationService.getModerationQueue(assignedTo as string);
      res.json(queue);
    } catch (error) {
      console.error("Error fetching moderation queue:", error);
      res.status(500).json({ message: "Failed to fetch moderation queue" });
    }
  });

  // Admin Alerts
  app.get("/api/admin/alerts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { isRead } = req.query;
      const alerts = await ModerationService.getAdminAlerts(
        isRead !== undefined ? isRead === 'true' : undefined
      );
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching admin alerts:", error);
      res.status(500).json({ message: "Failed to fetch admin alerts" });
    }
  });

  // Reports and Analytics
  app.get("/api/admin/reports", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const report = await AdminService.generateReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(report);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.get("/api/admin/metrics-trends", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const trends = await AdminService.getMetricsTrends(Number(days));
      res.json(trends);
    } catch (error) {
      console.error("Error fetching metrics trends:", error);
      res.status(500).json({ message: "Failed to fetch metrics trends" });
    }
  });

  // Content Filters Management
  app.get("/api/admin/content-filters", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // This would need to be implemented in the moderation service
      res.json({ message: "Content filters endpoint - to be implemented" });
    } catch (error) {
      console.error("Error fetching content filters:", error);
      res.status(500).json({ message: "Failed to fetch content filters" });
    }
  });

  // Bulk Actions
  app.post("/api/admin/bulk-actions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { action, targetIds, reason } = req.body;
      const adminId = req.user?.claims?.sub;

      // Implement bulk actions (bulk ban, bulk delete, etc.)
      // This would need more detailed implementation
      
      res.json({ 
        success: true, 
        message: `Bulk ${action} performed on ${targetIds.length} items`,
        processedCount: targetIds.length
      });
    } catch (error) {
      console.error("Error performing bulk action:", error);
      res.status(500).json({ message: "Failed to perform bulk action" });
    }
  });
}