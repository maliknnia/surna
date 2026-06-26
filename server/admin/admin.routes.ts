import { Router } from "express";
import { db } from "../db";
import {
  users,
  posts,
  teams,
  events,
  products,
  orders,
  wallets,
  adminAuditLogs,
  postComments,
  productSellers,
} from "@shared/schema";
import { eq, sql, desc, and, gte, lte, like, count, or, type SQL } from "drizzle-orm";
import { requireAdmin, requirePermission, getClientIp, getUserAgent, type AdminRequest } from "./admin.middleware";
import { AuditService } from "./audit.service";
import { z } from "zod";
import { adminContentRouter } from "./admin.content.routes";
import { adminEntitiesRouter } from "./admin.entities.routes";
import { adminMarketplaceRouter } from "./admin.marketplace.routes";
import { adminPaymentsRouter } from "./admin.payments.routes";
import { getHealthSnapshot } from "../monitoring/prometheusMetrics";
import { getBullMqMetrics } from "../worker/metrics";
import { ensureAdminDashboardSchema } from "./ensureAdminDashboardSchema";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

// Mount sub-routers
adminRouter.use("/content", adminContentRouter);
adminRouter.use("/entities", adminEntitiesRouter);
adminRouter.use("/marketplace", adminMarketplaceRouter);
adminRouter.use("/payments", adminPaymentsRouter);

