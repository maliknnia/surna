// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Router } from "express";
import { z } from "zod";
import { sql, eq, and, desc, asc, gte, lte, inArray, ilike, ne, count } from "drizzle-orm";
import { storage } from "../storage";
import { db } from "../db";
import { teams, teamMembers, teamJoinRequests, events, users, eventParticipants } from "@shared/schema";
import {
  getUserEntitlement,
  isActiveProUserEntitlement,
  isProEntitlementOpenAccess,
  upsertUserEntitlement,
} from "../infrastructure/proEntitlements";
import { activateProFromCheckoutSession } from "../services/proSubscriptionSync";
import { messengerRepo } from "../features/messenger/messenger.repo";
import { proCategoriesRouter } from "./proCategories";
import { tournamentRouter, tournamentPublicRouter } from "./proTournaments";
import { transfersScoutRouter } from "./proTransfersScout";
import { attachProSessionUser, getProSessionUser, getProSessionUserId, resolveProUserId } from "./proAuth";
import { ensureProEntitlementTables } from "../infrastructure/proEntitlements";
import { sportsAlign } from "@shared/proSportProfiles";
import { requireActivePro } from "../middleware/requireActivePro";

export const proRouter = Router();

function mapProSquadRow(row: any) {
  const u = row.user || {};
  const positions = Array.isArray(row.positions) ? row.positions : [];
  return {
    id: row.id,
    userId: row.userId || u.id,
    name: u.displayName || u.username || "Player",
    position: positions[0] || u.sport || "—",
    number: row.jerseyNumber ?? undefined,
    status: (row.status as string) || "active",
    photoUrl: u.profileImageUrl || undefined,
  };
}

async function loadTeamEvents(teamId: string, range: "upcoming" | "past" | "all") {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return null;
  const now = new Date();
  const whereClause =
    range === "upcoming"
      ? and(eq(events.organizerId, team.captainId), gte(events.startDate, now))
      : range === "past"
        ? and(eq(events.organizerId, team.captainId), lte(events.startDate, now))
        : eq(events.organizerId, team.captainId);
  const rows = await db
    .select()
    .from(events)
    .where(whereClause)
    .orderBy(range === "past" ? desc(events.startDate) : asc(events.startDate))
    .limit(60);
  const filtered = rows.filter((ev) => sportsAlign(team.sport || "", ev.sport));
  const ids = filtered.map((e) => e.id);
  const attendeeCounts: Record<string, number> = {};
  if (ids.length > 0) {
    const parts = await db
      .select({ eventId: eventParticipants.eventId, c: count() })
      .from(eventParticipants)
      .where(inArray(eventParticipants.eventId, ids))
      .groupBy(eventParticipants.eventId);
    for (const p of parts) {
      attendeeCounts[p.eventId] = Number(p.c || 0);
    }
  }
  return { team, rows: filtered, attendeeCounts };
}

function mapScheduleEvent(ev: any, teamName: string, attendeeCounts: Record<string, number>) {
  const start = ev.startDate ? new Date(ev.startDate) : null;
  const isoDate = start ? start.toISOString().slice(0, 10) : "";
  const attendees = attendeeCounts[ev.id] ?? 0;
  const capacity = ev.maxParticipants ?? 22;
  let status: "draft" | "published" | "filling" | "full" | "cancelled" = "published";
  if (!ev.approved) status = "draft";
  else if (capacity > 0 && attendees >= capacity) status = "full";
  else if (capacity > 0 && attendees / capacity >= 0.7) status = "filling";
  return {
    id: ev.id,
    title: ev.title || "Event",
    team: teamName,
    date: start ? start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "",
    isoDate,
    time: start ? start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "",
    venue: ev.location || "TBC",
    attendees,
    capacity,
    status,
    visibility: ev.isPublic === false ? ("private" as const) : ("public" as const),
    sport: ev.sport,
    eventType: ev.eventType,
    opponent: ev.title?.replace(/^vs\s+/i, "") || ev.title || "TBC",
    competition: ev.eventType || "Event",
    homeAway: "Home" as const,
    matchStatus: "scheduled" as const,
  };
}

