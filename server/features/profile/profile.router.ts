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
import { storage } from "../../storage";
import { getActiveNudges, dismissNudge } from "../../services/phase8ProfileService";
import {
  getProfileTeamGames,
  getProfileTeamGameSummary,
  setTeamGameProfileVisibility,
} from "../../services/teamGameService";

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

profileRouter.get("/:id/team-games", isAuthenticated, async (req, res) => {
  try {
    const viewerId = resolveRequestUserId(req as Parameters<typeof resolveRequestUserId>[0]);
    if (!viewerId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const profileUserId = req.params.id;
    const includeHidden = viewerId === profileUserId;
    const games = await getProfileTeamGames(profileUserId, { includeHidden });
    const summary = await getProfileTeamGameSummary(profileUserId);
    res.json({ games, summary });
  } catch {
    res.status(500).json({ message: "Failed to fetch team games" });
  }
});

profileRouter.patch("/team-games/:participantId/visibility", isAuthenticated, async (req, res) => {
  try {
    const userId = resolveRequestUserId(req as Parameters<typeof resolveRequestUserId>[0]);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const parsed = z.object({ showOnProfile: z.boolean() }).safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: "INVALID_BODY" });
    await setTeamGameProfileVisibility(req.params.participantId, userId, parsed.data.showOnProfile);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update visibility";
    res.status(400).json({ message: msg });
  }
});

profileRouter.post("/:id/review", isAuthenticated, async (req, res) => {
  try {
    const authorId = resolveRequestUserId(req as Parameters<typeof resolveRequestUserId>[0]);
    if (!authorId) return res.status(401).json({ error: "UNAUTHORIZED" });

    const subjectId = req.params.id;
    if (authorId === subjectId) {
      return res.status(400).json({ message: "Cannot review yourself" });
    }

    const body = z
      .object({
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(1000).optional(),
        text: z.string().max(1000).optional(),
        context: z.string().max(100).optional(),
      })
      .parse(req.body);

    const review = await storage.upsertUserReview({
      subjectId,
      authorId,
      rating: body.rating,
      text: body.text ?? body.comment ?? null,
      context: body.context ?? null,
    });
    res.status(201).json(review);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to submit review" });
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
