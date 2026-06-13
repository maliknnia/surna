import { sql, eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { ensurePhase8ProfileTables } from "../infrastructure/phase8Profile";
import { distanceMetres } from "./sportChallengeRules";

export type ProfileType = "normal" | "professional";
export type NudgeMilestone = "first_team_join" | "first_challenge_win" | "ten_activities" | "three_profile_views";

const NUDGE_MESSAGE: Record<NudgeMilestone, string> = {
  first_team_join: "You joined your first team — complete your professional profile so teammates know your game.",
  first_challenge_win: "First win! Add sport details to stand out on SURNA.",
  ten_activities: "10 activities logged — unlock your full professional profile.",
  three_profile_views: "Your profile is getting noticed — add professional details to convert views into connections.",
};

export async function setProfilePath(userId: string, profileType: ProfileType, skipSetup = false) {
  await ensurePhase8ProfileTables();
  const { parseUserProfile } = await import("@shared/userProfile");
  const { mergeUserProfile } = await import("../lib/userProfile");
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row) throw new Error("User not found");

  const current = parseUserProfile(row.profileJson, row);
  const nextProfile = mergeUserProfile(current, {
    profilePathChosenAt: new Date().toISOString(),
    ...(skipSetup ? { onboardingSkipped: true, profileSetupCompletedAt: new Date().toISOString() } : {}),
  });

  await db
    .update(users)
    .set({
      profileType,
      profileJson: nextProfile,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  console.log("[Phase8-1] Profile path set:", userId, profileType, skipSetup ? "quick" : "pro");
  return { profileType, onboardingSkipped: skipSetup };
}

export type SportIdentityPatch = {
  primarySport?: string;
  position?: string;
  preferredFoot?: string;
  clubHistory?: string;
  gaaCode?: string;
  gaaCounty?: string;
  gaaClub?: string;
  heightCm?: number;
  weightClass?: string;
  fightRecordWins?: number;
  fightRecordLosses?: number;
  fightRecordDraws?: number;
  fightRecordKos?: number;
  stance?: string;
  amateurOrPro?: string;
  iabaNumber?: string;
  medicalClearanceExpiry?: string;
  gymAffiliation?: string;
};

function normalizeSport(s?: string): string {
  return (s ?? "").toLowerCase().trim();
}

export async function updateSportIdentity(userId: string, patch: SportIdentityPatch) {
  await ensurePhase8ProfileTables();
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row) throw new Error("User not found");

  const sport = normalizeSport(patch.primarySport ?? row.primarySport ?? row.sport ?? "");
  const identity = { ...((row.sportIdentity as Record<string, unknown>) ?? {}) };
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (patch.primarySport) {
    updates.primarySport = patch.primarySport;
    updates.sport = patch.primarySport;
  }
  if (patch.position !== undefined) updates.position = patch.position;

  const s = normalizeSport(patch.primarySport ?? String(row.primarySport ?? ""));

  if (s.includes("football") || s.includes("soccer")) {
    if (patch.preferredFoot !== undefined) updates.preferredFoot = patch.preferredFoot;
    if (patch.clubHistory !== undefined) updates.clubHistory = patch.clubHistory;
    identity.football = {
      ...(identity.football as object),
      preferredFoot: patch.preferredFoot,
      clubHistory: patch.clubHistory,
    };
  }

  if (s.includes("gaa") || s.includes("hurling") || s.includes("camogie") || s.includes("gaelic")) {
    identity.gaa = {
      ...(identity.gaa as object),
      code: patch.gaaCode,
      county: patch.gaaCounty,
      club: patch.gaaClub,
      position: patch.position,
    };
  }

  if (s.includes("box")) {
    if (patch.weightClass !== undefined) updates.weightClass = patch.weightClass;
    if (patch.fightRecordWins !== undefined) updates.fightRecordWins = patch.fightRecordWins;
    if (patch.fightRecordLosses !== undefined) updates.fightRecordLosses = patch.fightRecordLosses;
    if (patch.fightRecordDraws !== undefined) updates.fightRecordDraws = patch.fightRecordDraws;
    if (patch.fightRecordKos !== undefined) updates.fightRecordKos = patch.fightRecordKos;
    if (patch.stance !== undefined) updates.stance = patch.stance;
    if (patch.amateurOrPro !== undefined) updates.amateurOrPro = patch.amateurOrPro;
    if (patch.iabaNumber !== undefined) updates.iabaNumber = patch.iabaNumber;
    if (patch.gymAffiliation !== undefined) updates.gymAffiliation = patch.gymAffiliation;
    if (patch.medicalClearanceExpiry !== undefined) {
      updates.medicalClearanceExpiry = new Date(patch.medicalClearanceExpiry);
    }
  }

  if (s.includes("basketball") || s.includes("volleyball")) {
    if (patch.heightCm !== undefined) updates.heightCm = patch.heightCm;
    const key = s.includes("volleyball") ? "volleyball" : "basketball";
    identity[key] = { position: patch.position, heightCm: patch.heightCm };
  }

  updates.sportIdentity = identity;

  const { parseUserProfile } = await import("@shared/userProfile");
  const { mergeUserProfile } = await import("../lib/userProfile");
  const nextProfile = mergeUserProfile(parseUserProfile(row.profileJson, row), {
    profileSetupCompletedAt: new Date().toISOString(),
  });
  updates.profileJson = nextProfile;

  await db.update(users).set(updates).where(eq(users.id, userId));
  console.log("[Phase8-2] Sport identity updated:", userId, sport);
  return { ok: true, sport, sportIdentity: identity };
}

async function shouldNudge(userId: string): Promise<boolean> {
  const [row] = await db.select({ profileType: users.profileType }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.profileType !== "professional";
}

export async function triggerNudgeIfNeeded(userId: string, milestone: NudgeMilestone): Promise<{ nudge: boolean; message?: string }> {
  await ensurePhase8ProfileTables();
  if (!(await shouldNudge(userId))) return { nudge: false };

  const existing = await db.execute(sql`
    SELECT milestone FROM profile_nudge_milestones
    WHERE user_id = ${userId} AND milestone = ${milestone}
    LIMIT 1
  `);
  if (existing.rows.length > 0) return { nudge: false };

  await db.execute(sql`
    INSERT INTO profile_nudge_milestones (user_id, milestone)
    VALUES (${userId}, ${milestone})
    ON CONFLICT DO NOTHING
  `);

  console.log("[Phase8-3] Professional profile nudge:", userId, milestone);
  return { nudge: true, message: NUDGE_MESSAGE[milestone] };
}

export async function recordProfileView(profileUserId: string, viewerId?: string | null) {
  await ensurePhase8ProfileTables();
  if (viewerId && viewerId === profileUserId) return;

  await db.execute(sql`
    INSERT INTO profile_view_events (profile_user_id, viewer_id)
    VALUES (${profileUserId}, ${viewerId ?? null})
  `);

  const count = await db.execute(sql`
    SELECT COUNT(*)::int AS c
    FROM profile_view_events
    WHERE profile_user_id = ${profileUserId} AND viewer_id IS NOT NULL
  `);
  const views = Number((count.rows[0] as { c: number })?.c ?? 0);
  if (views >= 3) {
    await triggerNudgeIfNeeded(profileUserId, "three_profile_views");
  }
}

export async function getActiveNudges(userId: string) {
  await ensurePhase8ProfileTables();
  const rows = await db.execute(sql`
    SELECT milestone, triggered_at, dismissed_at
    FROM profile_nudge_milestones
    WHERE user_id = ${userId} AND dismissed_at IS NULL
    ORDER BY triggered_at DESC
  `);
  return (rows.rows as { milestone: NudgeMilestone; triggered_at: string }[]).map((r) => ({
    milestone: r.milestone,
    message: NUDGE_MESSAGE[r.milestone],
    triggeredAt: r.triggered_at,
  }));
}

export async function dismissNudge(userId: string, milestone: NudgeMilestone) {
  await ensurePhase8ProfileTables();
  await db.execute(sql`
    UPDATE profile_nudge_milestones SET dismissed_at = now()
    WHERE user_id = ${userId} AND milestone = ${milestone}
  `);
  return { ok: true };
}

function parseLocation(location?: string): { lat?: number; lng?: number; city?: string } {
  if (!location) return {};
  const parts = location.split(",").map((p) => p.trim());
  if (parts.length >= 2 && !Number.isNaN(Number(parts[0])) && !Number.isNaN(Number(parts[1]))) {
    return { lat: Number(parts[0]), lng: Number(parts[1]) };
  }
  return { city: location };
}

export type DiscoveryResult = {
  id: string;
  type: "coach" | "referee" | "venue";
  name: string;
  sport?: string;
  rating: number | null;
  distanceKm: number | null;
  availability: string | null;
  location?: string | null;
  bookingUrl: string;
};

export async function searchCoaches(params: { sport?: string; location?: string; limit?: number }) {
  await ensurePhase8ProfileTables();
  const { storage } = await import("../storage");
  const loc = parseLocation(params.location);
  const list = await storage.getCoaches(params.limit ?? 20, 0, params.sport);

  const results: DiscoveryResult[] = list.map((c) => ({
    id: c.id,
    type: "coach" as const,
    name: c.user?.displayName ?? c.user?.firstName ?? "Coach",
    sport: params.sport ?? c.user?.sport ?? undefined,
    rating: c.isVerified ? 4.8 : 4.2,
    distanceKm: null,
    availability: c.weeklyAvailability ? "Weekly slots" : "Contact for availability",
    location: c.user?.location ?? null,
    bookingUrl: `/coaches/${c.id}`,
  }));

  if (loc.city) {
    const cityLower = loc.city.toLowerCase();
    return results.filter((r) => !r.location || r.location.toLowerCase().includes(cityLower));
  }
  console.log("[Phase8-4] Coaches search:", results.length, params.sport, params.location);
  return results;
}

export async function searchReferees(params: { sport?: string; location?: string; limit?: number }) {
  await ensurePhase8ProfileTables();
  const { listReferees } = await import("./phase6SportService");
  const loc = parseLocation(params.location);
  const rows = await listReferees({
    sport: params.sport,
    lat: loc.lat,
    lng: loc.lng,
    limit: params.limit ?? 20,
  });

  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    type: "referee" as const,
    name: String(r.display_name ?? "Referee"),
    sport: params.sport,
    rating: 4.5,
    distanceKm: r.distanceKm != null ? Number(r.distanceKm) : null,
    availability: r.availability ? "See profile" : "Available",
    location: r.location ? String(r.location) : null,
    bookingUrl: `/messages?referee=${r.id}`,
  })) satisfies DiscoveryResult[];
}

