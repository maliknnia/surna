// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authUserId } from "../lib/authUser";
import { requireEmailVerified } from "../middleware/requireEmailVerified";

export const instantTeamsRouter = Router();

function requireAuthUserId(req: any, res: any): string | null {
  const id = authUserId(req);
  if (!id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return id;
}

const createTeamSchema = z.object({
  sport: z.string().min(1).max(50),
  startTime: z.string(),
  locationName: z.string().min(1).max(200),
  lat: z.string(),
  lng: z.string(),
  playersNeeded: z.number().int().min(2).max(100),
  skillLevel: z.enum(['any', 'beginner', 'intermediate', 'advanced']).default('any'),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().optional(),
});

const availabilitySchema = z.object({
  isAvailable: z.boolean(),
  sports: z.array(z.string()).default([]),
  skillLevel: z.string().default('any'),
  radiusKm: z.number().min(1).max(100).default(10),
});

const inviteResponseSchema = z.object({
  accept: z.boolean(),
});

instantTeamsRouter.get("/", async (req, res) => {
  try {
    const { sport, skillLevel } = req.query;
    const teams = await storage.getInstantTeams({
      sport: sport as string,
      skillLevel: skillLevel as string,
      status: 'active',
    });
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.get("/:id", async (req, res) => {
  try {
    const team = await storage.getInstantTeam(req.params.id);
    if (!team) return res.status(404).json({ error: "Not found" });
    const members = await storage.getInstantTeamMembers(req.params.id);
    res.json({ ...team, members });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.post("/", async (req, res) => {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;
  try {
    const validated = createTeamSchema.parse(req.body);
    const team = await storage.createInstantTeam(userId, validated);
    res.status(201).json(team);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.post("/:id/join", requireEmailVerified, async (req, res) => {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;
  try {
    const teamId = req.params.id;
    const joined = await storage.joinInstantTeam(teamId, userId);
    if (!joined) {
      const members = await storage.getInstantTeamMembers(teamId);
      const isMember = members.some((m: { userId?: string }) => m.userId === userId);
      if (!isMember) return res.status(400).json({ error: "Cannot join team" });
    }

    const team = await storage.getInstantTeam(teamId);
    if (!team) return res.status(404).json({ error: "Not found" });

    let chatGroupId: string | undefined;
    try {
      const { MessengerService } = await import("../features/messenger/messenger.service");
      const messengerService = new MessengerService(null);
      const startLabel = team.startTime
        ? new Date(team.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : "Game";
      const group = await messengerService.createGroup(userId, {
        name: `${team.sport || "Instant Join"} ${startLabel}`,
        instantTeamId: teamId,
      });
      chatGroupId = group.id;
      console.log("[Fix 3] Instant Join group chat ensured:", chatGroupId, "for team", teamId);
    } catch (err) {
      console.error("[InstantTeams] Failed to ensure group chat:", err);
    }

    res.json({ success: true, chatGroupId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.post("/:id/leave", async (req, res) => {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;
  try {
    const success = await storage.leaveInstantTeam(req.params.id, userId);
    if (!success) return res.status(400).json({ error: "Cannot leave team" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.post("/:id/convert", async (req, res) => {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;
  try {
    const newTeam = await storage.convertInstantTeam(req.params.id, userId);
    res.json(newTeam);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.post("/:id/invite", async (req, res) => {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;
  try {
    const { toUserId } = z.object({ toUserId: z.string().min(1) }).parse(req.body);
    const invite = await storage.sendInstantInvite(req.params.id, userId, toUserId);
    res.status(201).json(invite);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.get("/:id/members", async (req, res) => {
  try {
    const members = await storage.getInstantTeamMembers(req.params.id);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.get("/availability/me", async (req, res) => {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;
  try {
    const availability = await storage.getAvailability(userId);
    res.json(availability || { isAvailable: false, sports: [], skillLevel: 'any', radiusKm: 10 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.post("/availability", async (req, res) => {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;
  try {
    const validated = availabilitySchema.parse(req.body);
    const result = await storage.upsertAvailability(userId, validated);
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.get("/availability/nearby", async (req, res) => {
  try {
    const { sport, skillLevel } = req.query;
    const players = await storage.getAvailablePlayers({ sport: sport as string, skillLevel: skillLevel as string });
    res.json(players);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.post("/invites/:id/respond", async (req, res) => {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;
  try {
    const { accept } = inviteResponseSchema.parse(req.body);
    const success = await storage.respondInstantInvite(req.params.id, userId, accept);
    if (!success) return res.status(400).json({ error: "Cannot respond to invite" });
    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

instantTeamsRouter.get("/invites/mine", async (req, res) => {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;
  try {
    const invites = await storage.getUserInstantInvites(userId);
    res.json(invites);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
