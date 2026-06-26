/**
 * Lightweight unit checks for sport-aware team copy.
 * Run: npx tsx scripts/test-sport-labels.ts
 */
import assert from "node:assert/strict";
import {
  FLAGSHIP_SPORTS,
  formatActivityVersus,
  getSportLabels,
  normalizeSportKey,
} from "../shared/sportLabels";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

console.log("=== Sport labels unit tests ===\n");

test("normalizeSportKey handles spaces and case", () => {
  assert.equal(normalizeSportKey("  Track and Field "), "track_and_field");
  assert.equal(normalizeSportKey("MMA"), "mma");
});

test("flagship sports resolve distinct copy where expected", () => {
  const boxing = getSportLabels("Boxing");
  assert.equal(boxing.groupNoun, "Camp");
  assert.equal(boxing.logActivity, "Log bout");
  assert.equal(boxing.homeVenue, "Home gym");

  const running = getSportLabels("Running");
  assert.equal(running.groupNoun, "Crew");
  assert.equal(running.logActivity, "Log session");
  assert.equal(running.opponentLabel, "Event / route");

  const soccer = getSportLabels("Soccer");
  assert.equal(soccer.homeVenue, "Home pitch");
  assert.equal(soccer.logActivity, "Log game");
});

test("all flagship sports return complete label sets", () => {
  for (const sport of FLAGSHIP_SPORTS) {
    const labels = getSportLabels(sport);
    assert.ok(labels.groupNoun.length > 0, `${sport} groupNoun`);
    assert.ok(labels.memberNoun.length > 0, `${sport} memberNoun`);
    assert.ok(labels.logActivity.length > 0, `${sport} logActivity`);
    assert.ok(labels.homeVenue.length > 0, `${sport} homeVenue`);
  }
});

test("unknown sport falls back to defaults", () => {
  const labels = getSportLabels("UnderwaterBasketweaving");
  assert.equal(labels.groupNoun, "Team");
  assert.equal(labels.logActivity, "Log game");
});

test("family fallback applies for rugby", () => {
  const labels = getSportLabels("Rugby");
  assert.equal(labels.homeVenue, "Home field");
});

test("formatActivityVersus drops vs prefix for endurance sports", () => {
  assert.equal(formatActivityVersus(getSportLabels("Running"), "City 10K", "Running"), "City 10K");
  assert.equal(
    formatActivityVersus(getSportLabels("Soccer"), "Riverside FC", "Soccer"),
    "vs Riverside FC",
  );
});

console.log("\nAll sport label tests passed.");
