import { db } from "../db";
import { sql, eq, and, desc, inArray, type SQL } from "drizzle-orm";
import { users, teams, pointTransactions } from "@shared/schema";
import { ensurePhase4CompetitiveTables } from "../infrastructure/phase4Competitive";

/** Phase 4 point values — must match product spec. */
export const POINT_REASONS = {
  log_activity: 10,
  personal_best: 50,
  challenge_win: 100,
  verified_spot: 500,
  referral_signup: 300,
  activity_streak_7: 150,
} as const;

export type PointReason = keyof typeof POINT_REASONS;

export const BADGE_TYPES = [
  "first_activity",
  "first_challenge_win",
  "streak_7",
  "streak_30",
  "explorer",
  "referrer",
  "weekly_champion",
] as const;

export type BadgeType = (typeof BADGE_TYPES)[number];

function startOfWeekMonday(d = new Date()): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDateKey(d);
}

export async function awardCompetitivePoints(
  userId: string,
  reason: PointReason,
  opts?: {
    relatedEntityId?: string;
    relatedEntityType?: string;
    description?: string;
    skipSideEffects?: boolean;
  },
): Promise<{ success: boolean; points: number; totalPoints: number }> {
  await ensurePhase4CompetitiveTables();
  const points = POINT_REASONS[reason];
  if (!points) {
    return { success: false, points: 0, totalPoints: 0 };
  }

  if (opts?.relatedEntityId) {
    const dup = await db.execute(sql`
      SELECT 1 FROM point_transactions
      WHERE user_id = ${userId}
        AND action = ${reason}
        AND related_entity_id = ${opts.relatedEntityId}
      LIMIT 1
    `);
    if (dup.rows.length > 0) {
      const [u] = await db.select({ points: users.points }).from(users).where(eq(users.id, userId)).limit(1);
      return { success: false, points: 0, totalPoints: u?.points ?? 0 };
    }
  }

  await db.insert(pointTransactions).values({
    userId,
    points,
    action: reason,
    description: opts?.description ?? reason.replace(/_/g, " "),
    relatedEntityType: opts?.relatedEntityType,
    relatedEntityId: opts?.relatedEntityId,
  });

  const [updated] = await db
    .update(users)
    .set({ points: sql`COALESCE(${users.points}, 0) + ${points}` })
    .where(eq(users.id, userId))
    .returning({ points: users.points });

  console.log("[Phase4-1] Points awarded:", userId, reason, points);

  if (!opts?.skipSideEffects) {
    if (reason === "log_activity") {
      await recordActivityDay(userId);
      await tryAwardBadge(userId, "first_activity");
    }
    if (reason === "challenge_win") {
      await recordUserWinStreak(userId, true);
      await tryAwardBadge(userId, "first_challenge_win");
    }
    if (reason === "verified_spot") {
      await tryAwardBadge(userId, "explorer");
    }
    if (reason === "referral_signup") {
      await tryAwardBadge(userId, "referrer");
    }
  }

  await syncActivityStreakBadges(userId);

  return {
    success: true,
    points,
    totalPoints: updated?.points ?? points,
  };
}

export async function tryAwardBadge(userId: string, badgeType: BadgeType): Promise<boolean> {
  await ensurePhase4CompetitiveTables();
  const inserted = await db.execute(sql`
    INSERT INTO badges (user_id, badge_type)
    VALUES (${userId}, ${badgeType})
    ON CONFLICT (user_id, badge_type) DO NOTHING
    RETURNING id
  `);
  if (inserted.rows.length > 0) {
    console.log("[Phase4-2] Badge awarded:", userId, badgeType);
    return true;
  }
  return false;
}

