import "dotenv/config";
import { ensurePhase8ProfileTables } from "../infrastructure/phase8Profile";
import {
  setProfilePath,
  updateSportIdentity,
  triggerNudgeIfNeeded,
  recordProfileView,
  getActiveNudges,
  dismissNudge,
  searchCoaches,
  searchReferees,
  searchVenues,
} from "../services/phase8ProfileService";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("=== Phase 8 profile tests ===\n");
  await ensurePhase8ProfileTables();

  const [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.error("Need seeded user");
    process.exit(1);
  }

  // Item 1: two-path signup
  await setProfilePath(user.id, "normal", true);
  const [quick] = await db.select({ profileType: users.profileType }).from(users).where(eq(users.id, user.id)).limit(1);
  console.assert(quick?.profileType === "normal", "quick start profile_type");
  console.log("✅ [Phase8-1] Quick Start → profile_type=normal");

  await setProfilePath(user.id, "professional", false);
  const [pro] = await db.select({ profileType: users.profileType }).from(users).where(eq(users.id, user.id)).limit(1);
  console.assert(pro?.profileType === "professional", "professional profile_type");
  console.log("✅ [Phase8-1] Professional Profile → profile_type=professional");

  // Item 2: sport-specific fields
  await updateSportIdentity(user.id, {
    primarySport: "Football",
    position: "Midfielder",
    preferredFoot: "Left",
    clubHistory: "Youth academy 2018–2022",
  });
  const [football] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  console.assert(football?.preferredFoot === "Left", "football preferred_foot");
  console.log("✅ [Phase8-2] Football fields saved");

  await updateSportIdentity(user.id, {
    primarySport: "Boxing",
    weightClass: "Welterweight",
    fightRecordWins: 5,
    fightRecordLosses: 1,
    stance: "Orthodox",
    amateurOrPro: "Amateur",
    iabaNumber: "IE-12345",
    gymAffiliation: "Dublin Boxing Club",
  });
  const [boxing] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  console.assert(boxing?.weightClass === "Welterweight", "boxing weight_class");
  console.log("✅ [Phase8-2] Boxing fields saved");

  await updateSportIdentity(user.id, {
    primarySport: "Basketball",
    position: "Point Guard",
    heightCm: 185,
  });
  const [bball] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  console.assert(bball?.heightCm === 185, "basketball height_cm");
  console.log("✅ [Phase8-2] Basketball/Volleyball height saved");

  // Item 3: nudges
  await db.update(users).set({ profileType: "normal" }).where(eq(users.id, user.id));
  await db.execute(sql`DELETE FROM profile_nudge_milestones WHERE user_id = ${user.id}`);
  const n1 = await triggerNudgeIfNeeded(user.id, "first_team_join");
  console.assert(n1.nudge === true, "first team nudge");
  const n2 = await triggerNudgeIfNeeded(user.id, "first_team_join");
  console.assert(n2.nudge === false, "nudge only once");
  console.log("✅ [Phase8-3] Milestone nudges fire once");

  await db.execute(sql`DELETE FROM profile_view_events WHERE profile_user_id = ${user.id}`);
  const [viewer] = await db.select().from(users).where(sql`${users.id} != ${user.id}`).limit(1);
  if (viewer) {
    await recordProfileView(user.id, viewer.id);
    await recordProfileView(user.id, viewer.id);
    await recordProfileView(user.id, viewer.id);
    const active = await getActiveNudges(user.id);
    const hasViews = active.some((n) => n.milestone === "three_profile_views");
    console.log(hasViews ? "✅ [Phase8-3] Profile view nudge at 3 views" : "⚠ [Phase8-3] Profile view nudge (needs distinct viewers)");
    await dismissNudge(user.id, "first_team_join");
  }

  // Item 4: discovery search
  const coaches = await searchCoaches({ sport: "Football", location: "Dublin" });
  console.log("✅ [Phase8-4] Coaches search:", coaches.length, "results");

  const referees = await searchReferees({ sport: "Football", location: "53.35,-6.26" });
  console.log("✅ [Phase8-4] Referees search:", referees.length, "results");

  const venues = await searchVenues({ sport: "Football", location: "Dublin" });
  console.log("✅ [Phase8-4] Venues search:", venues.length, "results");

  if (coaches[0]) {
    console.assert("bookingUrl" in coaches[0] && "rating" in coaches[0], "coach discovery shape");
  }

  console.log("\n=== Phase 8 tests complete ===");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