// Pro routes do not use isAuthenticated per-handler; align session → req.user first.
proRouter.use(attachProSessionUser);

// Entitlement first (before sub-routers) so local dev session is always recognized.
proRouter.get("/user/entitlement", async (req, res) => {
  try {
    const userId = resolveProUserId(req);
    if (!userId) return unauthorized(res);

    await ensureProEntitlementTables().catch(() => {});

    let ent = await getUserEntitlement(userId);
    if (isProEntitlementOpenAccess()) {
      try {
        if (!ent || !isActiveProUserEntitlement(ent)) {
          ent = await upsertUserEntitlement({ userId, plan: "pro" });
        }
      } catch (upsertErr: any) {
        console.warn("[pro] entitlement upsert failed:", upsertErr?.message || upsertErr);
      }
      return res.json({
        plan: ent?.plan ?? "pro",
        active: true,
        maxTeams: ent?.maxTeams ?? 10,
        features: ent?.features ?? {},
        entitlement: ent,
        openAccess: true,
      });
    }

    const active = isActiveProUserEntitlement(ent);
    res.json({
      plan: ent?.plan ?? "free",
      active,
      maxTeams: ent?.maxTeams ?? 1,
      features: ent?.features ?? {},
      entitlement: ent,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.post("/user/entitlement/activate", async (req, res) => {
  try {
    const userId = resolveProUserId(req);
    if (!userId) return unauthorized(res);

    const sessionId = String(req.body?.sessionId || "");
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const result = await activateProFromCheckoutSession(sessionId, userId);
    res.json({ ...result, openAccess: false });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Activation failed" });
  }
});

proRouter.use(tournamentPublicRouter);

proRouter.use(requireActivePro);

proRouter.use(proCategoriesRouter);
proRouter.use(tournamentRouter);
proRouter.use(transfersScoutRouter);

function getUser(req: any) {
  return getProSessionUser(req);
}

function getSessionUserId(req: any): string | null {
  return getProSessionUserId(req);
}

function unauthorized(res: any) {
  return res.status(401).json({ error: "Unauthorized" });
}

// ═══════════════════════════════════════════════════════════
// PRO BASE LAYER — Roles, Permissions, Audit, Settings
// ═══════════════════════════════════════════════════════════

const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  permissions: z.array(z.string()).default([]),
  isDefault: z.boolean().optional(),
});

const assignRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

const settingsSchema = z.object({
  locale: z.string().max(10).optional(),
  defaultFormation: z.string().max(20).optional(),
  notificationRules: z.record(z.any()).optional(),
  proTier: z.string().optional(),
  enabledModules: z.array(z.string()).optional(),
});

proRouter.get("/team/:teamId/roles", async (req, res) => {
  try {
    const roles = await storage.getProTeamRoles(req.params.teamId);
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.post("/team/:teamId/roles", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createRoleSchema.parse(req.body);
    const role = await storage.createProTeamRole(req.params.teamId, data);
    await storage.logProAudit(req.params.teamId, user.id, "role.create", { entity: "role", entityId: role.id, after: data });
    res.status(201).json(role);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proRouter.patch("/team/:teamId/roles/:roleId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = createRoleSchema.partial().parse(req.body);
    const role = await storage.updateProTeamRole(req.params.roleId, data);
    if (!role) return res.status(404).json({ error: "Role not found" });
    await storage.logProAudit(req.params.teamId, user.id, "role.update", { entity: "role", entityId: req.params.roleId, after: data });
    res.json(role);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proRouter.delete("/team/:teamId/roles/:roleId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    await storage.deleteProTeamRole(req.params.roleId);
    await storage.logProAudit(req.params.teamId, user.id, "role.delete", { entity: "role", entityId: req.params.roleId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.post("/team/:teamId/role/assign", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const { userId, roleId } = assignRoleSchema.parse(req.body);
    const member = await storage.assignProRole(req.params.teamId, userId, roleId, user.id);
    await storage.logProAudit(req.params.teamId, user.id, "role.assign", { entity: "roleMember", entityId: member.id, after: { userId, roleId } });
    res.json(member);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proRouter.delete("/team/:teamId/role/remove", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const { userId, roleId } = assignRoleSchema.parse(req.body);
    await storage.removeProRole(req.params.teamId, userId, roleId);
    await storage.logProAudit(req.params.teamId, user.id, "role.remove", { entity: "roleMember", after: { userId, roleId } });
    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/members", async (req, res) => {
  try {
    const members = await storage.getProTeamRoleMembers(req.params.teamId);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/permissions", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const role = await storage.getUserProRole(req.params.teamId, user.id);
    if (!role) return res.json({ permissions: [] });
    const roles = await storage.getProTeamRoles(req.params.teamId);
    const userRole = roles.find(r => r.id === role.roleId);
    res.json({ permissions: userRole?.permissions || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PRO_ROLE_SLUGS = ["owner", "admin", "coach", "manager", "member"] as const;
type ProRoleSlug = (typeof PRO_ROLE_SLUGS)[number];

function normalizeProRoleSlug(name: string | null | undefined, isCaptain: boolean): ProRoleSlug {
  const n = (name || "").trim().toLowerCase();
  if ((PRO_ROLE_SLUGS as readonly string[]).includes(n)) return n as ProRoleSlug;
  if (n.includes("owner") || isCaptain) return "owner";
  if (n.includes("admin")) return "admin";
  if (n.includes("coach")) return "coach";
  if (n.includes("manager")) return "manager";
  return "member";
}

proRouter.get("/team/:teamId/my-role", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const [teamRow] = await db
      .select({ captainId: teams.captainId })
      .from(teams)
      .where(eq(teams.id, req.params.teamId))
      .limit(1);
    if (!teamRow) return res.status(404).json({ error: "Team not found" });

    const membership = await storage.getUserProRole(req.params.teamId, user.id);
    let role: ProRoleSlug = "member";

    if (membership) {
      const roles = await storage.getProTeamRoles(req.params.teamId);
      const userRole = roles.find((r) => r.id === membership.roleId);
      role = normalizeProRoleSlug(userRole?.name, false);
    } else if (teamRow.captainId === user.id) {
      role = "owner";
    }

    console.log("[Fix 7] Pro role verified from database:", role, "user", user.id, "team", req.params.teamId);
    res.json({ role });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/audit", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const logs = await storage.getProAuditLogs(req.params.teamId, limit, offset);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/settings", async (req, res) => {
  try {
    const settings = await storage.getProTeamSettings(req.params.teamId);
    res.json(settings || { proTier: 'basic', enabledModules: [], locale: 'en' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.put("/team/:teamId/settings", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = settingsSchema.parse(req.body);
    const settings = await storage.upsertProTeamSettings(req.params.teamId, data);
    await storage.logProAudit(req.params.teamId, user.id, "settings.update", { entity: "settings", after: data });
    res.json(settings);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// TEAM MANAGEMENT — Roster, Staff, Documents, Equipment
// ═══════════════════════════════════════════════════════════

const addPlayerSchema = z.object({
  userId: z.string().min(1),
  jerseyNumber: z.number().int().min(0).max(999).optional(),
  positions: z.array(z.string()).optional(),
  status: z.enum(["active", "injured", "suspended", "reserve", "inactive"]).optional(),
  preferredFoot: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  nationality: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

const addStaffSchema = z.object({
  userId: z.string().min(1),
  staffType: z.string().min(1),
  title: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});

const addDocSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  fileUrl: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

const issueEquipmentSchema = z.object({
  userId: z.string().min(1),
  itemName: z.string().min(1).max(200),
  category: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  condition: z.string().optional(),
  notes: z.string().max(500).optional(),
});

proRouter.get("/team/:teamId/roster", async (req, res) => {
  try {
    const roster = await storage.getProRoster(req.params.teamId);
    res.json(roster);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.post("/team/:teamId/player/add", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addPlayerSchema.parse(req.body);
    const player = await storage.addProPlayer(req.params.teamId, data);
    await storage.logProAudit(req.params.teamId, user.id, "player.add", { entity: "player", entityId: player.id, after: data });
    res.status(201).json(player);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proRouter.patch("/team/:teamId/player/:playerId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addPlayerSchema.partial().parse(req.body);
    const player = await storage.updateProPlayer(req.params.playerId, data);
    if (!player) return res.status(404).json({ error: "Player not found" });
    await storage.logProAudit(req.params.teamId, user.id, "player.update", { entity: "player", entityId: req.params.playerId, after: data });
    res.json(player);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proRouter.delete("/team/:teamId/player/:playerId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    await storage.removeProPlayer(req.params.playerId);
    await storage.logProAudit(req.params.teamId, user.id, "player.remove", { entity: "player", entityId: req.params.playerId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/staff", async (req, res) => {
  try {
    const staff = await storage.getProStaff(req.params.teamId);
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.post("/team/:teamId/staff/add", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addStaffSchema.parse(req.body);
    const staff = await storage.addProStaff(req.params.teamId, data);
    await storage.logProAudit(req.params.teamId, user.id, "staff.add", { entity: "staff", entityId: staff.id, after: data });
    res.status(201).json(staff);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proRouter.delete("/team/:teamId/staff/:staffId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    await storage.removeProStaff(req.params.staffId);
    await storage.logProAudit(req.params.teamId, user.id, "staff.remove", { entity: "staff", entityId: req.params.staffId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/docs", async (req, res) => {
  try {
    const docs = await storage.getProDocuments(req.params.teamId);
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.post("/team/:teamId/docs/upload", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = addDocSchema.parse(req.body);
    const doc = await storage.addProDocument(req.params.teamId, { ...data, uploadedBy: user.id });
    await storage.logProAudit(req.params.teamId, user.id, "doc.upload", { entity: "document", entityId: doc.id, after: data });
    res.status(201).json(doc);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proRouter.delete("/team/:teamId/docs/:docId", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    await storage.deleteProDocument(req.params.docId);
    await storage.logProAudit(req.params.teamId, user.id, "doc.delete", { entity: "document", entityId: req.params.docId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/equipment", async (req, res) => {
  try {
    const equipment = await storage.getProEquipment(req.params.teamId);
    res.json(equipment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Alias for ProInventory UI */
proRouter.get("/team/:teamId/inventory", async (req, res) => {
  try {
    const equipment = await storage.getProEquipment(req.params.teamId);
    res.json(equipment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.post("/team/:teamId/equipment/issue", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const data = issueEquipmentSchema.parse(req.body);
    const item = await storage.issueProEquipment(req.params.teamId, data);
    await storage.logProAudit(req.params.teamId, user.id, "equipment.issue", { entity: "equipment", entityId: item.id, after: data });
    res.status(201).json(item);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proRouter.post("/team/:teamId/equipment/:issuedId/return", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    await storage.returnProEquipment(req.params.issuedId);
    await storage.logProAudit(req.params.teamId, user.id, "equipment.return", { entity: "equipment", entityId: req.params.issuedId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// Pro SPA — teams, dashboard, match-day, broadcast
// ═══════════════════════════════════════════════════════════

proRouter.get("/teams", async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return unauthorized(res);
    const owned = await db.select().from(teams).where(eq(teams.captainId, userId));
    const memberRows = await db.select({ teamId: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.userId, userId));
    const idSet = new Set<string>([...owned.map((t) => t.id), ...memberRows.map((m) => m.teamId)]);
    if (idSet.size === 0) {
      return res.json([]);
    }
    const allTeams = await db.select().from(teams).where(inArray(teams.id, [...idSet]));
    const now = new Date();
    const list = await Promise.all(
      allTeams.map(async (t) => {
        const evRows = await db
          .select()
          .from(events)
          .where(and(eq(events.organizerId, t.captainId), gte(events.startDate, now)))
          .limit(50);
        const eventCount = evRows.filter((ev) => sportsAlign(t.sport || "", ev.sport)).length;
        return {
          id: t.id,
          name: t.name,
          sport: t.sport || "",
          location: t.location || t.city || "",
          members: t.currentMembers ?? 0,
          events: eventCount,
          status: "active" as const,
          rating: Number(t.rating) || 0,
        };
      }),
    );
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/dashboard", async (req, res) => {
  try {
    const { teamId } = req.params;
    const [pendingRow] = await db
      .select({ c: count() })
      .from(teamJoinRequests)
      .where(and(eq(teamJoinRequests.teamId, teamId), eq(teamJoinRequests.status, "pending")));
    const pending = Number(pendingRow?.c || 0);
    const roster = await storage.getProRoster(teamId);
    const logs = await storage.getProAuditLogs(teamId, 5, 0);
    const items: any[] = [];
    if (pending > 0) {
      items.push({
        id: "approvals",
        tone: "urgent",
        iconKey: "userPlus",
        title: `${pending} membership request${pending === 1 ? "" : "s"} waiting for review`,
        sub: "Review join requests from the roster tab.",
        cta: "Review",
        href: "/pro/roster",
        count: pending,
      });
    }
    if (logs.length > 0) {
      items.push({
        id: "activity",
        tone: "info",
        iconKey: "bell",
        title: "Recent club activity",
        sub: `${logs[0].action || "update"} — audit trail available.`,
        cta: "View activity",
        href: "/pro/activity",
      });
    }
    if (roster.length > 0) {
      items.push({
        id: "roster",
        tone: "info",
        iconKey: "users",
        title: `${roster.length} player${roster.length === 1 ? "" : "s"} on roster`,
        sub: "Keep squad details and availability up to date.",
        cta: "Open roster",
        href: "/pro/roster",
        count: roster.length,
      });
    }
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/stats", async (req, res) => {
  try {
    const { teamId } = req.params;
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team) return res.status(404).json({ error: "Team not found" });
    const roster = await storage.getProRoster(teamId);
    const [pendingJoinRow] = await db
      .select({ c: count() })
      .from(teamJoinRequests)
      .where(and(eq(teamJoinRequests.teamId, teamId), eq(teamJoinRequests.status, "pending")));
    const [upRow] = await db
      .select({ c: count() })
      .from(events)
      .where(and(eq(events.organizerId, team.captainId), gte(events.startDate, new Date())));
    res.json({
      members: roster.length,
      events: Number(upRow?.c || 0),
      pending: Number(pendingJoinRow?.c || 0),
      messages: 0,
      visits: "—",
      engage: "—",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/matches", async (req, res) => {
  try {
    const range = (req.query.range as string) === "past" ? "past" : "upcoming";
    const loaded = await loadTeamEvents(req.params.teamId, range);
    if (!loaded) return res.status(404).json({ error: "Team not found" });
    const mapped = loaded.rows.map((ev) => {
      const row = mapScheduleEvent(ev, loaded.team.name, loaded.attendeeCounts);
      return {
        id: row.id,
        opponent: row.opponent,
        date: row.date,
        time: row.time,
        venue: row.venue,
        competition: row.competition,
        homeAway: row.homeAway,
        status: row.matchStatus,
      };
    });
    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/events", async (req, res) => {
  try {
    const q = (req.query.range as string) || "all";
    const range = q === "past" || q === "upcoming" ? q : "all";
    const loaded = await loadTeamEvents(req.params.teamId, range);
    if (!loaded) return res.status(404).json({ error: "Team not found" });
    res.json(loaded.rows.map((ev) => mapScheduleEvent(ev, loaded.team.name, loaded.attendeeCounts)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/team/:teamId/squad", async (req, res) => {
  try {
    const roster = await storage.getProRoster(req.params.teamId);
    res.json(roster.map(mapProSquadRow));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

proRouter.post("/team/:teamId/tactical-broadcast", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const userId = getSessionUserId(req)!;
    const { teamId } = req.params;
    const body = z
      .object({
        message: z.string().min(1).max(4000),
        formationName: z.string().optional(),
        slots: z.record(z.string()).optional(),
        formationPayload: z.any().optional(),
        playerNotes: z.record(z.string()).optional(),
      })
      .parse(req.body);
    const roster = await storage.getProRoster(teamId);
    let sent = 0;
    const formationPrefix = body.formationPayload
      ? `__SURNA_FORMATION__${JSON.stringify(body.formationPayload)}`
      : null;
    const notesByUserId = (body.formationPayload?.notesByUserId || {}) as Record<string, string>;
    let extra = "";
    if (body.formationName) extra += `\nFormation: ${body.formationName}`;
    if (body.slots && Object.keys(body.slots).length) {
      extra += `\nAssignments:\n${Object.entries(body.slots).map(([k, v]) => `${k}: ${v}`).join("\n")}`;
    }
    const baseText = `${body.message}${extra}`;
    for (const row of roster as any[]) {
      const peerId = row.userId || row.user?.id;
      if (!peerId || peerId === userId) continue;
      const playerName = row.user?.displayName || row.user?.username || "";
      const noteText =
        notesByUserId[peerId] ||
        (body.playerNotes && playerName && body.playerNotes[playerName]) ||
        "";
      const personalNote = noteText ? `\n\nYour note: ${noteText}` : "";
      const text = formationPrefix
        ? formationPrefix + (personalNote ? `\n__SURNA_PLAYER_NOTE__${personalNote.trim()}` : "")
        : baseText + personalNote;
      const conv = await messengerRepo.ensureDMConversation(userId, peerId);
      await messengerRepo.createDMMessage({
        conversation_id: conv.id,
        sender_id: userId,
        kind: "text",
        body: text,
      });
      sent++;
    }
    await storage.logProAudit(teamId, userId, "tactical.broadcast", { entity: "messenger", after: { recipients: sent } });
    res.json({ success: true, sent });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proRouter.post("/team/:teamId/squad-broadcast", async (req, res) => {
  const user = getUser(req);
  if (!user) return unauthorized(res);
  try {
    const userId = getSessionUserId(req)!;
    const { teamId } = req.params;
    const { message } = z.object({ message: z.string().min(1).max(4000) }).parse(req.body);
    const roster = await storage.getProRoster(teamId);
    let sent = 0;
    for (const row of roster as any[]) {
      const peerId = row.userId || row.user?.id;
      if (!peerId || peerId === userId) continue;
      const conv = await messengerRepo.ensureDMConversation(userId, peerId);
      await messengerRepo.createDMMessage({
        conversation_id: conv.id,
        sender_id: userId,
        kind: "text",
        body: `[Team broadcast]\n${message}`,
      });
      sent++;
    }
    await storage.logProAudit(teamId, userId, "squad.broadcast", { entity: "messenger", after: { recipients: sent } });
    res.json({ success: true, sent });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
    res.status(500).json({ error: error.message });
  }
});

proRouter.get("/player-search", async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return unauthorized(res);
    const sport = typeof req.query.sport === "string" ? req.query.sport : undefined;
    const position = typeof req.query.position === "string" ? req.query.position : undefined;
    const location = typeof req.query.location === "string" ? req.query.location : undefined;
    const limit = Math.min(parseInt(String(req.query.limit || "30"), 10) || 30, 100);
    const filters: any[] = [eq(users.banned, false), ne(users.id, userId)];
    if (sport) filters.push(ilike(users.sport, `%${sport}%`));
    if (position) filters.push(ilike(users.position, `%${position}%`));
    if (location) filters.push(ilike(users.location, `%${location}%`));
    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        profileImageUrl: users.profileImageUrl,
        sport: users.sport,
        position: users.position,
        skillLevel: users.skillLevel,
        location: users.location,
        bio: users.bio,
      })
      .from(users)
      .where(and(...filters))
      .limit(limit);
    res.json({ users: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
