// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { getProSessionUser } from "./proAuth";
import { normalizeFormationLayoutJson } from "@shared/formationBoard";
import {
  attachFormationToMatchSquad,
  resolveTeamFormationBoardMeta,
  upsertTeamFormation,
} from "../services/formationBoardService";

export const proCategoriesRouter = Router();

function getUser(req: any) {
  return getProSessionUser(req);
}

function unauthorized(res: any) {
  return res.status(401).json({ error: "Unauthorized" });
}

// ═══════════════════════════════════════════════════════════
// CATEGORY 2 — Training Plans
// ═══════════════════════════════════════════════════════════

const createTrainingSessionSchema = z.object({
  teamId: z.string().min(1),
  dateTime: z.string().min(1),
  placeId: z.string().optional(),
  focus: z.string().optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
});

const createTrainingDrillSchema = z.object({
  name: z.string().min(1),
  teamId: z.string().optional(),
  duration: z.number().optional(),
  description: z.string().optional(),
  videoUrl: z.string().optional(),
  category: z.string().optional(),
  isGlobal: z.boolean().optional(),
});

const addDrillToSessionSchema = z.object({
  sessionId: z.string().min(1),
  drillId: z.string().min(1),
  orderIndex: z.number().optional(),
  notes: z.string().optional(),
});

const markAttendanceSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  status: z.string().optional(),
  reason: z.string().optional(),
});