export async function searchVenues(params: { sport?: string; location?: string; limit?: number }) {
  await ensurePhase8ProfileTables();
  const { storage } = await import("../storage");
  const loc = parseLocation(params.location);
  const filters: { sport?: string; city?: string } = {};
  if (params.sport) filters.sport = params.sport;
  if (loc.city) filters.city = loc.city;

  const venueList = await storage.getPlaces(filters, params.limit ?? 20, 0);

  return (venueList as Array<Record<string, unknown>>).map((p) => {
    let distanceKm: number | null = null;
    if (loc.lat != null && loc.lng != null && p.latitude != null && p.longitude != null) {
      distanceKm =
        Math.round(
          (distanceMetres(loc.lat, loc.lng, Number(p.latitude), Number(p.longitude)) / 1000) * 10,
        ) / 10;
    }
    return {
      id: String(p.id),
      type: "venue" as const,
      name: String(p.name ?? "Venue"),
      sport: params.sport ?? (Array.isArray(p.sports) ? String(p.sports[0]) : undefined),
      rating: p.averageRating != null ? Number(p.averageRating) : null,
      distanceKm,
      availability: "Book via venue profile",
      location: p.city ? String(p.city) : null,
      bookingUrl: `/place/${p.id}`,
    } satisfies DiscoveryResult;
  });
}
