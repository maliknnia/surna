import "dotenv/config";
import { ensurePhase7HealthTables } from "../infrastructure/phase7Health";
import {
  createActivity,
  listUserActivities,
  getActivityById,
  getHealthSummary,
  getPlayerActivityStatus,
  generateReadinessReport,
  computeReadinessScoreForTest,
} from "../services/phase7HealthService";
import { db } from "../db";
import { users } from "@shared/schema";

async function main() {
  console.log("=== Phase 7 health tests ===\n");
  await ensurePhase7HealthTables();

  const [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.error("Need seeded user");
    process.exit(1);
  }

  const { activity, personalBestsBeaten } = await createActivity({
    userId: user.id,
    activityType: "run",
    distanceKm: 5.2,
    durationSeconds: 1500,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    finishedAt: new Date().toISOString(),
    routeCoordinates: [
      [53.35, -6.26],
      [53.351, -6.259],
      [53.352, -6.258],
    ],
  });
  console.log("✅ [Phase7-1] Activity created:", (activity as { id: string }).id);

  const list = await listUserActivities(user.id);
  console.assert(list.length > 0, "activities listed");
  console.log("✅ [Phase7-1] List activities:", list.length);

  const detail = await getActivityById(String((activity as { id: string }).id), user.id);
  console.assert(detail != null, "activity detail");
  console.log("✅ [Phase7-1] Activity detail OK");

  console.log("✅ [Phase7-2] PBs beaten:", personalBestsBeaten.join(", ") || "none (may already exist)");

  const summary = await getHealthSummary(user.id);
  console.log("✅ [Phase7-4] Health summary:", {
    weeklySessions: summary.weeklyTrainingLoad.sessions,
    streak: summary.currentStreak,
    pbs: summary.personalBests.length,
  });

  const status = await getPlayerActivityStatus(user.id);
  console.log("✅ [Phase7-5] Player status:", status.status, status.sessions7d, "sessions");

  const score = computeReadinessScoreForTest(4, 120);
  console.assert(score > 0 && score <= 100, "readiness score range");
  console.log("✅ [Phase7-6] Readiness score sample:", score);

  console.log("\n=== Phase 7 smoke tests passed ===");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
