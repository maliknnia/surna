// @ts-nocheck
import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { teams } from "@shared/schema";
import { getProSessionUserId } from "./proAuth";
import {
  searchPlayersForScout,
  enrichPlayerProfile,
  findPlayerCurrentTeamId,
  createTransferOffer,
  listTransfers,
  respondToTransfer,
  upsertScoutProfile,
  getScoutProfile,
  addToWatchlist,
  getWatchlist,
  createScoutReport,
  getScoutReportsForPlayer,
  getAggregatedScoutRatings,
} from "../services/transferScoutService";

export const transfersScoutRouter = Router();

function unauthorized(res: any) {
  return res.status(401).json({ error: "Unauthorized" });
}

transfersScoutRouter.get("/recruitment/players", async (req, res) => {
  const userId = getProSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const players = await searchPlayersForScout({
      sport: typeof req.query.sport === "string" ? req.query.sport : undefined,
      position: typeof req.query.position === "string" ? req.query.position : undefined,
      skillLevel: typeof req.query.skillLevel === "string" ? req.query.skillLevel : undefined,
      location: typeof req.query.location === "string" ? req.query.location : undefined,
      ageMin: req.query.ageMin ? Number(req.query.ageMin) : undefined,
      ageMax: req.query.ageMax ? Number(req.query.ageMax) : undefined,
      excludeUserId: userId,
      limit: Number(req.query.limit) || 40,
    });
    res.json(players);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

transfersScoutRouter.get("/players/:userId/market", async (req, res) => {
  const userId = getProSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const profile = await enrichPlayerProfile(req.params.userId);
    if (!profile) return res.status(404).json({ error: "Player not found" });
    const currentTeamId = await findPlayerCurrentTeamId(req.params.userId);
    res.json({ ...profile, currentTeamId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

transfersScoutRouter.post("/transfers", async (req, res) => {
  const userId = getProSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const body = z
      .object({
        offeringTeamId: z.string().min(1),
        targetPlayerUserId: z.string().min(1),
        targetTeamId: z.string().optional(),
        amountEur: z.number().min(0),
        roleOffered: z.string().max(80).optional(),
        message: z.string().max(2000).optional(),
        contractMonths: z.number().int().min(1).max(60).default(12),
      })
      .parse(req.body);

    let targetTeamId = body.targetTeamId;
    if (!targetTeamId) {
      targetTeamId = (await findPlayerCurrentTeamId(body.targetPlayerUserId)) || undefined;
    }
    if (!targetTeamId) {
      return res.status(400).json({ error: "targetTeamId required when player has no active team" });
    }

    const offer = await createTransferOffer({
      offeringTeamId: body.offeringTeamId,
      targetPlayerUserId: body.targetPlayerUserId,
      targetTeamId,
      amountEur: body.amountEur,
      roleOffered: body.roleOffered,
      message: body.message,
      contractMonths: body.contractMonths,
      createdBy: userId,
    });
    res.status(201).json(offer);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
    res.status(400).json({ error: e.message });
  }
});

transfersScoutRouter.get("/transfers", async (req, res) => {
  const userId = getProSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const teamId = typeof req.query.teamId === "string" ? req.query.teamId : "";
    if (!teamId) return res.status(400).json({ error: "teamId required" });
    const data = await listTransfers(teamId);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

transfersScoutRouter.patch("/transfers/:id", async (req, res) => {
  const userId = getProSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const { status } = z.object({ status: z.enum(["accepted", "rejected"]) }).parse(req.body);
    const updated = await respondToTransfer(req.params.id, status, userId);
    res.json(updated);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
    res.status(400).json({ error: e.message });
  }
});

transfersScoutRouter.get("/scout/profile", async (req, res) => {
  const userId = getProSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const profile = await getScoutProfile(userId);
    res.json(profile || { userId, verified: false });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

transfersScoutRouter.post("/scout/profile", async (req, res) => {
  const userId = getProSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const body = z
      .object({ bio: z.string().max(2000).optional(), regions: z.string().max(200).optional() })
      .parse(req.body);
    const profile = await upsertScoutProfile(userId, body);
    res.json(profile);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
    res.status(500).json({ error: e.message });
  }
});

transfersScoutRouter.get("/scout/watchlist", async (req, res) => {
  const userId = getProSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const list = await getWatchlist(userId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

transfersScoutRouter.post("/scout/watchlist", async (req, res) => {
  const userId = getProSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const { playerUserId } = z.object({ playerUserId: z.string().min(1) }).parse(req.body);
    await addToWatchlist(userId, playerUserId);
    res.status(201).json({ success: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
    res.status(400).json({ error: e.message });
  }
});

transfersScoutRouter.post("/scout-reports", async (req, res) => {
  const userId = getProSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const body = z
      .object({
        playerUserId: z.string().min(1),
        overallRating: z.number().int().min(1).max(10),
        technicalRating: z.number().int().min(1).max(10),
        physicalRating: z.number().int().min(1).max(10),
        tacticalRating: z.number().int().min(1).max(10),
        notes: z.string().max(4000).optional(),
        sharedTeamIds: z.array(z.string()).optional(),
      })
      .parse(req.body);
    const report = await createScoutReport({
      scoutUserId: userId,
      ...body,
    });
    res.status(201).json(report);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
    res.status(500).json({ error: e.message });
  }
});

transfersScoutRouter.get("/scout-reports/player/:playerUserId", async (req, res) => {
  const userId = getProSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const teamId = typeof req.query.teamId === "string" ? req.query.teamId : undefined;
    const aggregated = await getAggregatedScoutRatings(req.params.playerUserId);
    const reports = await getScoutReportsForPlayer(req.params.playerUserId, teamId);
    res.json({ aggregated, reports });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
