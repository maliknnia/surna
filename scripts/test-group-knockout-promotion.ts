/**
 * Phase 2 Task 1 — group→knockout promotion.
 * Pure end-to-end case: 8 teams, 2 groups of 4 → top 2 each → SF pairings.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import {
  buildCrossGroupKnockoutPairings,
  compareStandings,
  computeGroupStandings,
  groupFixturesComplete,
  knockoutFixturesExist,
  selectGroupAdvancers,
  type FixtureRow,
  type RegistrationRow,
  type StandingRow,
} from "../server/services/tournamentService";

function standing(partial: Partial<StandingRow> & { teamId: string; teamName: string }): StandingRow {
  return {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
    ...partial,
  };
}

function fixture(partial: Partial<FixtureRow> & Pick<FixtureRow, "id" | "homeTeamId" | "awayTeamId" | "homeTeamName" | "awayTeamName">): FixtureRow {
  return {
    tournamentId: "t1",
    round: 1,
    groupName: null,
    scheduledAt: new Date().toISOString(),
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    isFinal: false,
    weightClass: null,
    homeUserId: null,
    awayUserId: null,
    ...partial,
  };
}

function score(f: FixtureRow, home: number, away: number): FixtureRow {
  return { ...f, homeScore: home, awayScore: away, status: "played" };
}

/** Round-robin for 4 teams in a group → 6 fixtures. */
function groupRoundRobin(group: string, teams: { id: string; name: string }[]): FixtureRow[] {
  const out: FixtureRow[] = [];
  let n = 0;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      out.push(
        fixture({
          id: `${group}-${n++}`,
          groupName: group,
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
          homeTeamName: teams[i].name,
          awayTeamName: teams[j].name,
        }),
      );
    }
  }
  return out;
}

function run() {
  console.log("— 4-group pairing rule —");
  const g4 = ["A", "B", "C", "D"].flatMap((g) => [
    { groupName: g, seed: 1, team: standing({ teamId: `${g}1`, teamName: `${g}1` }) },
    { groupName: g, seed: 2, team: standing({ teamId: `${g}2`, teamName: `${g}2` }) },
  ]);
  const pairs4 = buildCrossGroupKnockoutPairings(g4);
  assert.equal(pairs4.length, 4);
  const labels4 = pairs4.map(([h, a]) => `${h.groupName}${h.seed}-${a.groupName}${a.seed}`);
  assert.deepEqual(labels4, ["A1-B2", "C1-D2", "B1-A2", "D1-C2"]);
  console.log("PASS  4-group QF order:", labels4.join(", "));

  console.log("— 8-team / 2-group end-to-end —");
  const groupA = [
    { id: "a1", name: "Alpha FC" },
    { id: "a2", name: "Aston" },
    { id: "a3", name: "Arklow" },
    { id: "a4", name: "Athlone" },
  ];
  const groupB = [
    { id: "b1", name: "Bray" },
    { id: "b2", name: "Ballsbridge" },
    { id: "b3", name: "Blackrock" },
    { id: "b4", name: "Bandon" },
  ];
  const regs: RegistrationRow[] = [...groupA, ...groupB].map((t) => ({
    id: `r-${t.id}`,
    tournamentId: "t1",
    teamId: t.id,
    teamName: t.name,
    status: "approved",
    paymentIntentId: null,
    registeredAt: new Date().toISOString(),
    registeredByUserId: null,
    teamGoals: "",
    notes: "",
    contactEmail: "",
  }));

  let fixtures = [...groupRoundRobin("A", groupA), ...groupRoundRobin("B", groupB)];
  assert.equal(fixtures.length, 12);
  assert.equal(groupFixturesComplete(fixtures), false);

  // Deterministic results: Alpha & Aston top Group A; Bray & Ballsbridge top Group B
  const results: Record<string, [number, number]> = {
    // A: a1 beats everyone; a2 beats a3,a4; a3 beats a4
    "A-0": [2, 0], // a1-a2 → Alpha
    "A-1": [3, 1], // a1-a3
    "A-2": [4, 0], // a1-a4
    "A-3": [2, 1], // a2-a3
    "A-4": [2, 0], // a2-a4
    "A-5": [1, 0], // a3-a4
    // B: b1 beats all; b2 beats b3,b4; b3 beats b4
    "B-0": [2, 0],
    "B-1": [3, 0],
    "B-2": [1, 0],
    "B-3": [2, 1],
    "B-4": [3, 0],
    "B-5": [2, 0],
  };
  fixtures = fixtures.map((f) => {
    const [h, a] = results[f.id];
    return score(f, h, a);
  });

  assert.equal(groupFixturesComplete(fixtures), true);
  assert.equal(knockoutFixturesExist(fixtures), false);

  const blocks = computeGroupStandings(fixtures, regs);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].groupName, "A");
  assert.equal(blocks[0].standings[0].teamId, "a1");
  assert.equal(blocks[0].standings[1].teamId, "a2");
  assert.equal(blocks[1].standings[0].teamId, "b1");
  assert.equal(blocks[1].standings[1].teamId, "b2");
  console.log(
    "PASS  Group A:",
    blocks[0].standings.map((s) => `${s.teamName}(${s.points}pts)`).join(", "),
  );
  console.log(
    "PASS  Group B:",
    blocks[1].standings.map((s) => `${s.teamName}(${s.points}pts)`).join(", "),
  );

  const advancers = selectGroupAdvancers(blocks, 2);
  assert.equal(advancers.length, 4);
  const pairs = buildCrossGroupKnockoutPairings(advancers);
  assert.equal(pairs.length, 2);
  assert.equal(pairs[0][0].team.teamId, "a1");
  assert.equal(pairs[0][1].team.teamId, "b2");
  assert.equal(pairs[1][0].team.teamId, "b1");
  assert.equal(pairs[1][1].team.teamId, "a2");
  console.log(
    "PASS  Knockout semis:",
    pairs.map(([h, a]) => `${h.team.teamName} vs ${a.team.teamName}`).join(" | "),
  );

  console.log("— Tie-break: GD over equal points —");
  const tFixtures = [
    score(
      fixture({
        id: "t1",
        groupName: "X",
        homeTeamId: "p",
        awayTeamId: "q",
        homeTeamName: "P",
        awayTeamName: "Q",
      }),
      3,
      0,
    ),
    score(
      fixture({
        id: "t2",
        groupName: "X",
        homeTeamId: "p",
        awayTeamId: "r",
        homeTeamName: "P",
        awayTeamName: "R",
      }),
      1,
      0,
    ),
    score(
      fixture({
        id: "t3",
        groupName: "X",
        homeTeamId: "q",
        awayTeamId: "r",
        homeTeamName: "Q",
        awayTeamName: "R",
      }),
      2,
      0,
    ),
  ];
  // P: W W (6pts, GD +4); Q: L W (3pts); R: L L (0)
  // Force equal points P and Q with different GD via compareStandings unit check
  const p = standing({ teamId: "p", teamName: "P", points: 4, gf: 5, ga: 1 });
  const q = standing({ teamId: "q", teamName: "Q", points: 4, gf: 3, ga: 2 });
  assert.ok(compareStandings(p, q, tFixtures) < 0, "P should rank above Q on GD");
  console.log("PASS  GD tie-break");

  console.log("\nAll group→knockout promotion checks passed.");
}

run();
