import { Router } from "express";
import { z } from "zod";
import { authUserId, resolveRequestUserId } from "../lib/authUser";
import {
  POINT_REASONS,
  awardCompetitivePoints,
  getCompetitiveLeaderboard,
  completeWeeklyChallenge,
  ensureCurrentWeeklyChallenge,
  type PointReason,
} from "../services/competitiveEngine";

export const competitiveRouter = Router();

function requireUserId(req: any, res: any): string | null {
  const id = resolveRequestUserId(req) ?? authUserId(req);
  if (!id) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
  return id;
}

const pointsBodySchema = z.object({
  reason: z.enum([
    "log_activity",
    "personal_best",
    "challenge_win",
    "verified_spot",
    "referral_signup",
    "activity_streak_7",
  ] as [PointReason, ...PointReason[]]),
  relatedEntityId: z.string().optional(),
  relatedEntityType: z.string().optional(),
  description: z.string().optional(),
});

/** POST /api/users/:id/points */
competitiveRouter.post("/users/:id/points", async (req, res) => {
  const actorId = requireUserId(req, res);
  if (!actorId) return;

  const targetId = req.params.id;
  if (actorId !== targetId) {
    return res.status(403).json({ message: "Can only award points to your own account" });
  }

  try {
    const body = pointsBodySchema.parse(req.body);
    const result = await awardCompetitivePoints(targetId, body.reason, {
      relatedEntityId: body.relatedEntityId,
      relatedEntityType: body.relatedEntityType,
      description: body.description,
    });

    if (!result.success && body.relatedEntityId) {
      return res.status(409).json({ message: "Points already awarded for this action", totalPoints: result.totalPoints });
    }

    res.json({
      success: result.success,
      pointsAwarded: result.points,
      totalPoints: result.totalPoints,
      reason: body.reason,
      pointValue: POINT_REASONS[body.reason],
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid reason", validReasons: Object.keys(POINT_REASONS) });
    }
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to award points" });
  }
});

/** GET /api/leaderboards */
competitiveRouter.get("/leaderboards", async (req, res) => {
  try {
    const viewerId = resolveRequestUserId(req as any) ?? authUserId(req as any);
    const type = (req.query.type as string) || "national";
    const sport = typeof req.query.sport === "string" ? req.query.sport : undefined;
    const period = req.query.period === "all_time" ? "all_time" : "weekly";

    if (!["local", "national", "sport", "circle"].includes(type)) {
      return res.status(400).json({ message: "type must be local, national, sport, or circle" });
    }
    if ((type === "local" || type === "circle") && !viewerId) {
      return res.status(401).json({ message: "Authentication required for this leaderboard type" });
    }
    if (type === "sport" && !sport) {
      return res.status(400).json({ message: "sport query param required for sport leaderboard" });
    }

    const entries = await getCompetitiveLeaderboard({
      type: type as "local" | "national" | "sport" | "circle",
      viewerId: viewerId ?? undefined,
      sport,
      period,
      limit: 50,
    });

    res.json({
      type,
      sport: sport ?? null,
      period,
      entries,
      resets: period === "weekly" ? "Every Monday 00:00 UTC" : "Never",
    });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to load leaderboard" });
  }
});

/** POST /api/weekly-challenges/:id/complete */
competitiveRouter.post("/weekly-challenges/:id/complete", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const ok = await completeWeeklyChallenge(userId, req.params.id);
    if (!ok) return res.status(409).json({ message: "Already completed or challenge expired" });
    res.json({ completed: true });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to complete challenge" });
  }
});

/** GET /api/weekly-challenges/current */
competitiveRouter.get("/weekly-challenges/current", async (_req, res) => {
  try {
    const challenge = await ensureCurrentWeeklyChallenge();
    res.json({ challenge });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to load weekly challenge" });
  }
});

export default competitiveRouter;
