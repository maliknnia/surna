/**
 * Legacy admin API paths still referenced by older admin UI components.
 * Canonical handlers live under /dashboard/* and /content/* on adminRouter.
 */
import { Router } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  users,
  posts,
  teams,
  events,
  wallets,
  postComments,
  productSellers,
} from "@shared/schema";
import { ModerationService } from "../services/moderationService";
import { AdminService } from "../services/adminService";
import type { AdminRequest } from "./admin.middleware";
import { ensureAdminDashboardSchema } from "./ensureAdminDashboardSchema";

export const adminLegacyRouter = Router();

adminLegacyRouter.get("/stats", async (_req: AdminRequest, res) => {
  try {
    await ensureAdminDashboardSchema();

    const stats = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM ${users}) as total_users,
        (SELECT COUNT(*) FROM ${users} WHERE banned = true) as banned_users,
        (SELECT COALESCE(SUM(balance), 0) FROM ${wallets}) as total_wallet_balance,
        (SELECT COUNT(*) FROM ${wallets} WHERE balance > 0) as active_wallets
    `);

    const queueCounts = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM ${posts} WHERE flagged = true AND removed = false) as flagged_posts,
        (SELECT COUNT(*) FROM ${teams} WHERE verified = false) as pending_teams,
        (SELECT COUNT(*) FROM ${events} WHERE approved = false) as pending_events,
        (SELECT COUNT(*) FROM ${productSellers} WHERE is_verified = false) as pending_shops
    `);

    const s = stats.rows[0] as Record<string, unknown>;
    const q = queueCounts.rows[0] as Record<string, unknown>;
    const walletBalance = Number(s.total_wallet_balance ?? 0);

    res.json({
      totalUsers: Number(s.total_users ?? 0),
      bannedUsers: Number(s.banned_users ?? 0),
      flaggedPosts: Number(q.flagged_posts ?? 0),
      pendingTeams: Number(q.pending_teams ?? 0),
      pendingEvents: Number(q.pending_events ?? 0),
      pendingShops: Number(q.pending_shops ?? 0),
      totalRevenue: `€${walletBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      activeWallets: Number(s.active_wallets ?? 0),
    });
  } catch (error) {
    console.error("Legacy admin stats error:", error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
});

adminLegacyRouter.get("/queues", async (_req: AdminRequest, res) => {
  try {
    await ensureAdminDashboardSchema();

    const queueCounts = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM ${posts} WHERE flagged = true AND removed = false) as flagged_posts,
        (SELECT COUNT(*) FROM ${postComments} WHERE flagged = true) as flagged_comments,
        (SELECT COUNT(*) FROM ${teams} WHERE verified = false) as pending_teams,
        (SELECT COUNT(*) FROM ${events} WHERE approved = false) as pending_events,
        (SELECT COUNT(*) FROM ${productSellers} WHERE is_verified = false) as pending_shops
    `);

    const q = queueCounts.rows[0] as Record<string, unknown>;
    const now = new Date().toISOString();
    const queues: Array<{
      id: string;
      type: string;
      title: string;
      priority: string;
      createdAt: string;
    }> = [];

    const pushQueue = (key: string, type: string, title: string, count: unknown, priority: string) => {
      const n = Number(count ?? 0);
      if (n > 0) {
        queues.push({ id: key, type, title: `${title} (${n})`, priority, createdAt: now });
      }
    };

    pushQueue("flagged-posts", "content", "Flagged posts", q.flagged_posts, "high");
    pushQueue("flagged-comments", "content", "Flagged comments", q.flagged_comments, "medium");
    pushQueue("pending-teams", "team", "Teams awaiting verification", q.pending_teams, "medium");
    pushQueue("pending-events", "event", "Events awaiting approval", q.pending_events, "medium");
    pushQueue("pending-shops", "shop", "Shops awaiting verification", q.pending_shops, "low");

    res.json({ queues });
  } catch (error) {
    console.error("Legacy admin queues error:", error);
    res.status(500).json({ message: "Failed to fetch moderation queue" });
  }
});

adminLegacyRouter.get("/flagged-content", async (_req: AdminRequest, res) => {
  try {
    const items = await ModerationService.getFlaggedContent();
    res.json(items);
  } catch (error) {
    console.error("Legacy flagged content error:", error);
    res.status(500).json({ message: "Failed to fetch flagged content" });
  }
});

adminLegacyRouter.get("/alerts", async (req: AdminRequest, res) => {
  try {
    const { isRead } = req.query;
    const alerts = await ModerationService.getAdminAlerts(
      isRead !== undefined ? isRead === "true" : undefined,
    );
    res.json(alerts);
  } catch (error) {
    console.error("Legacy admin alerts error:", error);
    res.status(500).json({ message: "Failed to fetch admin alerts" });
  }
});

adminLegacyRouter.get("/reports", async (req: AdminRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }
    const report = await AdminService.generateReport(
      new Date(startDate as string),
      new Date(endDate as string),
    );
    res.json(report);
  } catch (error) {
    console.error("Legacy admin reports error:", error);
    res.status(500).json({ message: "Failed to generate report" });
  }
});

const flagContentSchema = z.object({
  contentType: z.string().min(1),
  contentId: z.string().min(1),
  reportedUserId: z.string().optional(),
  reason: z.string().min(1),
  description: z.string().optional(),
});

adminLegacyRouter.post("/flag-content", async (req: AdminRequest, res) => {
  try {
    const reporterId = req.admin!.id;
    const flagData = flagContentSchema.parse(req.body);
    const flagged = await ModerationService.flagContent(reporterId, {
      contentType: flagData.contentType,
      contentId: flagData.contentId,
      reportedUserId: flagData.reportedUserId,
      reason: flagData.reason,
      description: flagData.description,
    });
    res.json(flagged);
  } catch (error) {
    console.error("Legacy flag content error:", error);
    res.status(500).json({ message: "Failed to flag content" });
  }
});

adminLegacyRouter.post("/review-content", async (req: AdminRequest, res) => {
  try {
    const reviewerId = req.admin!.id;
    const { flaggedContentId, actionTaken, reviewNotes, userId } = req.body;
    const result = await ModerationService.reviewContent(reviewerId, {
      flaggedContentId,
      actionTaken,
      reviewNotes,
      userId,
    });
    res.json(result);
  } catch (error) {
    console.error("Legacy review content error:", error);
    res.status(500).json({ message: "Failed to review content" });
  }
});

const userActionSchema = z.object({
  actionType: z.string().min(1),
  reason: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
});

adminLegacyRouter.post("/users/:userId/actions", async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.admin!.id;
    const actionData = userActionSchema.parse(req.body);
    await ModerationService.performUserAction(
      userId,
      actionData.actionType,
      adminId,
      actionData.reason ?? "",
      actionData.expiresAt,
    );
    res.json({ success: true, message: "User action performed successfully" });
  } catch (error) {
    console.error("Legacy user action error:", error);
    res.status(500).json({ message: "Failed to perform user action" });
  }
});
