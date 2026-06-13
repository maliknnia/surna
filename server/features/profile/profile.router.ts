import { Router } from "express";
import { z } from "zod";
import { GetProfileParamsSchema, UpdateMeSchema } from "./profile.validation";
import { getPublicProfile, patchMe } from "./profile.service";
import {
  getProfileAchievements,
  getProfileEvents,
  getProfileFeed,
  getProfilePerformance,
  getProfileTeams,
} from "./profile.resources";
import { isAuthenticated } from "../../replitAuth";
import { resolveRequestUserId } from "../../lib/authUser";
import { getActiveNudges, dismissNudge } from "../../services/phase8ProfileService";

export const profileRouter = Router();

/** Reserved slugs — must register before /:username or Phase 8 routes 404. */
profileRouter.get("/nudges", async (req, res) => {
  const userId = resolveRequestUserId(req as Parameters<typeof resolveRequestUserId>[0]);
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
  try {
    const nudges = await getActiveNudges(userId);
    res.json({ nudges });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to load nudges" });
  }
});

profileRouter.post("/nudges/:milestone/dismiss", async (req, res) => {
  const userId = resolveRequestUserId(req as Parameters<typeof resolveRequestUserId>[0]);
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
  try {
    const milestone = z
      .enum(["first_team_join", "first_challenge_win", "ten_activities", "three_profile_views"])
      .parse(req.params.milestone);
    const result = await dismissNudge(userId, milestone);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid milestone" });
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to dismiss nudge" });
  }
});

profileRouter.patch("/me", async (req: any, res, next) => {
  try {
    const userId = resolveRequestUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const data = UpdateMeSchema.parse(req.body);
    const updated = await patchMe(userId, data);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

profileRouter.get("/:id/teams", isAuthenticated, async (req, res) => {
  try {
    const teams = await getProfileTeams(req.params.id);
    res.json({ teams });
  } catch {
    res.status(500).json({ message: "Failed to fetch teams" });
  }
});

profileRouter.get("/:id/events", isAuthenticated, async (req, res) => {
  try {
    const events = await getProfileEvents(req.params.id);
    res.json({ events });
  } catch {
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

profileRouter.get("/:id/achievements", isAuthenticated, async (req, res) => {
  try {
    const achievements = await getProfileAchievements(req.params.id);
    res.json({ achievements });
  } catch {
    res.status(500).json({ message: "Failed to fetch achievements" });
  }
});

profileRouter.get("/:id/performance", isAuthenticated, async (req, res) => {
  try {
    const performance = await getProfilePerformance(req.params.id);
    res.json(performance);
  } catch {
    res.status(500).json({ message: "Failed to fetch performance data" });
  }
});

profileRouter.get("/:id/feed", isAuthenticated, async (req, res) => {
  try {
    const posts = await getProfileFeed(req.params.id);
    res.json({ posts });
  } catch {
    res.status(500).json({ message: "Failed to fetch activity feed" });
  }
});

profileRouter.post("/:id/review", isAuthenticated, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    res.json({
      success: true,
      reviewId: `review-${Date.now()}`,
      rating,
      comment,
    });
  } catch {
    res.status(500).json({ message: "Failed to submit review" });
  }
});

profileRouter.get("/:username", async (req, res, next) => {
  try {
    const { username } = GetProfileParamsSchema.parse(req.params);
    const profile = await getPublicProfile(username);
    if (!profile) return res.status(404).json({ error: "USER_NOT_FOUND" });
    res.json(profile);
  } catch (e) {
    next(e);
  }
});
