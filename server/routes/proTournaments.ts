// @ts-nocheck
import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { teams } from "@shared/schema";
import { storage } from "../storage";
import {
  createTournament,
  listTournaments,
  getTournament,
  getApprovedRegistrations,
  getAllRegistrations,
  registerTeam,
  generateFixtures,
  getFixtures,
  computeStandings,
  updateFixtureScore,
  getTeamMemberUserIds,
  markPrizeReleased,
  updateTournamentSettings,
  setRegistrationStatus,
  removeRegistration,
  validateTeamEligibility,
  listEligibleTeamsForUser,
  assertTournamentAccess,
  getTournamentAccess,
  getTournamentStaff,
  addTournamentStaff,
  removeTournamentStaff,
  listEligibleCoManagers,
  assertUserOnTeam,
  ensureOrganizerStaffRecord,
} from "../services/tournamentService";
import { DEFAULT_TOURNAMENT_SETTINGS } from "@shared/tournamentSport";
import { badgeDefinitions, userBadges } from "@shared/schema";
import { and } from "drizzle-orm";
import { getProSessionUserId, getProSessionUser } from "./proAuth";

const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_API_KEY ||
  "sk_test_placeholder";
const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion });

function getSessionUserId(req: any): string | null {
  return getProSessionUserId(req);
}

function unauthorized(res: any) {
  return res.status(401).json({ error: "Unauthorized" });
}

function forbidden(res: any, message: string) {
  return res.status(403).json({ error: message });
}

function permissionError(res: any, error: any) {
  const msg = error?.message || "Forbidden";
  if (msg.includes("permission") || msg.includes("access")) {
    return forbidden(res, msg);
  }
  return res.status(400).json({ error: msg });
}

async function tournamentDetailPayload(id: string, includePending = false) {
  const t = await getTournament(id);
  if (!t) return null;
  const registrations = includePending ? await getAllRegistrations(id) : await getApprovedRegistrations(id);
  const approved = await getApprovedRegistrations(id);
  const fixtures = await getFixtures(id);
  const standings = computeStandings(fixtures, approved);
  const pendingCount = (await getAllRegistrations(id)).filter((r) => r.status === "pending").length;
  return {
    ...t,
    registrations: includePending ? registrations : approved,
    approvedRegistrations: approved,
    pendingCount,
    spotsRemaining: Math.max(0, t.maxTeams - approved.length - pendingCount),
    fixtures,
    standings,
  };
}

const createTournamentSchema = z.object({
  name: z.string().min(1).max(120),
  sport: z.string().min(1).max(60),
  format: z.enum(["league", "knockout", "group_knockout"]),
  maxTeams: z.union([z.literal(4), z.literal(8), z.literal(16), z.literal(32)]),
  entryFeeEur: z.number().min(0),
  prizeDescription: z.string().max(2000).optional(),
  description: z.string().max(4000).optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  location: z.string().max(200).optional(),
  settings: z
    .object({
      autoApprove: z.boolean().optional(),
      captainOnly: z.boolean().optional(),
      minMembers: z.number().int().min(1).max(50).optional(),
      requirements: z.string().max(4000).optional(),
      welcomeMessage: z.string().max(2000).optional(),
      collectTeamGoals: z.boolean().optional(),
    })
    .optional(),
  teamId: z.string().min(1).optional(),
  coManagers: z
    .array(
      z.object({
        userId: z.string().min(1),
        role: z.enum(["admin", "operations", "scorekeeper"]),
        displayName: z.string().max(120).optional(),
      }),
    )
    .optional(),
});

const settingsPatchSchema = z.object({
  autoApprove: z.boolean().optional(),
  captainOnly: z.boolean().optional(),
  minMembers: z.number().int().min(1).max(50).optional(),
  requirements: z.string().max(4000).optional(),
  welcomeMessage: z.string().max(2000).optional(),
  collectTeamGoals: z.boolean().optional(),
  description: z.string().max(4000).optional(),
});

