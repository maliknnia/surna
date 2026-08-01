/**
 * Phase 2 Task 2 — boxing weight-class brackets.
 * Pure cases: even-only pairing, separate brackets per class, no BYE.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { buildWeightClassKnockoutPairings } from "../server/services/tournamentService";
import {
  BOXING_WEIGHT_CLASSES,
  isBoxingWeightClass,
  boxingWeightClassLabel,
} from "../shared/boxingWeightClasses";

function fighters(n: number, prefix: string) {
  return Array.from({ length: n }, (_, i) => ({
    userId: `${prefix}-${i + 1}`,
    displayName: `${prefix} ${i + 1}`,
  }));
}

function run() {
  console.log("— weight class enum —");
  assert.ok(isBoxingWeightClass("welterweight"));
  assert.equal(isBoxingWeightClass("super_heavyweight"), false);
  assert.equal(boxingWeightClassLabel("light_heavyweight"), "Light Heavyweight");
  assert.ok(BOXING_WEIGHT_CLASSES.includes("flyweight"));

  console.log("— even-only (no BYE) —");
  assert.throws(() => buildWeightClassKnockoutPairings(fighters(3, "odd"), "lightweight"), /even number/);
  assert.throws(() => buildWeightClassKnockoutPairings(fighters(1, "solo"), "lightweight"), /at least 2/);

  const sf = buildWeightClassKnockoutPairings(fighters(4, "LW"), "lightweight");
  assert.equal(sf.length, 2);
  assert.ok(sf.every((p) => p.weightClass === "lightweight"));
  assert.ok(sf.every((p) => !p.isFinal));

  const finalOnly = buildWeightClassKnockoutPairings(fighters(2, "HW"), "heavyweight");
  assert.equal(finalOnly.length, 1);
  assert.equal(finalOnly[0].isFinal, true);
  assert.equal(finalOnly[0].weightClass, "heavyweight");

  console.log("— 3 weight classes stay separate —");
  const classes = [
    { wc: "bantamweight" as const, n: 4 },
    { wc: "welterweight" as const, n: 2 },
    { wc: "heavyweight" as const, n: 4 },
  ];
  const allPairings = classes.flatMap(({ wc, n }) =>
    buildWeightClassKnockoutPairings(fighters(n, wc), wc),
  );
  assert.equal(allPairings.length, 2 + 1 + 2);

  for (const { wc } of classes) {
    const scoped = allPairings.filter((p) => p.weightClass === wc);
    const ids = new Set<string>();
    for (const p of scoped) {
      assert.equal(p.weightClass, wc);
      ids.add(p.home.userId);
      ids.add(p.away.userId);
    }
    for (const id of ids) {
      assert.ok(id.startsWith(wc), `fighter ${id} must stay in ${wc}`);
    }
  }

  // Cross-class bleed: no welterweight fighter appears in another class bracket
  const welterIds = new Set(
    allPairings
      .filter((p) => p.weightClass === "welterweight")
      .flatMap((p) => [p.home.userId, p.away.userId]),
  );
  for (const p of allPairings.filter((p) => p.weightClass !== "welterweight")) {
    assert.ok(!welterIds.has(p.home.userId));
    assert.ok(!welterIds.has(p.away.userId));
  }

  console.log("OK — weight-class brackets");
}

run();
