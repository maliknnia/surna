import { Router } from "express";
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

export const profileRouter = Router();

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