proCategoriesRouter.get("/team/:teamId/training/sessions", async (req, res) => {
  try {
    const sessions = await storage.getTrainingSessions(req.params.teamId);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/team/:teamId/training/session", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createTrainingSessionSchema.parse({ ...req.body, teamId: req.params.teamId });
    const session = await storage.createTrainingSession(data);
    await storage.logProAudit(req.params.teamId, user.id, "training.session.create", { entity: "trainingSession", entityId: session.id, after: data });
    res.status(201).json(session);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/team/:teamId/training/drills", async (req, res) => {
  try {
    const drills = await storage.getTrainingDrills(req.params.teamId);
    res.json(drills);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/team/:teamId/training/drill", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createTrainingDrillSchema.parse(req.body);
    const drill = await storage.createTrainingDrill(data);
    await storage.logProAudit(req.params.teamId, user.id, "training.drill.create", { entity: "trainingDrill", entityId: drill.id, after: data });
    res.status(201).json(drill);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/training/session/:sessionId/drills", async (req, res) => {
  try {
    const drills = await storage.getSessionDrills(req.params.sessionId);
    res.json(drills);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/training/session/:sessionId/drill", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addDrillToSessionSchema.parse({ ...req.body, sessionId: req.params.sessionId });
    const result = await storage.addDrillToSession(data);
    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/training/session/:sessionId/attendance", async (req, res) => {
  try {
    const attendance = await storage.getTrainingAttendance(req.params.sessionId);
    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/training/session/:sessionId/attendance", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = markAttendanceSchema.parse({ ...req.body, sessionId: req.params.sessionId });
    const result = await storage.markAttendance(data);
    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CATEGORY 3 — Match Day
// ═══════════════════════════════════════════════════════════

const createFormationSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1).optional(),
  sportType: z.string().optional(),
  layoutJson: z.any().optional(),
  archetypeKey: z.string().optional(),
  /** When set, updates this formation instead of inserting (upsert via POST). */
  formationId: z.string().optional(),
});

const patchFormationSchema = z.object({
  name: z.string().min(1).optional(),
  sportType: z.string().optional(),
  layoutJson: z.any().optional(),
  archetypeKey: z.string().optional(),
});

const createMatchSquadSchema = z.object({
  eventId: z.string().optional(),
  teamId: z.string().min(1),
  formationId: z.string().optional(),
  captainUserId: z.string().optional(),
});

const attachFormationSchema = z.object({
  formationId: z.string().min(1),
  teamId: z.string().min(1),
});

const addSquadPlayerSchema = z.object({
  squadId: z.string().min(1),
  userId: z.string().min(1),
  positionKey: z.string().optional(),
  isStarter: z.boolean().optional(),
  shirtNo: z.number().optional(),
});

const addSubstitutionSchema = z.object({
  matchId: z.string().min(1),
  minute: z.number().optional(),
  playerOutId: z.string().optional(),
  playerInId: z.string().optional(),
  reason: z.string().optional(),
});

const addMatchNoteSchema = z.object({
  matchId: z.string().min(1),
  staffUserId: z.string().optional(),
  minute: z.number().optional(),
  note: z.string().optional(),
});

proCategoriesRouter.get("/team/:teamId/formation-board", async (req, res) => {
  try {
    const meta = await resolveTeamFormationBoardMeta(req.params.teamId);
    res.json(meta);
  } catch (error: any) {
    const status = error?.message === "Team not found" ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
});

proCategoriesRouter.get("/team/:teamId/formations", async (req, res) => {
  try {
    const formations = await storage.getFormations(req.params.teamId);
    res.json(
      formations.map((f: any) => ({
        ...f,
        layoutJson: normalizeFormationLayoutJson(f.layoutJson, {
          layoutId: f.sportType,
        }),
      })),
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/team/:teamId/formations/:formationId", async (req, res) => {
  try {
    const formation = await storage.getFormationById(req.params.formationId);
    if (!formation || formation.teamId !== req.params.teamId) {
      return res.status(404).json({ error: "Formation not found" });
    }
    res.json({
      ...formation,
      layoutJson: normalizeFormationLayoutJson(formation.layoutJson, {
        layoutId: formation.sportType,
      }),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function handleUpsertFormation(req: any, res: any) {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createFormationSchema.parse({ ...req.body, teamId: req.params.teamId });
    const formation = await upsertTeamFormation(req.params.teamId, {
      formationId: data.formationId,
      name: data.name,
      sportType: data.sportType,
      layoutJson: data.layoutJson,
      archetypeKey: data.archetypeKey,
    });
    await storage.logProAudit(
      req.params.teamId,
      user.id,
      data.formationId ? "formation.update" : "formation.create",
      { entity: "formation", entityId: formation.id, after: data },
    );
    res.status(data.formationId ? 200 : 201).json({
      ...formation,
      layoutJson: normalizeFormationLayoutJson(formation.layoutJson, {
        layoutId: formation.sportType,
      }),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    const msg = error?.message || "Failed";
    const status =
      msg.includes("not found") || msg.includes("not valid") || msg.includes("Unknown") ? 400 : 500;
    res.status(status).json({ error: msg });
  }
}

proCategoriesRouter.post("/team/:teamId/formation", handleUpsertFormation);
proCategoriesRouter.post("/team/:teamId/formations", handleUpsertFormation);

proCategoriesRouter.patch("/team/:teamId/formations/:formationId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = patchFormationSchema.parse(req.body);
    const formation = await upsertTeamFormation(req.params.teamId, {
      formationId: req.params.formationId,
      ...data,
    });
    await storage.logProAudit(req.params.teamId, user.id, "formation.update", {
      entity: "formation",
      entityId: formation.id,
      after: data,
    });
    res.json({
      ...formation,
      layoutJson: normalizeFormationLayoutJson(formation.layoutJson, {
        layoutId: formation.sportType,
      }),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    const msg = error?.message || "Failed";
    const status = msg.includes("not found") ? 404 : msg.includes("not valid") || msg.includes("Unknown") ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

proCategoriesRouter.get("/match/:matchId/squad", async (req, res) => {
  try {
    const teamId = req.query.teamId as string;
    const squad = await storage.getMatchSquad(req.params.matchId, teamId);
    res.json(squad || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/match/:matchId/squad/set", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createMatchSquadSchema.parse(req.body);
    const squad = await storage.createMatchSquad({ ...data, eventId: data.eventId || req.params.matchId });
    if (data.teamId) {
      await storage.logProAudit(data.teamId, user.id, "squad.create", { entity: "matchSquad", entityId: squad.id, after: data });
    }
    res.status(201).json(squad);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/match/:matchId/squad/:squadId/attach-formation", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = attachFormationSchema.parse(req.body);
    const result = await attachFormationToMatchSquad({
      squadId: req.params.squadId,
      teamId: data.teamId,
      formationId: data.formationId,
    });
    await storage.logProAudit(data.teamId, user.id, "squad.attach_formation", {
      entity: "matchSquad",
      entityId: req.params.squadId,
      after: { formationId: data.formationId, matchId: req.params.matchId },
    });
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    const msg = error?.message || "Failed";
    const status = msg.includes("not found") ? 404 : 400;
    res.status(status).json({ error: msg });
  }
});

proCategoriesRouter.post("/match/:matchId/squad/:squadId/player", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addSquadPlayerSchema.parse({ ...req.body, squadId: req.params.squadId });
    const player = await storage.addSquadPlayer(data);
    res.status(201).json(player);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/match/:matchId/squad/:squadId/players", async (req, res) => {
  try {
    const players = await storage.getSquadPlayers(req.params.squadId);
    res.json(players);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/match/:matchId/substitution", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addSubstitutionSchema.parse({ ...req.body, matchId: req.params.matchId });
    const sub = await storage.addSubstitution(data);
    res.status(201).json(sub);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/match/:matchId/substitutions", async (req, res) => {
  try {
    const subs = await storage.getMatchSubstitutions(req.params.matchId);
    res.json(subs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/match/:matchId/note", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addMatchNoteSchema.parse({ ...req.body, matchId: req.params.matchId });
    const note = await storage.addMatchNote(data);
    res.status(201).json(note);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/match/:matchId/notes", async (req, res) => {
  try {
    const notes = await storage.getMatchNotes(req.params.matchId);
    res.json(notes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CATEGORY 4 — Equipment & Inventory
// ═══════════════════════════════════════════════════════════

const createInventoryItemSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  quantity: z.number().optional(),
  condition: z.string().optional(),
  photoUrl: z.string().optional(),
});

const addInventoryLogSchema = z.object({
  itemId: z.string().min(1),
  action: z.string().min(1),
  delta: z.number().optional(),
  userId: z.string().optional(),
  notes: z.string().optional(),
});

proCategoriesRouter.get("/team/:teamId/inventory", async (req, res) => {
  try {
    const items = await storage.getInventoryItems(req.params.teamId);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/team/:teamId/inventory/item", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createInventoryItemSchema.parse({ ...req.body, teamId: req.params.teamId });
    const item = await storage.createInventoryItem(data);
    await storage.logProAudit(req.params.teamId, user.id, "inventory.item.create", { entity: "inventoryItem", entityId: item.id, after: data });
    res.status(201).json(item);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.patch("/inventory/item/:itemId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createInventoryItemSchema.partial().parse(req.body);
    const item = await storage.updateInventoryItem(req.params.itemId, data);
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (data.teamId) {
      await storage.logProAudit(data.teamId, user.id, "inventory.item.update", { entity: "inventoryItem", entityId: req.params.itemId, after: data });
    }
    res.json(item);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/inventory/item/:itemId/logs", async (req, res) => {
  try {
    const logs = await storage.getInventoryLogs(req.params.itemId);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/inventory/item/:itemId/log", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addInventoryLogSchema.parse({ ...req.body, itemId: req.params.itemId });
    const log = await storage.addInventoryLog(data);
    res.status(201).json(log);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CATEGORY 5 — Scheduling & Availability
// ═══════════════════════════════════════════════════════════

const createScheduleRuleSchema = z.object({
  teamId: z.string().min(1),
  recurringJson: z.any().optional(),
});

const upsertRsvpSchema = z.object({
  eventId: z.string().min(1),
  userId: z.string().min(1),
  status: z.string().optional(),
});

const setAvailabilitySchema = z.object({
  userId: z.string().min(1),
  sport: z.string().optional(),
  daysAndTimes: z.any().optional(),
  radiusKm: z.number().optional(),
});

proCategoriesRouter.get("/team/:teamId/schedule-rules", async (req, res) => {
  try {
    const rules = await storage.getScheduleRules(req.params.teamId);
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/team/:teamId/schedule-rule", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createScheduleRuleSchema.parse({ ...req.body, teamId: req.params.teamId });
    const rule = await storage.createScheduleRule(data);
    await storage.logProAudit(req.params.teamId, user.id, "schedule.rule.create", { entity: "scheduleRule", entityId: rule.id, after: data });
    res.status(201).json(rule);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/event/:eventId/rsvp", async (req, res) => {
  try {
    const rsvps = await storage.getRsvps(req.params.eventId);
    res.json(rsvps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/event/:eventId/rsvp", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = upsertRsvpSchema.parse({ ...req.body, eventId: req.params.eventId });
    const rsvp = await storage.upsertRsvp(data);
    res.status(201).json(rsvp);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/team/:teamId/availability", async (req, res) => {
  try {
    const availability = await storage.getTeamAvailability(req.params.teamId);
    res.json(availability);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/availability", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = setAvailabilitySchema.parse(req.body);
    const result = await storage.setAvailability(data);
    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CATEGORY 6 — Performance Stats
// ═══════════════════════════════════════════════════════════

const addPlayerMatchStatsSchema = z.object({
  matchId: z.string().min(1),
  userId: z.string().min(1),
  metricsJson: z.any().optional(),
  rating: z.number().optional(),
  notes: z.string().optional(),
});

const addTeamMatchStatsSchema = z.object({
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  metricsJson: z.any().optional(),
});

const addPlayerTrainingStatsSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  metricsJson: z.any().optional(),
});

proCategoriesRouter.post("/match/:matchId/player-stats", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addPlayerMatchStatsSchema.parse({ ...req.body, matchId: req.params.matchId });
    const stats = await storage.addPlayerMatchStats(data);
    res.status(201).json(stats);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/match/:matchId/player-stats", async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const stats = await storage.getPlayerMatchStats(req.params.matchId, userId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/match/:matchId/team-stats", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addTeamMatchStatsSchema.parse({ ...req.body, matchId: req.params.matchId });
    const stats = await storage.addTeamMatchStats(data);
    if (data.teamId) {
      await storage.logProAudit(data.teamId, user.id, "stats.team.add", { entity: "teamMatchStats", entityId: stats.id, after: data });
    }
    res.status(201).json(stats);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/match/:matchId/team-stats", async (req, res) => {
  try {
    const teamId = req.query.teamId as string;
    const stats = await storage.getTeamMatchStats(req.params.matchId, teamId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/training/session/:sessionId/player-stats", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addPlayerTrainingStatsSchema.parse({ ...req.body, sessionId: req.params.sessionId });
    const stats = await storage.addPlayerTrainingStats(data);
    res.status(201).json(stats);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/training/session/:sessionId/player-stats", async (req, res) => {
  try {
    const stats = await storage.getPlayerTrainingStats(req.params.sessionId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/team/:teamId/player/:userId/stats", async (req, res) => {
  try {
    const stats = await storage.getPlayerMatchStats(req.params.userId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CATEGORY 7 — Communication Center
// ═══════════════════════════════════════════════════════════

const createAnnouncementSchema = z.object({
  teamId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
  pinned: z.boolean().optional(),
  createdBy: z.string().optional(),
});

const createMessageGroupSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1),
});

const addMessageGroupMemberSchema = z.object({
  groupId: z.string().min(1),
  userId: z.string().min(1),
});

proCategoriesRouter.get("/team/:teamId/announcements", async (req, res) => {
  try {
    const announcements = await storage.getAnnouncements(req.params.teamId);
    res.json(announcements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/team/:teamId/announcement", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createAnnouncementSchema.parse({ ...req.body, teamId: req.params.teamId });
    const announcement = await storage.createAnnouncement(data);
    await storage.logProAudit(req.params.teamId, user.id, "announcement.create", { entity: "announcement", entityId: announcement.id, after: data });
    res.status(201).json(announcement);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.delete("/announcement/:announcementId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    await storage.deleteAnnouncement(req.params.announcementId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/team/:teamId/message-groups", async (req, res) => {
  try {
    const groups = await storage.getMessageGroups(req.params.teamId);
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/team/:teamId/message-group", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createMessageGroupSchema.parse({ ...req.body, teamId: req.params.teamId });
    const group = await storage.createMessageGroup(data);
    await storage.logProAudit(req.params.teamId, user.id, "messageGroup.create", { entity: "messageGroup", entityId: group.id, after: data });
    res.status(201).json(group);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/message-group/:groupId/members", async (req, res) => {
  try {
    const members = await storage.getMessageGroupMembers(req.params.groupId);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/message-group/:groupId/member", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addMessageGroupMemberSchema.parse({ ...req.body, groupId: req.params.groupId });
    const member = await storage.addMessageGroupMember(data);
    res.status(201).json(member);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.delete("/message-group/:groupId/member/:userId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    await storage.removeMessageGroupMember(req.params.groupId, req.params.userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CATEGORY 8 — Recruitment & Trials
// ═══════════════════════════════════════════════════════════

const createTrialSchema = z.object({
  teamId: z.string().min(1),
  dateTime: z.string().min(1),
  placeId: z.string().optional(),
  requirementsJson: z.any().optional(),
  createdBy: z.string().optional(),
});

const applyToTrialSchema = z.object({
  trialId: z.string().min(1),
  userId: z.string().min(1),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const updateTrialApplicationSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
});

const addToShortlistSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

proCategoriesRouter.get("/team/:teamId/trials", async (req, res) => {
  try {
    const trials = await storage.getTrials(req.params.teamId);
    res.json(trials);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/team/:teamId/trial/create", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createTrialSchema.parse({ ...req.body, teamId: req.params.teamId });
    const trial = await storage.createTrial(data);
    await storage.logProAudit(req.params.teamId, user.id, "trial.create", { entity: "trial", entityId: trial.id, after: data });
    res.status(201).json(trial);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/trial/:trialId/applications", async (req, res) => {
  try {
    const applications = await storage.getTrialApplications(req.params.trialId);
    res.json(applications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/trial/:trialId/apply", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = applyToTrialSchema.parse({ ...req.body, trialId: req.params.trialId });
    const application = await storage.applyToTrial(data);
    res.status(201).json(application);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.patch("/trial/application/:applicationId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = updateTrialApplicationSchema.parse(req.body);
    const application = await storage.updateTrialApplication(req.params.applicationId, data);
    if (!application) return res.status(404).json({ error: "Application not found" });
    res.json(application);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/team/:teamId/shortlist", async (req, res) => {
  try {
    const shortlist = await storage.getScoutShortlist(req.params.teamId);
    res.json(shortlist);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/team/:teamId/shortlist", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addToShortlistSchema.parse({ ...req.body, teamId: req.params.teamId });
    const entry = await storage.addToShortlist(data);
    await storage.logProAudit(req.params.teamId, user.id, "shortlist.add", { entity: "shortlist", entityId: entry.id, after: data });
    res.status(201).json(entry);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.delete("/shortlist/:entryId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    await storage.removeFromShortlist(req.params.entryId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CATEGORY 9 — Club/Academy Layer
// ═══════════════════════════════════════════════════════════

const createClubSchema = z.object({
  ownerId: z.string().min(1),
  name: z.string().min(1),
  location: z.string().optional(),
  logoUrl: z.string().optional(),
});

const addClubTeamSchema = z.object({
  clubId: z.string().min(1),
  teamId: z.string().min(1),
});

const createAcademyProfileSchema = z.object({
  clubId: z.string().min(1),
  userId: z.string().min(1),
  ageGroup: z.string().optional(),
  progressJson: z.any().optional(),
});

proCategoriesRouter.get("/club/:clubId", async (req, res) => {
  try {
    const club = await storage.getClub(req.params.clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });
    res.json(club);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/clubs/mine", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const clubs = await storage.getClubsByOwner(user.id);
    res.json(clubs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/club/create", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createClubSchema.omit({ ownerId: true }).parse(req.body);
    const club = await storage.createClub({ ...data, ownerId: user.id });
    res.status(201).json(club);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/club/:clubId/teams", async (req, res) => {
  try {
    const teams = await storage.getClubTeams(req.params.clubId);
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/club/:clubId/team", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addClubTeamSchema.parse({ ...req.body, clubId: req.params.clubId });
    const club = await storage.getClub(data.clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });
    if (club.ownerId !== user.id) return res.status(403).json({ error: "Not authorized for this club" });
    const canManageTeam = await storage.userCanManageTeam(user.id, data.teamId);
    if (!canManageTeam) return res.status(403).json({ error: "You must captain or admin the team to link it" });
    const alreadyLinked = await storage.isClubTeamLinked(data.clubId, data.teamId);
    if (alreadyLinked) return res.status(409).json({ error: "Team is already linked to this club" });
    const clubTeam = await storage.addClubTeam(data);
    res.status(201).json(clubTeam);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.get("/club/:clubId/academy", async (req, res) => {
  try {
    const profiles = await storage.getAcademyProfiles(req.params.clubId);
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.post("/club/:clubId/academy/profile", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createAcademyProfileSchema.parse({ ...req.body, clubId: req.params.clubId });
    const profile = await storage.createAcademyProfile(data);
    res.status(201).json(profile);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proCategoriesRouter.patch("/academy/profile/:profileId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createAcademyProfileSchema.partial().parse(req.body);
    const profile = await storage.updateAcademyProfile(req.params.profileId, data);
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    res.json(profile);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});
