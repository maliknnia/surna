/**
 * Phase 3 Task 3 — formation board contract (pure, no DB).
 */
import "dotenv/config";
import assert from "node:assert/strict";
import {
  formationLayoutToLayoutId,
  getArchetypesForLayout,
  normalizeFormationLayoutJson,
  resolveFormationLayoutId,
  TACTICAL_ARCHETYPES,
} from "../shared/formationBoard";
import { getFormationDef, getFormationsForLayout } from "../shared/sportTacticalLayouts";
import { prepareFormationWrite } from "../server/services/formationBoardService";

function run() {
  console.log("— formationLayout → layoutId —");
  assert.equal(formationLayoutToLayoutId("football-grid"), "football");
  assert.equal(formationLayoutToLayoutId("gaa-lines"), "gaa");
  assert.equal(formationLayoutToLayoutId(null), null);

  assert.equal(
    resolveFormationLayoutId({ teamSport: "Soccer", formationLayout: "football-grid" }),
    "football",
  );
  assert.equal(
    resolveFormationLayoutId({ teamSport: "GAA Football", formationLayout: "gaa-lines" }),
    "gaa",
  );
  // Fallback when config missing
  assert.equal(resolveFormationLayoutId({ teamSport: "Soccer", formationLayout: null }), "football");
  assert.equal(resolveFormationLayoutId({ teamSport: "Hurling", formationLayout: null }), "gaa");
  assert.equal(resolveFormationLayoutId({ teamSport: "Boxing", formationLayout: null }), null);

  console.log("— shape presets include 5-3-2 / 5-4-1 —");
  const footballKeys = getFormationsForLayout("football").map((f) => f.key);
  assert.ok(footballKeys.includes("4-3-3"));
  assert.ok(footballKeys.includes("5-3-2"));
  assert.ok(footballKeys.includes("5-4-1"));
  assert.equal(getFormationDef("5-3-2").slots.length, 11);
  assert.equal(getFormationDef("5-4-1").slots.length, 11);

  console.log("— archetypes are constants —");
  assert.ok(TACTICAL_ARCHETYPES.some((a) => a.key === "tiki-taka-433"));
  assert.ok(TACTICAL_ARCHETYPES.some((a) => a.key === "gegenpress-4231"));
  assert.ok(TACTICAL_ARCHETYPES.some((a) => a.key === "park-the-bus-541"));
  assert.equal(getArchetypesForLayout("football").length >= 3, true);
  assert.equal(getArchetypesForLayout("gaa").some((a) => a.formationKey === "gaa-15"), true);

  console.log("— layout_json normalize + benchOrder —");
  const layout = normalizeFormationLayoutJson({
    formationKey: "4-3-3",
    layoutId: "football",
    players: [{ name: "A", number: 9, role: "ST", x: 50, y: 18, userId: "u1" }],
    benchOrder: ["u2", "u3"],
  });
  assert.equal(layout.benchOrder.length, 2);
  assert.equal(layout.players[0].x, 50);

  console.log("— prepareFormationWrite validates shape —");
  const prepared = prepareFormationWrite({
    layoutJson: {
      formationKey: "4-3-3",
      layoutId: "football",
      players: [{ name: "A", number: 1, role: "GK", x: 50, y: 90, userId: "gk" }],
      benchOrder: ["sub1"],
    },
  });
  assert.equal(prepared.sportType, "football");
  assert.equal(prepared.layoutJson.benchOrder[0], "sub1");

  assert.throws(
    () =>
      prepareFormationWrite({
        layoutJson: { formationKey: "gaa-15", layoutId: "football", players: [], benchOrder: [] },
      }),
    /not valid/,
  );

  const arch = prepareFormationWrite({ archetypeKey: "park-the-bus-541", layoutJson: {} });
  assert.equal(arch.layoutJson.formationKey, "5-4-1");
  assert.equal(arch.layoutJson.archetypeKey, "park-the-bus-541");
  assert.equal(arch.name, "Park the Bus 5-4-1");

  console.log("OK — formation board Task 3");
}

run();