async function ensureTournamentWinnerBadge() {
  const [existing] = await db
    .select()
    .from(badgeDefinitions)
    .where(eq(badgeDefinitions.name, "tournament-winner"))
    .limit(1);
  if (existing) return existing.id;
  try {
    const [row] = await db
      .insert(badgeDefinitions)
      .values({
        name: "tournament-winner",
        description: "Won a SURNA tournament",
        category: "performance",
        tier: "gold",
        requirements: { type: "tournament_win" },
        isActive: true,
      })
      .returning();
    if (row) return row.id;
  } catch {
    /* unique */
  }
  const [again] = await db
    .select()
    .from(badgeDefinitions)
    .where(eq(badgeDefinitions.name, "tournament-winner"))
    .limit(1);
  return again?.id;
}

async function awardTournamentWinnerBadges(userIds: string[]) {
  const badgeId = await ensureTournamentWinnerBadge();
  if (!badgeId) return;
  for (const userId of userIds) {
    const [has] = await db
      .select()
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
      .limit(1);
    if (has) continue;
    try {
      const { gamificationService } = await import("../services/gamificationService");
      await gamificationService.awardBadge(userId, badgeId);
    } catch (e) {
      console.warn("[tournament] badge award failed for", userId, e);
    }
  }
}

async function releasePrizeEscrow(tournament: any) {
  if (tournament.prizeReleased || tournament.prizePoolCents <= 0) {
    return { released: false, reason: "no_pool" };
  }
  try {
    if (stripeSecretKey.includes("dummy") || stripeSecretKey.includes("placeholder")) {
      await markPrizeReleased(tournament.id);
      return { released: true, simulated: true };
    }
    await markPrizeReleased(tournament.id);
    return { released: true, amountCents: tournament.prizePoolCents };
  } catch (e: any) {
    console.error("[tournament] prize release error:", e);
    return { released: false, error: e.message };
  }
}

async function handleTournamentWinner(tournamentId: string, organizerUserId: string) {
  const tournament = await getTournament(tournamentId);
  if (!tournament?.winnerTeamId) return null;

  const content = `🏆 ${tournament.winnerTeamName} wins ${tournament.name}! ${tournament.prizeDescription || ""}`.trim();
  await storage.createPost(organizerUserId, {
    content,
    sport: tournament.sport,
    hashtags: ["tournament", "winner", tournament.name.replace(/\s+/g, "").toLowerCase()],
    visibility: "public",
  });

  const memberIds = await getTeamMemberUserIds(tournament.winnerTeamId);
  await awardTournamentWinnerBadges(memberIds);

  const prize = await releasePrizeEscrow(tournament);

  return {
    winnerTeamId: tournament.winnerTeamId,
    winnerTeamName: tournament.winnerTeamName,
    standings: computeStandings(await getFixtures(tournamentId), await getApprovedRegistrations(tournamentId)),
    prize,
  };
}

/** Public tournament routes — session required, Pro NOT required. */
export const tournamentPublicRouter = Router();

