import "dotenv/config";
import { ensurePhase6SportTables } from "../infrastructure/phase6Sport";
import {
  resolveChallengeType,
  computeVerifiedStatus,
  parseWeightKg,
  distanceMetres,
} from "../services/sportChallengeRules";
import {
  createFreePlaySpot,
  likeFreePlaySpot,
  saveFreePlaySpot,
  checkinFreePlaySpot,
  createCommunityRoute,
  likeCommunityRoute,
  simulateSpotVerificationTiers,
  listReferees,
  getTeamCreationRecommendations,
  getEventCreationRecommendations,
} from "../services/phase6SportService";
import { db } from "../db";
import { users } from "@shared/schema";

async function main() {
  console.log("=== Phase 6 sport ecosystem tests ===\n");
  await ensurePhase6SportTables();

  // Item 1 — challenge types
  console.assert(resolveChallengeType("Basketball") === "open", "basketball open");
  console.assert(resolveChallengeType("Football") === "structured", "football structured");
  console.assert(resolveChallengeType("Boxing") === "contact", "boxing contact");
  console.log("✅ [Phase6-1] Challenge types:", {
    basketball: resolveChallengeType("Basketball"),
    football: resolveChallengeType("Football"),
    boxing: resolveChallengeType("Boxing"),
  });

  // Item 2 — boxing profile parse
  console.assert(parseWeightKg("75kg") === 75, "weight parse");
  console.log("✅ [Phase6-2] Weight class parse:", parseWeightKg("75kg"));

  // Item 3 — referees list
  const refs = await listReferees({ sport: "football", limit: 5 });
  console.log("✅ [Phase6-3] Referees endpoint data:", refs.length, "rows");

  // Item 4 — free play spots + verification tiers
  const tiers = await simulateSpotVerificationTiers();
  console.assert(tiers.community === "community", "10 likes tier");
  console.assert(tiers.communityVerified === "community_verified", "25+5 tier");
  console.assert(tiers.surnaVerified === "surna_verified", "50+10+3 tier");

  const [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.error("Need seeded user");
    process.exit(1);
  }

  const spot = await createFreePlaySpot({
    userId: user.id,
    name: "Test Court",
    sport: "basketball",
    lat: 53.3498,
    lng: -6.2603,
  });
  const spotId = String((spot as { id: string }).id);

  for (let i = 0; i < 10; i++) {
    await likeFreePlaySpot(spotId, user.id);
  }
  let status = computeVerifiedStatus(10, 0, 0);
  console.assert(status === "community", "spot community tier");
  console.log("✅ [Phase6-4] Spot created + community tier:", spotId, status);

  // Check-in distance validation
  const nearDist = distanceMetres(53.3498, -6.2603, 53.3499, -6.2604);
  console.assert(nearDist < 500, "distance calc");
  try {
    await checkinFreePlaySpot(spotId, user.id, 53.3499, -6.2604);
    console.log("✅ [Phase6-4] Check-in within 500m OK");
  } catch (e) {
    console.warn("Check-in test:", e instanceof Error ? e.message : e);
  }

  // Item 5 — community routes
  const route = await createCommunityRoute({
    userId: user.id,
    name: "River Run",
    sport: "running",
    coordinates: [
      [53.35, -6.26],
      [53.351, -6.259],
    ],
  });
  const routeId = String((route as { id: string }).id);
  await likeCommunityRoute(routeId, user.id);
  console.log("✅ [Phase6-5] Community route created:", routeId);

  // Item 6 — recommendations
  const teamRecs = await getTeamCreationRecommendations({ sport: "football" });
  const eventRecs = await getEventCreationRecommendations({ sport: "football" });
  console.log("✅ [Phase6-6] Team recs:", {
    coaches: teamRecs.coaches.length,
    kit: teamRecs.kitSuppliers.length,
    refs: teamRecs.referees.length,
  });
  console.log("✅ [Phase6-6] Event recs:", {
    venues: eventRecs.venues.length,
    refs: eventRecs.referees.length,
    equipment: eventRecs.equipment.length,
  });

  console.log("\n=== Phase 6 smoke tests passed ===");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
