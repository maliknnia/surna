import { Router } from "express";
import { db } from "../db";
import { teams, events } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";
import { requirePermission, getClientIp, getUserAgent, type AdminRequest } from "./admin.middleware";
import { AuditService } from "./audit.service";
import { z } from "zod";

export const adminEntitiesRouter = Router();

// ============================================================================
// TEAMS MODERATION
// ============================================================================

adminEntitiesRouter.post("/teams/:teamId/verify", requirePermission('team:verify'), async (req: AdminRequest, res) => {
  try {
    const { teamId } = req.params;

    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    await db
      .update(teams)
      .set({ verified: true, updatedAt: new Date() })
      .where(eq(teams.id, teamId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'team.verify',
      targetType: 'team',
      targetId: teamId,
      before: { verified: team.verified },
      after: { verified: true },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: "Team verified successfully" });
  } catch (error: any) {
    console.error("Verify team error:", error);
    res.status(500).json({ message: "Failed to verify team" });
  }
});

const removeTeamSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

adminEntitiesRouter.post("/teams/:teamId/remove", requirePermission('team:remove'), async (req: AdminRequest, res) => {
  try {
    const { teamId } = req.params;
    const { reason } = removeTeamSchema.parse(req.body);

    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    await db.delete(teams).where(eq(teams.id, teamId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'team.remove',
      targetType: 'team',
      targetId: teamId,
      reason,
      before: team,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: "Team removed successfully" });
  } catch (error: any) {
    console.error("Remove team error:", error);
    res.status(500).json({ message: error.message || "Failed to remove team" });
  }
});

// ============================================================================
// EVENTS MODERATION
// ============================================================================

adminEntitiesRouter.post("/events/:eventId/approve", requirePermission('event:approve'), async (req: AdminRequest, res) => {
  try {
    const { eventId } = req.params;

    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await db
      .update(events)
      .set({ approved: true, updatedAt: new Date() })
      .where(eq(events.id, eventId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'event.approve',
      targetType: 'event',
      targetId: eventId,
      before: { approved: event.approved },
      after: { approved: true },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: "Event approved successfully" });
  } catch (error: any) {
    console.error("Approve event error:", error);
    res.status(500).json({ message: "Failed to approve event" });
  }
});

const removeEventSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

adminEntitiesRouter.post("/events/:eventId/remove", requirePermission('event:remove'), async (req: AdminRequest, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = removeEventSchema.parse(req.body);

    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await db.delete(events).where(eq(events.id, eventId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'event.remove',
      targetType: 'event',
      targetId: eventId,
      reason,
      before: event,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: "Event removed successfully" });
  } catch (error: any) {
    console.error("Remove event error:", error);
    res.status(500).json({ message: error.message || "Failed to remove event" });
  }
});