tournamentPublicRouter.get("/tournaments/:id", async (req, res) => {
  try {
    const payload = await tournamentDetailPayload(req.params.id, false);
    if (!payload) return res.status(404).json({ error: "Not found" });
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

tournamentPublicRouter.get("/tournaments/:id/eligible-teams", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    const teamsList = await listEligibleTeamsForUser(userId, t.sport);
    res.json(teamsList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

tournamentPublicRouter.post("/tournaments/:id/checkout", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const { teamId } = z.object({ teamId: z.string().min(1) }).parse(req.body);
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    await validateTeamEligibility(t, teamId, userId);
    const amountCents = Math.round(t.entryFeeEur * 100);
    if (amountCents <= 0) {
      return res.json({ freeEntry: true, amountCents: 0 });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "eur",
      metadata: {
        userId,
        teamId,
        tournamentId: t.id,
        paymentType: "tournament_entry",
      },
    });
    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
    res.status(400).json({ error: error.message });
  }
});

tournamentPublicRouter.post("/tournaments/:id/register", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const body = z
      .object({
        teamId: z.string().min(1),
        paymentIntentId: z.string().optional(),
        teamGoals: z.string().max(2000).optional(),
        notes: z.string().max(2000).optional(),
        contactEmail: z.string().email().optional().or(z.literal("")),
      })
      .parse(req.body);

    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });

    const { team } = await validateTeamEligibility(t, body.teamId, userId);

    if (t.entryFeeEur > 0 && body.paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(body.paymentIntentId);
      if (pi.status !== "succeeded" && pi.status !== "processing") {
        return res.status(402).json({ error: "Payment not completed" });
      }
      if (pi.metadata?.tournamentId !== t.id || pi.metadata?.teamId !== body.teamId) {
        return res.status(400).json({ error: "Payment does not match this registration" });
      }
    } else if (t.entryFeeEur > 0 && !body.paymentIntentId) {
      return res.status(402).json({ error: "Payment required" });
    }

    const reg = await registerTeam(req.params.id, body.teamId, team.name, {
      paymentIntentId: body.paymentIntentId,
      registeredByUserId: userId,
      teamGoals: body.teamGoals,
      notes: body.notes,
      contactEmail: body.contactEmail,
    });

    const approved = await getApprovedRegistrations(req.params.id);
    const pending = (await getAllRegistrations(req.params.id)).filter((r) => r.status === "pending");

    res.status(201).json({
      registration: reg,
      registrations: approved,
      status: reg.status,
      message:
        reg.status === "pending"
          ? "Application submitted — the organizer will review your entry."
          : "Team registered successfully!",
      spotsRemaining: Math.max(0, t.maxTeams - approved.length - pending.length),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
    res.status(400).json({ error: error.message });
  }
});

/** Organizer routes — require Pro (mounted after requireActivePro). */
export const tournamentRouter = Router();

tournamentRouter.post("/tournaments", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const data = createTournamentSchema.parse(req.body);
    const user = getProSessionUser(req);
    const organizerName =
      (user?.displayName as string) || (user?.username as string) || "Organizer";

    let hostingTeamName = "";
    if (data.teamId) {
      const [team] = await db.select().from(teams).where(eq(teams.id, data.teamId));
      if (!team) return res.status(400).json({ error: "Hosting team not found" });
      hostingTeamName = team.name;
      await assertUserOnTeam(userId, data.teamId);
    }

    const row = await createTournament({
      ...data,
      prizeDescription: data.prizeDescription || "",
      location: data.location || "",
      description: data.description || "",
      organizerUserId: userId,
      organizerName,
      teamId: data.teamId || null,
      hostingTeamName,
      coManagers: (data.coManagers || []).map((c) => ({
        userId: c.userId,
        role: c.role,
        displayName: c.displayName || "Co-manager",
      })),
      settings: { ...DEFAULT_TOURNAMENT_SETTINGS, ...(data.settings || {}) },
    });
    res.status(201).json(row);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    const msg = error?.message || "Failed to create tournament";
    if (msg.includes("member") || msg.includes("team") || msg.includes("Pro")) {
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: msg });
  }
});

