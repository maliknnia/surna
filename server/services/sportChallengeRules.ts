import { sql, eq } from "drizzle-orm";
import { db } from "../db";
import { teams } from "@shared/schema";

export type ChallengeType = "open" | "structured" | "contact";

const OPEN_SPORTS = ["basketball", "volleyball"];
const STRUCTURED_SPORTS = ["football", "soccer", "gaa", "gaelic football", "hurling", "camogie"];
const CONTACT_SPORTS = ["boxing"];

const STRUCTURED_TEAM_SIZES: Record<string, number> = {
  football: 11,
  soccer: 11,
  gaa: 15,
  "gaelic football": 15,
  hurling: 15,
  camogie: 15,
};

export function resolveChallengeType(sport: string): ChallengeType {
  const s = sport.toLowerCase().trim();
  if (CONTACT_SPORTS.some((x) => s.includes(x))) return "contact";
  if (STRUCTURED_SPORTS.some((x) => s.includes(x))) return "structured";
  if (OPEN_SPORTS.some((x) => s.includes(x))) return "open";
  return "open";
}

export function parseWeightKg(weightClass: string | null | undefined): number | null {
  if (!weightClass) return null;
  const m = String(weightClass).match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function expectedTeamSize(sport: string, teamMaxMembers: number | null): number {
  const s = sport.toLowerCase().trim();
  for (const [key, size] of Object.entries(STRUCTURED_TEAM_SIZES)) {
    if (s.includes(key)) return size;
  }
  return teamMaxMembers ?? 0;
}

async function getUserBoxingProfile(userId: string) {
  const row = await db.execute(sql`
    SELECT weight_class, medical_clearance_expiry
    FROM users WHERE id = ${userId} LIMIT 1
  `);
  return (row.rows[0] as { weight_class?: string; medical_clearance_expiry?: Date | string | null }) ?? null;
}

async function getTeamSize(teamId: string, sport: string): Promise<number> {
  const [team] = await db
    .select({ currentMembers: teams.currentMembers, maxMembers: teams.maxMembers })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) throw new Error("Team not found");
  const explicit = expectedTeamSize(sport, team.maxMembers);
  return explicit > 0 ? explicit : team.currentMembers ?? team.maxMembers ?? 0;
}

export async function validateChallengeCreation(params: {
  sport: string;
  type: string;
  creatorId: string;
  creatorType?: string;
  opponentId?: string;
  opponentType?: string;
}): Promise<{ challengeType: ChallengeType }> {
  const challengeType = resolveChallengeType(params.sport);

  if (challengeType === "structured" && params.type === "teamVsTeam" && params.opponentId) {
    const hostTeamId = params.creatorType === "team" ? params.creatorId : null;
    if (!hostTeamId) throw new Error("Structured team sports require a team challenger");
    const hostSize = await getTeamSize(hostTeamId, params.sport);
    const guestSize = await getTeamSize(params.opponentId, params.sport);
    if (hostSize !== guestSize) {
      throw new Error(`Team sizes must match for ${params.sport} (${hostSize} vs ${guestSize})`);
    }
  }

  if (challengeType === "contact" && params.opponentId && params.opponentType === "user") {
    await validateContactMatchUsers(params.creatorId, params.opponentId);
  }

  return { challengeType };
}

export async function validateContactMatchUsers(userA: string, userB: string): Promise<void> {
  const [a, b] = await Promise.all([getUserBoxingProfile(userA), getUserBoxingProfile(userB)]);
  const weightA = parseWeightKg(a?.weight_class);
  const weightB = parseWeightKg(b?.weight_class);
  if (weightA == null || weightB == null) {
    throw new Error("Both fighters must have a weight class on their profile");
  }
  if (Math.abs(weightA - weightB) > 5) {
    throw new Error(`Weight classes must be within 5kg (difference: ${Math.abs(weightA - weightB).toFixed(1)}kg)`);
  }

  const now = new Date();
  for (const [id, profile] of [
    [userA, a],
    [userB, b],
  ] as const) {
    const expiry = profile?.medical_clearance_expiry ? new Date(profile.medical_clearance_expiry) : null;
    if (!expiry || expiry <= now) {
      throw new Error(`Medical clearance must be on file and valid for user ${id}`);
    }
  }
}

export async function validateContactManagerConsent(matchId: string): Promise<void> {
  const rows = await db.execute(sql`
    SELECT participant_id, manager_consent
    FROM match_participants
    WHERE match_id = ${matchId} AND role IN ('host', 'guest')
  `);
  const participants = rows.rows as { participant_id: string; manager_consent: boolean }[];
  if (participants.length < 2) {
    throw new Error("Both managers must consent before this contact sport match can proceed");
  }
  const missing = participants.filter((p) => !p.manager_consent);
  if (missing.length > 0) {
    throw new Error("Both managers must consent before this contact sport match can proceed");
  }
}

export type VerifiedStatus = "pending" | "community" | "community_verified" | "surna_verified";

export function computeVerifiedStatus(
  likes: number,
  saves: number,
  checkins: number,
): VerifiedStatus {
  if (likes >= 50 && saves >= 10 && checkins >= 3) return "surna_verified";
  if (likes >= 25 && saves >= 5) return "community_verified";
  if (likes >= 10) return "community";
  return "pending";
}

/** Haversine distance in metres. */
export function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
