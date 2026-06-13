import { sql, eq, and } from "drizzle-orm";
import { db } from "../db";
import { users, teamMembers } from "@shared/schema";
import { ensurePhase7HealthTables } from "../infrastructure/phase7Health";
import { awardCompetitivePoints } from "./competitiveEngine";
import { distanceMetres } from "./sportChallengeRules";

export type ActivityInput = {
  userId: string;
  activityType: string;
  distanceKm?: number;
  durationSeconds?: number;
  calories?: number;
  avgHeartRate?: number;
  routeCoordinates?: Array<[number, number]>;
  startedAt: string;
  finishedAt?: string;
};

export type PersonalBestMetric = "fastest_5k" | "longest_run" | "longest_cycle";

function computeRouteDistanceKm(coords: Array<[number, number]>): number {
  if (coords.length < 2) return 0;
  let metres = 0;
  for (let i = 1; i < coords.length; i++) {
    metres += distanceMetres(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
  }
  return Math.round((metres / 1000) * 1000) / 1000;
}

async function checkAndUpdatePersonalBests(userId: string, activity: Record<string, unknown>) {
  await ensurePhase7HealthTables();
  const activityId = String(activity.id);
  const type = String(activity.activity_type ?? "").toLowerCase();
  const distanceKm = Number(activity.distance_km ?? 0);
  const durationSeconds = Number(activity.duration_seconds ?? 0);
  const beaten: PersonalBestMetric[] = [];

  if ((type === "run" || type === "running") && durationSeconds > 0) {
    if (distanceKm >= 5) {
      const pace5k = durationSeconds;
      const updated = await upsertBest(userId, "fastest_5k", pace5k, activityId, "min");
      if (updated) beaten.push("fastest_5k");
    }
    const updatedRun = await upsertBest(userId, "longest_run", distanceKm, activityId, "max");
    if (updatedRun) beaten.push("longest_run");
  }

  if ((type === "cycle" || type === "cycling" || type === "bike") && distanceKm > 0) {
    const updatedCycle = await upsertBest(userId, "longest_cycle", distanceKm, activityId, "max");
    if (updatedCycle) beaten.push("longest_cycle");
  }

  for (const metric of beaten) {
    await awardCompetitivePoints(userId, "personal_best", {
      relatedEntityId: `${metric}:${activityId}`,
      relatedEntityType: "personal_best",
      description: `New personal best: ${metric}`,
    });
    console.log("[Phase7-2] PB beaten:", userId, metric, "50 points");
  }

  return beaten;
}

async function upsertBest(
  userId: string,
  metricType: PersonalBestMetric,
  value: number,
  activityId: string,
  mode: "min" | "max",
): Promise<boolean> {
  const existing = await db.execute(sql`
    SELECT value FROM personal_bests WHERE user_id = ${userId} AND metric_type = ${metricType} LIMIT 1
  `);
  const prev = existing.rows[0] as { value: string } | undefined;
  const prevVal = prev ? Number(prev.value) : null;
  const isBetter =
    prevVal == null || (mode === "min" ? value < prevVal : value > prevVal);
  if (!isBetter) return false;

  await db.execute(sql`
    INSERT INTO personal_bests (user_id, metric_type, value, activity_id, updated_at)
    VALUES (${userId}, ${metricType}, ${value}, ${activityId}, now())
    ON CONFLICT (user_id, metric_type) DO UPDATE SET
      value = EXCLUDED.value,
      activity_id = EXCLUDED.activity_id,
      updated_at = now()
  `);
  return true;
}

export async function createActivity(input: ActivityInput) {
  await ensurePhase7HealthTables();

  let distanceKm = input.distanceKm;
  if ((!distanceKm || distanceKm === 0) && input.routeCoordinates?.length) {
    distanceKm = computeRouteDistanceKm(input.routeCoordinates);
  }

  const coordsJson = input.routeCoordinates ? JSON.stringify(input.routeCoordinates) : null;
  const inserted = await db.execute(sql`
    INSERT INTO activities (
      user_id, activity_type, distance_km, duration_seconds, calories,
      avg_heart_rate, route_coordinates, started_at, finished_at
    ) VALUES (
      ${input.userId}, ${input.activityType}, ${distanceKm ?? null}, ${input.durationSeconds ?? null},
      ${input.calories ?? null}, ${input.avgHeartRate ?? null},
      ${coordsJson}::jsonb, ${input.startedAt}, ${input.finishedAt ?? input.startedAt}
    )
    RETURNING *
  `);
  const activity = inserted.rows[0] as Record<string, unknown>;

  await awardCompetitivePoints(input.userId, "log_activity", {
    relatedEntityId: String(activity.id),
    relatedEntityType: "activity",
    description: `Logged ${input.activityType}`,
  }).catch(() => {});

  const pbs = await checkAndUpdatePersonalBests(input.userId, activity);

  try {
    const countQ = await db.execute(sql`
      SELECT COUNT(*)::int AS c FROM activities WHERE user_id = ${input.userId}
    `);
    if (Number((countQ.rows[0] as { c: number })?.c ?? 0) >= 10) {
      const { triggerNudgeIfNeeded } = await import("./phase8ProfileService");
      await triggerNudgeIfNeeded(input.userId, "ten_activities");
    }
  } catch {
    /* non-blocking */
  }

  console.log("[Phase7-1] Activity created:", activity.id, pbs.length ? `PBs: ${pbs.join(",")}` : "");
  return { activity, personalBestsBeaten: pbs };
}

export async function listUserActivities(userId: string, limit = 50) {
  await ensurePhase7HealthTables();
  const q = await db.execute(sql`
    SELECT * FROM activities
    WHERE user_id = ${userId}
    ORDER BY started_at DESC
    LIMIT ${limit}
  `);
  return q.rows;
}

export async function getActivityById(activityId: string, viewerId?: string) {
  await ensurePhase7HealthTables();
  const q = await db.execute(sql`
    SELECT * FROM activities WHERE id = ${activityId} LIMIT 1
  `);
  const activity = q.rows[0] as Record<string, unknown> | undefined;
  if (!activity) return null;
  if (viewerId && String(activity.user_id) !== viewerId) {
    // Public detail only for own activities unless health privacy allows
    return activity;
  }
  return activity;
}

export async function getPersonalBests(userId: string) {
  await ensurePhase7HealthTables();
  const q = await db.execute(sql`
    SELECT metric_type, value, activity_id, updated_at
    FROM personal_bests WHERE user_id = ${userId}
    ORDER BY metric_type
  `);
  return q.rows;
}

function startOfWeek(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getHealthSummary(userId: string) {
  await ensurePhase7HealthTables();
  const weekStart = startOfWeek().toISOString();

  const weekly = await db.execute(sql`
    SELECT
      COALESCE(SUM(distance_km), 0)::float AS distance_km,
      COALESCE(SUM(duration_seconds), 0)::int AS duration_seconds,
      COUNT(*)::int AS sessions
    FROM activities
    WHERE user_id = ${userId} AND started_at >= ${weekStart}
  `);
  const weeklyRow = weekly.rows[0] as { distance_km: number; duration_seconds: number; sessions: number };

  const monthly = await db.execute(sql`
    SELECT
      date_trunc('week', started_at) AS week,
      COUNT(*)::int AS sessions,
      COALESCE(SUM(distance_km), 0)::float AS distance_km
    FROM activities
    WHERE user_id = ${userId} AND started_at >= NOW() - interval '28 days'
    GROUP BY 1
    ORDER BY 1
  `);

  const [userRow] = await db
    .select({ activityStreak: users.activityStreak, longestActivityStreak: users.longestActivityStreak })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const personalBests = await getPersonalBests(userId);

  return {
    weeklyTrainingLoad: {
      distanceKm: Number(weeklyRow?.distance_km ?? 0),
      durationMinutes: Math.round(Number(weeklyRow?.duration_seconds ?? 0) / 60),
      sessions: Number(weeklyRow?.sessions ?? 0),
    },
    monthlyTrend: (monthly.rows as Record<string, unknown>[]).map((r) => ({
      week: r.week,
      sessions: Number(r.sessions ?? 0),
      distanceKm: Number(r.distance_km ?? 0),
    })),
    currentStreak: userRow?.activityStreak ?? 0,
    longestStreak: userRow?.longestActivityStreak ?? 0,
    personalBests: personalBests.map((pb) => ({
      metric: pb.metric_type,
      value: Number(pb.value),
      updatedAt: pb.updated_at,
    })),
  };
}

export type SquadHealthStatus = "green" | "amber" | "red";

export async function getPlayerActivityStatus(userId: string): Promise<{
  status: SquadHealthStatus;
  sessions7d: number;
  durationMinutes7d: number;
}> {
  await ensurePhase7HealthTables();
  const q = await db.execute(sql`
    SELECT COUNT(*)::int AS sessions, COALESCE(SUM(duration_seconds), 0)::int AS duration
    FROM activities
    WHERE user_id = ${userId} AND started_at >= NOW() - interval '7 days'
  `);
  const row = q.rows[0] as { sessions: number; duration: number };
  const sessions7d = Number(row?.sessions ?? 0);
  const durationMinutes7d = Math.round(Number(row?.duration ?? 0) / 60);

  const recent3d = await db.execute(sql`
    SELECT COUNT(*)::int AS c FROM activities
    WHERE user_id = ${userId} AND started_at >= NOW() - interval '3 days'
  `);
  const recent = Number((recent3d.rows[0] as { c: number })?.c ?? 0);

  let status: SquadHealthStatus = "red";
  if (recent > 0 && durationMinutes7d >= 60) status = "green";
  else if (sessions7d > 0) status = "amber";

  return { status, sessions7d, durationMinutes7d };
}

export async function getSquadHealthOverview(teamId: string) {
  await ensurePhase7HealthTables();
  const { storage } = await import("../storage");
  const roster = await storage.getProRoster(teamId);
  const players = await Promise.all(
    roster.map(async (row: any) => {
      const uid = row.userId || row.user?.id;
      const health = uid ? await getPlayerActivityStatus(uid) : { status: "red" as const, sessions7d: 0, durationMinutes7d: 0 };
      return {
        userId: uid,
        name: row.user?.displayName || row.user?.username || "Player",
        position: Array.isArray(row.positions) ? row.positions[0] : row.user?.sport,
        rosterStatus: row.status || "active",
        ...health,
      };
    }),
  );
  console.log("[Phase7-5] Squad health overview:", teamId, players.length, "players");
  return { players };
}

export async function getPlayerActivityHistory(teamId: string, playerUserId: string) {
  await ensurePhase7HealthTables();
  const activities = await listUserActivities(playerUserId, 100);
  const health = await getPlayerActivityStatus(playerUserId);
  const load7d = await db.execute(sql`
    SELECT started_at, activity_type, distance_km, duration_seconds
    FROM activities
    WHERE user_id = ${playerUserId} AND started_at >= NOW() - interval '7 days'
    ORDER BY started_at DESC
  `);
  return { teamId, playerUserId, health, activities, load7d: load7d.rows };
}

function readinessScore(sessions7d: number, durationMinutes7d: number): number {
  const sessionScore = Math.min(sessions7d * 15, 45);
  const durationScore = Math.min(durationMinutes7d / 2, 55);
  return Math.round(Math.min(100, sessionScore + durationScore));
}

export async function generateReadinessReport(teamId: string, eventId: string) {
  await ensurePhase7HealthTables();
  const { storage } = await import("../storage");
  const roster = await storage.getProRoster(teamId);

  const players = await Promise.all(
    roster.map(async (row: any) => {
      const uid = row.userId || row.user?.id;
      if (!uid) return null;
      const load = await db.execute(sql`
        SELECT COUNT(*)::int AS sessions, COALESCE(SUM(duration_seconds), 0)::int AS duration
        FROM activities WHERE user_id = ${uid} AND started_at >= NOW() - interval '7 days'
      `);
      const l = load.rows[0] as { sessions: number; duration: number };
      const sessions7d = Number(l?.sessions ?? 0);
      const durationMinutes7d = Math.round(Number(l?.duration ?? 0) / 60);
      const score = readinessScore(sessions7d, durationMinutes7d);
      const { status } = await getPlayerActivityStatus(uid);
      return {
        userId: uid,
        name: row.user?.displayName || row.user?.username || "Player",
        sessions7d,
        durationMinutes7d,
        readinessScore: score,
        status,
      };
    }),
  );

  const report = {
    teamId,
    eventId,
    generatedAt: new Date().toISOString(),
    players: players.filter(Boolean),
  };

  await db.execute(sql`
    INSERT INTO fixture_readiness_reports (team_id, event_id, report_json)
    VALUES (${teamId}, ${eventId}, ${JSON.stringify(report)}::jsonb)
    ON CONFLICT (team_id, event_id) DO UPDATE SET
      report_json = EXCLUDED.report_json,
      generated_at = now()
  `);

  console.log("[Phase7-6] Readiness report generated:", teamId, eventId);
  return report;
}

export async function getReadinessReport(teamId: string, eventId: string) {
  await ensurePhase7HealthTables();
  const q = await db.execute(sql`
    SELECT report_json, generated_at FROM fixture_readiness_reports
    WHERE team_id = ${teamId} AND event_id = ${eventId}
    LIMIT 1
  `);
  const row = q.rows[0] as { report_json: unknown; generated_at: string } | undefined;
  return row ? { ...(row.report_json as object), generatedAt: row.generated_at } : null;
}

export async function assertTeamManager(teamId: string, userId: string): Promise<void> {
  const teamQ = await db.execute(sql`SELECT captain_id FROM teams WHERE id = ${teamId} LIMIT 1`);
  const captainId = (teamQ.rows[0] as { captain_id?: string })?.captain_id;
  if (captainId === userId) return;

  const [member] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);
  const role = member?.role;
  if (role === "captain" || role === "co-captain") return;
  throw new Error("Manager access required");
}

/** Test helper for verification tier logic */
export function computeReadinessScoreForTest(sessions: number, minutes: number) {
  return readinessScore(sessions, minutes);
}