tournamentRouter.get("/tournaments", async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    const mine = req.query.mine === "1" || req.query.mine === "true";
    const rows = await listTournaments(mine && userId ? userId : undefined);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

tournamentRouter.get("/tournaments/co-managers/:teamId", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const list = await listEligibleCoManagers(req.params.teamId);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

tournamentRouter.get("/tournaments/:id/manage", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    const access = await getTournamentAccess(userId, req.params.id);
    if (!access) return forbidden(res, "You do not have access to manage this tournament");
    await ensureOrganizerStaffRecord(req.params.id);
    const payload = await tournamentDetailPayload(req.params.id, true);
    const staff = await getTournamentStaff(req.params.id);
    res.json({ ...payload, access, staff });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

tournamentRouter.patch("/tournaments/:id/settings", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    await assertTournamentAccess(userId, req.params.id, "canSettings");
    const patch = settingsPatchSchema.parse(req.body);
    const updated = await updateTournamentSettings(req.params.id, patch);
    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
    return permissionError(res, error);
  }
});

tournamentRouter.get("/tournaments/:id/staff", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const access = await getTournamentAccess(userId, req.params.id);
    if (!access) return res.status(403).json({ error: "No access" });
    const staff = await getTournamentStaff(req.params.id);
    res.json({ staff, access });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

tournamentRouter.post("/tournaments/:id/staff", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const body = z
      .object({
        userId: z.string().min(1),
        role: z.enum(["admin", "operations", "scorekeeper"]),
        displayName: z.string().max(120).optional(),
      })
      .parse(req.body);
    const row = await addTournamentStaff(
      req.params.id,
      body.userId,
      body.role,
      body.displayName || "Co-manager",
      userId,
    );
    const staff = await getTournamentStaff(req.params.id);
    res.status(201).json({ staffMember: row, staff });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
    return permissionError(res, error);
  }
});

tournamentRouter.delete("/tournaments/:id/staff/:staffId", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    await removeTournamentStaff(req.params.id, req.params.staffId, userId);
    const staff = await getTournamentStaff(req.params.id);
    res.json({ staff });
  } catch (error: any) {
    return permissionError(res, error);
  }
});

tournamentRouter.post("/tournaments/:id/registrations/:regId/approve", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const reg = await setRegistrationStatus(req.params.id, req.params.regId, "approved", userId);
    const payload = await tournamentDetailPayload(req.params.id, true);
    res.json({ registration: reg, ...payload });
  } catch (error: any) {
    return permissionError(res, error);
  }
});

tournamentRouter.post("/tournaments/:id/registrations/:regId/reject", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const reg = await setRegistrationStatus(req.params.id, req.params.regId, "rejected", userId);
    const payload = await tournamentDetailPayload(req.params.id, true);
    res.json({ registration: reg, ...payload });
  } catch (error: any) {
    return permissionError(res, error);
  }
});

tournamentRouter.delete("/tournaments/:id/registrations/:regId", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    await removeRegistration(req.params.id, req.params.regId, userId);
    const payload = await tournamentDetailPayload(req.params.id, true);
    res.json(payload);
  } catch (error: any) {
    return permissionError(res, error);
  }
});

tournamentRouter.post("/tournaments/:id/generate-fixtures", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    await assertTournamentAccess(userId, req.params.id, "canFixtures");
    const fixtures = await generateFixtures(req.params.id);
    res.json({ fixtures });
  } catch (error: any) {
    return permissionError(res, error);
  }
});

tournamentRouter.patch("/tournaments/:id/fixtures/:fixtureId/score", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return unauthorized(res);
  try {
    const { homeScore, awayScore } = z
      .object({ homeScore: z.number().int().min(0), awayScore: z.number().int().min(0) })
      .parse(req.body);
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    await assertTournamentAccess(userId, req.params.id, "canScore");

    const result = await updateFixtureScore(req.params.id, req.params.fixtureId, homeScore, awayScore);

    const approved = await getApprovedRegistrations(req.params.id);
    const fixtures = await getFixtures(req.params.id);
    const standings = computeStandings(fixtures, approved);

    let celebration = null;
    if (result.winnerTriggered) {
      celebration = await handleTournamentWinner(req.params.id, t.organizerUserId);
    }

    res.json({
      fixture: result.fixture,
      tournament: result.tournament,
      fixtures,
      standings,
      celebration,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
    return permissionError(res, error);
  }
});

/** Legacy export for pro.ts — same as organizer router. */
export default tournamentRouter;
