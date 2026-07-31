import { Router } from "express";
import { z } from "zod";
import { authUserId, resolveRequestUserId } from "../lib/authUser";
import {
  createActivity,
  listUserActivities,
  getActivityById,
  getHealthSummary,
  getPersonalBests,
  getSquadHealthOverview,
  getPlayerActivityHistory,
  getReadinessReport,
  generateReadinessReport,
  assertTeamManager,
} from "../services/phase7HealthService";
import { canViewHealthSection } from "../services/healthPrivacyService";
import { attachProSessionUser } from "./proAuth";
import { requireActivePro } from "../middleware/requireActivePro";

export const healthPhase7Router = Router();

const requireProForTeamHealth = [attachProSessionUser, requireActivePro];

function requireUserId(req: any, res: any): string | null {
  const id = resolveRequestUserId(req) ?? authUserId(req);
  if (!id) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
  return id;
}

/** POST /api/activities */
healthPhase7Router.post("/activities", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z
      .object({
        activityType: z.string().min(1).max(60),
        distanceKm: z.number().optional(),
        durationSeconds: z.number().int().optional(),
        calories: z.number().int().optional(),
        avgHeartRate: z.number().int().optional(),
        routeCoordinates: z.array(z.tuple([z.number(), z.number()])).optional(),
        startedAt: z.string(),
        finishedAt: z.string().optional(),
      })
      .parse(req.body);

    const result = await createActivity({ userId, ...body });
    res.status(201).json(result);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create activity" });
  }
});

/** GET /api/users/:id/activities */
healthPhase7Router.get("/users/:id/activities", async (req, res) => {
  const viewerId = resolveRequestUserId(req as any) ?? authUserId(req as any);
  try {
    const targetId = req.params.id;
    if (viewerId !== targetId) {
      const allowed = await canViewHealthSection(targetId, viewerId, "weeklyLoad");
      if (!allowed) return res.status(403).json({ message: "Activities are private" });
    }
    const activities = await listUserActivities(targetId);
    res.json({ activities });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to list activities" });
  }
});

/** GET /api/activities/:id */
healthPhase7Router.get("/activities/:id", async (req, res) => {
  const viewerId = resolveRequestUserId(req as any) ?? authUserId(req as any);
  try {
    const activity = await getActivityById(req.params.id, viewerId ?? undefined);
    if (!activity) return res.status(404).json({ message: "Activity not found" });
    if (viewerId && String(activity.user_id) !== viewerId) {
      const allowed = await canViewHealthSection(String(activity.user_id), viewerId, "weeklyLoad");
      if (!allowed) return res.status(403).json({ message: "Activity is private" });
    }
    res.json({ activity });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to load activity" });
  }
});

/** GET /api/users/:id/health-summary */
healthPhase7Router.get("/users/:id/health-summary", async (req, res) => {
  const viewerId = resolveRequestUserId(req as any) ?? authUserId(req as any);
  try {
    const targetId = req.params.id;
    const full = await getHealthSummary(targetId);

    const sections = {
      weeklyTrainingLoad: await canViewHealthSection(targetId, viewerId, "weeklyLoad"),
      monthlyTrend: await canViewHealthSection(targetId, viewerId, "monthlyTrend"),
      currentStreak: await canViewHealthSection(targetId, viewerId, "streak"),
      personalBests: await canViewHealthSection(targetId, viewerId, "personalBests"),
    };

    if (!viewerId && Object.values(sections).every((v) => !v)) {
      return res.status(403).json({ message: "Health profile is private" });
    }

    res.json({
      weeklyTrainingLoad: sections.weeklyTrainingLoad ? full.weeklyTrainingLoad : null,
      monthlyTrend: sections.monthlyTrend ? full.monthlyTrend : null,
      currentStreak: sections.currentStreak ? full.currentStreak : null,
      longestStreak: sections.currentStreak ? full.longestStreak : null,
      personalBests: sections.personalBests ? full.personalBests : null,
      visibility: sections,
      isOwnProfile: viewerId === targetId,
    });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to load health summary" });
  }
});

/** GET /api/users/:id/personal-bests */
healthPhase7Router.get("/users/:id/personal-bests", async (req, res) => {
  const viewerId = resolveRequestUserId(req as any) ?? authUserId(req as any);
  try {
    const targetId = req.params.id;
    const allowed = await canViewHealthSection(targetId, viewerId, "personalBests");
    if (!allowed) return res.status(403).json({ message: "Personal bests are private" });
    const personalBests = await getPersonalBests(targetId);
    res.json({ personalBests });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to load personal bests" });
  }
});

/** GET /api/pro/team/:teamId/squad-health */
healthPhase7Router.get("/pro/team/:teamId/squad-health", ...requireProForTeamHealth, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    await assertTeamManager(req.params.teamId, userId);
    const overview = await getSquadHealthOverview(req.params.teamId);
    res.json(overview);
  } catch (err: unknown) {
    res.status(403).json({ message: err instanceof Error ? err.message : "Access denied" });
  }
});

/** GET /api/pro/team/:teamId/squad-health/:playerId */
healthPhase7Router.get("/pro/team/:teamId/squad-health/:playerId", ...requireProForTeamHealth, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    await assertTeamManager(req.params.teamId, userId);
    const history = await getPlayerActivityHistory(req.params.teamId, req.params.playerId);
    res.json(history);
  } catch (err: unknown) {
    res.status(403).json({ message: err instanceof Error ? err.message : "Access denied" });
  }
});

/** GET /api/pro/team/:teamId/readiness/:eventId */
healthPhase7Router.get("/pro/team/:teamId/readiness/:eventId", ...requireProForTeamHealth, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    await assertTeamManager(req.params.teamId, userId);
    let report = await getReadinessReport(req.params.teamId, req.params.eventId);
    if (!report) {
      report = await generateReadinessReport(req.params.teamId, req.params.eventId);
    }
    res.json({ report });
  } catch (err: unknown) {
    res.status(403).json({ message: err instanceof Error ? err.message : "Access denied" });
  }
});

export default healthPhase7Router;