// ============================================================================
// DASHBOARD - Overview stats and moderation queues
// ============================================================================
adminRouter.get("/dashboard/stats", async (req: AdminRequest, res) => {
  try {
    await ensureAdminDashboardSchema();

    const stats = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM ${users}) as total_users,
        (SELECT COUNT(*) FROM ${users} WHERE created_at >= NOW() - INTERVAL '30 days') as users_30d,
        (SELECT COUNT(*) FROM ${posts}) as total_posts,
        (SELECT COUNT(*) FROM ${posts} WHERE created_at >= NOW() - INTERVAL '24 hours') as posts_24h,
        (SELECT COUNT(*) FROM ${teams}) as total_teams,
        (SELECT COUNT(*) FROM ${events}) as total_events,
        (SELECT COUNT(*) FROM ${products}) as total_products,
        (SELECT COUNT(*) FROM ${orders}) as total_orders,
        (SELECT COALESCE(SUM(balance), 0) FROM ${wallets}) as total_wallet_balance
    `);

    const queueCounts = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM ${posts} WHERE flagged = true AND removed = false) as flagged_posts,
        (SELECT COUNT(*) FROM ${postComments} WHERE flagged = true) as flagged_comments,
        (SELECT COUNT(*) FROM ${teams} WHERE verified = false) as pending_teams,
        (SELECT COUNT(*) FROM ${events} WHERE approved = false) as pending_events,
        (SELECT COUNT(*) FROM ${productSellers} WHERE is_verified = false) as pending_shops
    `);

    res.json({
      stats: stats.rows[0],
      queues: queueCounts.rows[0],
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

// ============================================================================
// PRODUCTION HEALTH - Read-only snapshot of /metrics for the admin UI
// ============================================================================
adminRouter.get("/health-metrics", async (_req: AdminRequest, res) => {
  try {
    res.json(getHealthSnapshot());
  } catch (error: unknown) {
    console.error("Health metrics error:", error);
    res.status(500).json({ message: "Failed to fetch health metrics" });
  }
});

// ============================================================================
// WORKER METRICS - BullMQ queue depth, failed counts, worker heartbeat age
// ============================================================================
adminRouter.get("/worker-metrics", async (_req: AdminRequest, res) => {
  try {
    const snap = getBullMqMetrics();
    const nowSec = Date.now() / 1000;
    const heartbeatAgeSeconds =
      snap.workerHeartbeatTimestampSeconds > 0
        ? Math.max(0, nowSec - snap.workerHeartbeatTimestampSeconds)
        : null;
    // SLO thresholds match monitoring/alert_rules.yml so the dashboard tells
    // the same story Prometheus does.
    const QUEUE_BACKLOG_MAX = Number(process.env.SLO_QUEUE_BACKLOG_MAX || 1000);
    const HEARTBEAT_MAX_AGE_SEC = Number(process.env.SLO_HEARTBEAT_MAX_AGE_SEC || 180);
    const overloadedQueues = Object.entries(snap.queueDepth)
      .filter(([, depth]) => depth > QUEUE_BACKLOG_MAX)
      .map(([name, depth]) => ({ name, depth }));
    const heartbeatStale =
      heartbeatAgeSeconds !== null && heartbeatAgeSeconds > HEARTBEAT_MAX_AGE_SEC;
    res.json({
      ...snap,
      heartbeatAgeSeconds,
      slo: {
        queueBacklogMax: QUEUE_BACKLOG_MAX,
        heartbeatMaxAgeSec: HEARTBEAT_MAX_AGE_SEC,
      },
      overloadedQueues,
      heartbeatStale,
      // Worker not running at all (no Redis / workers disabled) is a different
      // state than "running but stalled" — the UI can show a neutral note.
      workerNeverSeen: snap.workerHeartbeatTimestampSeconds === 0,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Worker metrics error:", error);
    res.status(500).json({ message: "Failed to fetch worker metrics" });
  }
});

// ============================================================================
// USERS MANAGEMENT
// ============================================================================
const userSearchSchema = z.object({
  q: z.string().optional(),
  banned: z.string().optional(),
  verified: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

adminRouter.get("/users", requirePermission('user:read'), async (req: AdminRequest, res) => {
  try {
    const parsed = userSearchSchema.parse(req.query);
    const limit = parseInt(parsed.limit || "50");
    const offset = parseInt(parsed.offset || "0");

    const conditions: SQL[] = [];

    if (parsed.q) {
      const qCond = or(
        like(users.email, `%${parsed.q}%`),
        like(users.username, `%${parsed.q}%`),
        like(users.displayName, `%${parsed.q}%`)
      );
      if (qCond) conditions.push(qCond);
    }

    if (parsed.banned) {
      conditions.push(eq(users.banned, parsed.banned === 'true'));
    }

    if (parsed.verified) {
      conditions.push(eq(users.verified, parsed.verified === 'true'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const usersList = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db.select({ count: count() }).from(users);

    res.json({
      users: usersList,
      total: totalCount.count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Users list error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

const banUserSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  duration: z.number().optional(),
});

adminRouter.post("/users/:userId/ban", requirePermission('user:ban'), async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = banUserSchema.parse(req.body);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const before = { banned: user.banned, bannedReason: user.bannedReason };

    await db
      .update(users)
      .set({
        banned: true,
        bannedReason: reason,
        bannedUntil: duration ? new Date(Date.now() + duration * 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    const [after] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'user.ban',
      targetType: 'user',
      targetId: userId,
      reason,
      before,
      after: { banned: after.banned, bannedReason: after.bannedReason },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { duration },
    });

    res.json({ message: "User banned successfully", user: after });
  } catch (error: any) {
    console.error("Ban user error:", error);
    res.status(500).json({ message: error.message || "Failed to ban user" });
  }
});

adminRouter.post("/users/:userId/unban", requirePermission('user:ban'), async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const before = { banned: user.banned, bannedReason: user.bannedReason };

    await db
      .update(users)
      .set({
        banned: false,
        bannedReason: null,
        bannedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'user.unban',
      targetType: 'user',
      targetId: userId,
      before,
      after: { banned: false },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: "User unbanned successfully" });
  } catch (error: any) {
    console.error("Unban user error:", error);
    res.status(500).json({ message: "Failed to unban user" });
  }
});

adminRouter.post("/users/:userId/verify", requirePermission('user:verify'), async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await db
      .update(users)
      .set({ verified: true, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'user.verify',
      targetType: 'user',
      targetId: userId,
      before: { verified: user.verified },
      after: { verified: true },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: "User verified successfully" });
  } catch (error: any) {
    console.error("Verify user error:", error);
    res.status(500).json({ message: "Failed to verify user" });
  }
});

adminRouter.get("/users/:userId/gdpr-export", requirePermission('user:gdpr_export'), async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userPosts = await db.select().from(posts).where(eq(posts.authorId, userId));
    const userTeams = await db.select().from(teams).where(eq(teams.captainId, userId));

    const gdprData = {
      user,
      posts: userPosts,
      teams: userTeams,
      exportedAt: new Date().toISOString(),
    };

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'user.gdpr_export',
      targetType: 'user',
      targetId: userId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json(gdprData);
  } catch (error: any) {
    console.error("GDPR export error:", error);
    res.status(500).json({ message: "Failed to export user data" });
  }
});

const deleteUserSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  gdprRequest: z.boolean().optional(),
});

adminRouter.delete("/users/:userId", requirePermission('user:gdpr_delete'), async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;
    const { reason, gdprRequest } = deleteUserSchema.parse(req.body);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'user.delete',
      targetType: 'user',
      targetId: userId,
      reason,
      before: user,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { gdprRequest },
    });

    await db.delete(users).where(eq(users.id, userId));

    res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: error.message || "Failed to delete user" });
  }
});

// ============================================================================
// AUDIT LOGS
// ============================================================================
adminRouter.get("/audit-logs", async (req: AdminRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string || "100");
    const offset = parseInt(req.query.offset as string || "0");
    const action = req.query.action as string;
    const adminId = req.query.adminId as string;

    const conditions: SQL[] = [];
    if (action) {
      conditions.push(eq(adminAuditLogs.action, action));
    }
    if (adminId) {
      conditions.push(eq(adminAuditLogs.adminId, adminId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db
      .select()
      .from(adminAuditLogs)
      .where(whereClause)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db.select({ count: count() }).from(adminAuditLogs);

    res.json({
      logs,
      total: totalCount.count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Audit logs error:", error);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});
