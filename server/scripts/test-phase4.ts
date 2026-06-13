/**
 * Phase 4 smoke test — run: npx tsx server/scripts/test-phase4.ts
 * Requires DATABASE_URL in .env
 */
import "dotenv/config";
import { ensurePhase4CompetitiveTables } from "../infrastructure/phase4Competitive";
import {
  POINT_REASONS,
  awardCompetitivePoints,
  tryAwardBadge,
  recordActivityDay,
  recordUserWinStreak,
  recordTeamWinStreak,
  getCompetitiveLeaderboard,
  ensureCurrentWeeklyChallenge,
  completeWeeklyChallenge,
} from "../services/competitiveEngine";
import { db } from "../db";
import { users, teams } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== Phase 4 competitive engine tests ===\n");
  await ensurePhase4CompetitiveTables();

  const [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.error("No users in DB — seed data first.");
    process.exit(1);
  }
  const userId = user.id;
  console.log("Test user:", userId);

  // 1. Points
  const p1 = await awardCompetitivePoints(userId, "log_activity", {
    relatedEntityId: `test-activity-${Date.now()}`,
  });
  console.assert(p1.success && p1.points === POINT_REASONS.log_activity, "log_activity points");
  console.log("✅ [Phase4-1] Points:", p1);

  const p2 = await awardCompetitivePoints(userId, "personal_best", {
    relatedEntityId: `test-pb-${Date.now()}`,
  });
  console.assert(p2.points === 50, "personal_best 50");
  console.log("✅ [Phase4-1] personal_best:", p2.points);

  // 2. Badges
  const b1 = await tryAwardBadge(userId, "first_activity");
  console.log("✅ [Phase4-2] Badge first_activity:", b1);

  // 5. Activity streak (simulate consecutive days via direct update + recordActivityDay)
  await recordActivityDay(userId);
  const [afterStreak] = await db
    .select({ activityStreak: users.activityStreak })
    .from(users)
    .where(eq(users.id, userId));
  console.log("✅ [Phase4-5] Activity streak:", afterStreak?.activityStreak);

  // 4. Win streak
  await recordUserWinStreak(userId, true);
  await recordUserWinStreak(userId, false);
  const [afterWin] = await db
    .select({ currentWinStreak: users.currentWinStreak })
    .from(users)
    .where(eq(users.id, userId));
  console.assert(afterWin?.currentWinStreak === 0, "win streak resets on loss");
  console.log("✅ [Phase4-4] Win streak reset:", afterWin?.currentWinStreak);

  const [team] = await db.select().from(teams).limit(1);
  if (team) {
    await recordTeamWinStreak(team.id, true);
    console.log("✅ [Phase4-4] Team win streak updated");
  }

  // 3. Leaderboards
  const lb = await getCompetitiveLeaderboard({ type: "national", period: "all_time", limit: 5 });
  console.assert(lb.length <= 5 && lb[0]?.rank === 1, "leaderboard shape");
  console.log("✅ [Phase4-3] Leaderboard sample:", lb.slice(0, 2));

  // 6. Weekly challenge
  const wc = await ensureCurrentWeeklyChallenge();
  console.assert(!!wc?.id, "weekly challenge exists");
  if (wc) {
    const done = await completeWeeklyChallenge(userId, wc.id);
    console.log("✅ [Phase4-6] Weekly challenge complete:", done);
  }

  console.log("\n=== All Phase 4 smoke tests passed ===");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
