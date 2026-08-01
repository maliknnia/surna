/**
 * Phase 3 Task 4 — formation snap + empty pitch helpers.
 */
import assert from "node:assert/strict";
import {
  buildEmptyPitch,
  getFormationTemplate,
  snapCoordsToNearestSlot,
  assignBenchToSlot,
  clearPitchSlot,
  isPitchSlotFilled,
} from "../client/src/pages/pro/lib/tacticalFormations";
import { resolveFormationLayoutId } from "../shared/formationBoard";

function run() {
  console.log("— empty pitch starts unfilled —");
  const empty = buildEmptyPitch(getFormationTemplate("4-3-3"));
  assert.equal(empty.length, 11);
  assert.ok(empty.every((p) => !isPitchSlotFilled(p)));

  console.log("— snap near ST slot —");
  const template = getFormationTemplate("4-3-3");
  const st = template.slots.find((s) => s.role === "ST")!;
  const snapped = snapCoordsToNearestSlot(st.x + 3, st.y + 2, template, 9);
  assert.ok(snapped);
  assert.equal(snapped!.role, "ST");
  assert.equal(snapped!.x, st.x);

  const far = snapCoordsToNearestSlot(5, 5, template, 3);
  assert.equal(far, null);

  console.log("— assign / clear slot —");
  const slot = empty[0];
  const filled = assignBenchToSlot(slot, {
    id: "p1",
    userId: "u1",
    name: "Ada",
    number: 1,
    photoUrl: "https://example.com/a.jpg",
  });
  assert.ok(isPitchSlotFilled(filled));
  assert.equal(filled.photoUrl, "https://example.com/a.jpg");
  assert.ok(!isPitchSlotFilled(clearPitchSlot(filled, "GK")));

  console.log("— football-grid / gaa-lines resolve —");
  assert.equal(
    resolveFormationLayoutId({ teamSport: "Soccer", formationLayout: "football-grid" }),
    "football",
  );
  assert.equal(
    resolveFormationLayoutId({ teamSport: "GAA", formationLayout: "gaa-lines" }),
    "gaa",
  );

  const gaaEmpty = buildEmptyPitch(getFormationTemplate("gaa-15"));
  assert.equal(gaaEmpty.length, 15);

  console.log("OK — formation builder Task 4 helpers");
}

run();