async function syncActivityStreakBadges(userId: string): Promise<void> {
  const [u] = await db
    .select({
      activityStreak: users.activityStreak,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const streak = u?.activityStreak ?? 0;
  if (streak >= 7) await tryAwardBadge(userId, "streak_7");
  if (streak >= 30) await tryAwardBadge(userId, "streak_30");
}

export async function recordActivityDay(userId: string): Promise<void> {
  await ensurePhase4CompetitiveTables();
  const today = utcDateKey();
  const [u] = await db
    .select({
      lastActivityDate: users.lastActivityDate,
      activityStreak: users.activityStreak,
      longestActivityStreak: users.longestActivityStreak,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const last = u?.lastActivityDate ? String(u.lastActivityDate).slice(0, 10) : null;
  if (last === today) return;

  let nextStreak = 1;
  if (last === yesterdayKey()) {
    nextStreak = (u?.activityStreak ?? 0) + 1;
  }

  const longest = Math.max(u?.longestActivityStreak ?? 0, nextStreak);

  await db
    .update(users)
    .set({
      activityStreak: nextStreak,
      longestActivityStreak: longest,
      lastActivityDate: sql`${today}::date`,
    })
    .where(eq(users.id, userId));

  console.log("[Phase4-5] Activity streak:", userId, nextStreak);

  if (nextStreak === 7) {
    await awardCompetitivePoints(userId, "activity_streak_7", {
      relatedEntityId: `streak7-${today}`,
      description: "7-day activity streak bonus",
      skipSideEffects: true,
    });
  }
}

export async function recordUserWinStreak(userId: string, won: boolean): Promise<void> {
  await ensurePhase4CompetitiveTables();
  const [u] = await db
    .select({
      currentWinStreak: users.currentWinStreak,
      longestWinStreak: users.longestWinStreak,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const current = won ? (u?.currentWinStreak ?? 0) + 1 : 0;
  const longest = Math.max(u?.longestWinStreak ?? 0, current);

  await db
    .update(users)
    .set({ currentWinStreak: current, longestWinStreak: longest })
    .where(eq(users.id, userId));

  console.log("[Phase4-4] User win streak:", userId, current);
}

export async function recordTeamWinStreak(teamId: string, won: boolean): Promise<void> {
  await ensurePhase4CompetitiveTables();
  const [t] = await db
    .select({
      currentWinStreak: teams.currentWinStreak,
      longestWinStreak: teams.longestWinStreak,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  const current = won ? (t?.currentWinStreak ?? 0) + 1 : 0;
  const longest = Math.max(t?.longestWinStreak ?? 0, current);

  await db
    .update(teams)
    .set({ currentWinStreak: current, longestWinStreak: longest })
    .where(eq(teams.id, teamId));

  console.log("[Phase4-4] Team win streak:", teamId, current);
}

export async function handleChallengeOutcome(
  matchId: string,
  winnerUserIds: string[],
  loserUserIds: string[],
  winnerTeamIds: string[] = [],
  loserTeamIds: string[] = [],
): Promise<void> {
  for (const uid of winnerUserIds) {
    await awardCompetitivePoints(uid, "challenge_win", {
      relatedEntityId: matchId,
      relatedEntityType: "challenge",
      description: "Won a challenge",
    });
  }
  for (const uid of loserUserIds) {
    await recordUserWinStreak(uid, false);
  }
  for (const tid of winnerTeamIds) {
    await recordTeamWinStreak(tid, true);
  }
  for (const tid of loserTeamIds) {
    await recordTeamWinStreak(tid, false);
  }
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  points: number;
}

export async function getCompetitiveLeaderboard(params: {
  type: "local" | "national" | "sport" | "circle";
  viewerId?: string;
  sport?: string;
  period?: "weekly" | "all_time";
  limit?: number;
}): Promise<LeaderboardRow[]> {
  await ensurePhase4CompetitiveTables();
  const limit = Math.min(params.limit ?? 50, 50);
  const period = params.period ?? "weekly";
  const weekStart = startOfWeekMonday();

  let candidateIds: string[] | null = null;

  if (params.type === "circle" && params.viewerId) {
    const following = await db.execute(sql`
      SELECT following_id AS id FROM follows
      WHERE follower_id = ${params.viewerId} AND following_type IN ('user', 'coach')
    `);
    const teammates = await db.execute(sql`
      SELECT DISTINCT tm2.user_id AS id
      FROM team_members tm1
      JOIN team_members tm2 ON tm2.team_id = tm1.team_id
      WHERE tm1.user_id = ${params.viewerId} AND tm1.status = 'active' AND tm2.status = 'active'
    `);
    const ids = new Set<string>([params.viewerId]);
    for (const r of following.rows as { id: string }[]) ids.add(r.id);
    for (const r of teammates.rows as { id: string }[]) ids.add(r.id);
    candidateIds = [...ids];
  }

  if (params.type === "local" && params.viewerId) {
    const [viewer] = await db
      .select({ location: users.location })
      .from(users)
      .where(eq(users.id, params.viewerId))
      .limit(1);
    const loc = viewer?.location?.trim();
    if (loc) {
      const localUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.location}) LIKE LOWER(${`%${loc.split(",")[0].trim()}%`})`)
        .limit(500);
      candidateIds = localUsers.map((u) => u.id);
    }
  }

  if (params.type === "sport" && params.sport) {
    const sportUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`LOWER(${users.sport}) = LOWER(${params.sport})`)
      .limit(500);
    candidateIds = sportUsers.map((u) => u.id);
  }

  // national = all users (no filter)
  if (candidateIds && candidateIds.length === 0) {
    return [];
  }

  let rows: Array<{
    id: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    profileImageUrl: string | null;
    points: number;
  }>;

  if (period === "weekly") {
    const idFilter =
      candidateIds && candidateIds.length > 0
        ? sql`AND pt.user_id IN (${sql.join(candidateIds.map((id) => sql`${id}`), sql`, `)})`
        : sql``;
    const sportFilter =
      params.type === "sport" && params.sport
        ? sql`AND LOWER(u.sport) = LOWER(${params.sport})`
        : sql``;

    const q = await db.execute(sql`
      SELECT u.id, u.display_name, u.first_name, u.last_name, u.username, u.profile_image_url,
             COALESCE(SUM(pt.points), 0)::int AS points
      FROM users u
      JOIN point_transactions pt ON pt.user_id = u.id
      WHERE pt.created_at >= ${weekStart.toISOString()}::timestamptz
      ${idFilter}
      ${sportFilter}
      GROUP BY u.id, u.display_name, u.first_name, u.last_name, u.username, u.profile_image_url
      ORDER BY points DESC
      LIMIT ${limit}
    `);
    rows = (q.rows as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      displayName: (r.display_name as string) ?? null,
      firstName: (r.first_name as string) ?? null,
      lastName: (r.last_name as string) ?? null,
      username: (r.username as string) ?? null,
      profileImageUrl: (r.profile_image_url as string) ?? null,
      points: Number(r.points ?? 0),
    }));
  } else {
    const whereParts: SQL[] = [];
    if (candidateIds && candidateIds.length > 0) {
      whereParts.push(inArray(users.id, candidateIds));
    }
    if (params.type === "sport" && params.sport) {
      whereParts.push(sql`LOWER(${users.sport}) = LOWER(${params.sport})`);
    }

    rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        profileImageUrl: users.profileImageUrl,
        points: users.points,
      })
      .from(users)
      .where(whereParts.length ? and(...whereParts) : undefined)
      .orderBy(desc(users.points))
      .limit(limit)
      .then((r) =>
        r.map((u) => ({
          ...u,
          points: u.points ?? 0,
        })),
      );
  }

  console.log("[Phase4-3] Leaderboard:", params.type, period, rows.length);

  return rows.map((u, idx) => ({
    rank: idx + 1,
    userId: u.id,
    name:
      u.displayName ||
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.username ||
      "Player",
    avatar: u.profileImageUrl,
    points: u.points,
  }));
}

export async function ensureCurrentWeeklyChallenge(): Promise<{ id: string; title: string } | null> {
  await ensurePhase4CompetitiveTables();
  const weekStart = startOfWeekMonday();
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const existing = await db.execute(sql`
    SELECT id, title FROM weekly_challenges
    WHERE week_start = ${weekStart.toISOString()}::timestamptz
    LIMIT 1
  `);
  if (existing.rows.length > 0) {
    return existing.rows[0] as { id: string; title: string };
  }

  const titles = [
    "Log 3 activities this week",
    "Win a challenge this week",
    "Discover a new verified spot",
    "Join an event this week",
    "Post to the community feed 2 times",
  ];
  const title = titles[weekStart.getUTCDate() % titles.length];

  const inserted = await db.execute(sql`
    INSERT INTO weekly_challenges (title, description, sport, requirement, bonus_points, week_start, week_end)
    VALUES (
      ${title},
      'Complete the community goal before Sunday to earn bonus points.',
      NULL,
      ${JSON.stringify({ kind: "weekly_community" })}::jsonb,
      75,
      ${weekStart.toISOString()}::timestamptz,
      ${weekEnd.toISOString()}::timestamptz
    )
    RETURNING id, title
  `);

  console.log("[Phase4-6] Weekly challenge created:", (inserted.rows[0] as { title: string })?.title);
  return (inserted.rows[0] as { id: string; title: string }) ?? null;
}

export async function completeWeeklyChallenge(userId: string, challengeId: string): Promise<boolean> {
  await ensurePhase4CompetitiveTables();
  const [challenge] = (
    await db.execute(sql`
      SELECT id, bonus_points, week_end FROM weekly_challenges WHERE id = ${challengeId} LIMIT 1
    `)
  ).rows as { id: string; bonus_points: number; week_end: string }[];

  if (!challenge || new Date(challenge.week_end) < new Date()) return false;

  const done = await db.execute(sql`
    INSERT INTO weekly_challenge_completions (weekly_challenge_id, user_id, points_awarded)
    VALUES (${challengeId}, ${userId}, ${challenge.bonus_points})
    ON CONFLICT (weekly_challenge_id, user_id) DO NOTHING
    RETURNING id
  `);
  if (done.rows.length === 0) return false;

  await db
    .update(users)
    .set({ points: sql`COALESCE(${users.points}, 0) + ${challenge.bonus_points}` })
    .where(eq(users.id, userId));

  await db.insert(pointTransactions).values({
    userId,
    points: challenge.bonus_points,
    action: "weekly_challenge",
    description: "Weekly community challenge completed",
    relatedEntityType: "weekly_challenge",
    relatedEntityId: challengeId,
  });

  console.log("[Phase4-6] Weekly challenge completed:", userId, challengeId);
  await awardWeeklyTopBadges(challengeId);
  return true;
}

async function awardWeeklyTopBadges(challengeId: string): Promise<void> {
  const top = await db.execute(sql`
    SELECT user_id FROM weekly_challenge_completions
    WHERE weekly_challenge_id = ${challengeId}
    ORDER BY completed_at ASC
    LIMIT 10
  `);
  for (const row of top.rows as { user_id: string }[]) {
    await tryAwardBadge(row.user_id, "weekly_champion");
  }
}

export function startWeeklyChallengeJob(): void {
  import("node-cron").then(({ default: cron }) => {
    cron.schedule("0 0 * * 1", async () => {
      try {
        await ensureCurrentWeeklyChallenge();
        console.log("[Phase4-6] Monday weekly challenge roll");
      } catch (err) {
        console.error("[Phase4-6] Weekly challenge job failed:", err);
      }
    });
    void ensureCurrentWeeklyChallenge();
    console.log("[Phase4-6] Weekly challenge scheduler active");
  });
}
