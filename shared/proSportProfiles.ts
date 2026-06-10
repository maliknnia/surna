/**
 * Sport-specific Pro profiles — rules, rosters, drills, stats (shared client + server).
 * Rule references: FIFA Laws (soccer), FIBA (basketball), World Rugby, GAA, FIVB, etc.
 */

import type { SportTacticalLayoutId } from "./sportTacticalLayouts";
import { layoutIdForSportFamily } from "./sportTacticalLayouts";

export type SportFamily =
  | "football"
  | "gaa"
  | "basketball"
  | "rugby"
  | "volleyball"
  | "tennis"
  | "cricket"
  | "hockey"
  | "baseball"
  | "handball"
  | "water_polo"
  | "american_football"
  | "combat"
  | "racquet"
  | "individual"
  | "generic";

export type DrillTemplate = {
  id: string;
  name: string;
  category: string;
  duration: string;
  players: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
};

export type ProSportProfile = {
  family: SportFamily;
  displayName: string;
  governingBody: string;
  /** Key rules coaches need on match day */
  rulesSummary: string[];
  playersOnField: number;
  squadMin: number;
  squadMax: number;
  matchDuration: string;
  periods: string;
  positions: string[];
  kitHints: string[];
  drillCategories: string[];
  defaultDrills: DrillTemplate[];
  /** Labels for Pro stats dashboard */
  statLabels: string[];
  /** Draggable tactical surface (pitch/court/field) — FIFA-style board when set */
  tacticalLayout: SportTacticalLayoutId | null;
  supportsTacticalBoard: boolean;
  supportsMatchDay: boolean;
  matchDayLabel: string;
  scheduleLabel: string;
  trainingSessionTemplates: Array<{ focus: string; intensity: "low" | "medium" | "high"; duration: string }>;
  rosterHint: string;
  kitRequirements: string[];
};

function norm(s: string) {
  return (s || "").toLowerCase().trim();
}

/** Map any team.sport string → sport family. */
export function resolveSportFamily(teamSport: string): SportFamily {
  const s = norm(teamSport);
  if (!s) return "generic";
  if (s.includes("gaa") || s.includes("hurling") || s.includes("camogie") || s.includes("gaelic")) return "gaa";
  if (s.includes("soccer") || s.includes("futsal") || s === "football" || s.includes("association")) return "football";
  if (s.includes("american") || s.includes("gridiron") || s.includes("nfl")) return "american_football";
  if (s.includes("basketball")) return "basketball";
  if (s.includes("rugby")) return "rugby";
  if (s.includes("volleyball")) return "volleyball";
  if (s.includes("tennis") || s.includes("pickleball")) return "tennis";
  if (s.includes("cricket")) return "cricket";
  if (s.includes("hockey") || s.includes("ice hockey")) return "hockey";
  if (s.includes("baseball") || s.includes("softball")) return "baseball";
  if (s.includes("handball")) return "handball";
  if (s.includes("water polo")) return "water_polo";
  if (
    s.includes("boxing") ||
    s.includes("martial") ||
    s.includes("karate") ||
    s.includes("judo") ||
    s.includes("wrestling") ||
    s.includes("mma") ||
    s.includes("kickboxing") ||
    s.includes("fencing")
  ) {
    return "combat";
  }
  if (s.includes("badminton") || s.includes("squash") || s.includes("racquet") || s.includes("table tennis")) {
    return "racquet";
  }
  if (
    s.includes("swim") ||
    s.includes("run") ||
    s.includes("cycl") ||
    s.includes("golf") ||
    s.includes("track") ||
    s.includes("climb") ||
    s.includes("ski") ||
    s.includes("skate")
  ) {
    return "individual";
  }
  return "generic";
}

const PROFILES: Record<SportFamily, ProSportProfile> = {
  football: {
    family: "football",
    displayName: "Soccer / Football",
    governingBody: "FIFA / IFAB",
    rulesSummary: [
      "11 players per side on the field",
      "Two halves of 45 minutes (+ stoppage time)",
      "Offside applies when ahead of ball and second-last defender",
      "Max 5 substitutions per match (competition rules vary)",
      "Yellow/red cards for misconduct; second yellow = red",
    ],
    playersOnField: 11,
    squadMin: 11,
    squadMax: 23,
    matchDuration: "90 min (+ stoppage)",
    periods: "2 × 45 min, 15 min half-time",
    positions: ["GK", "RB", "CB", "CB", "LB", "CDM", "CM", "CM", "RW", "ST", "LW"],
    kitHints: ["Home kit", "Away kit", "Match balls", "Training bibs", "Shin guards", "Goalkeeper gloves"],
    drillCategories: ["Warm-up", "Technical", "Tactical", "Conditioning", "Set Pieces"],
    defaultDrills: [
      { id: "fb-d1", name: "Rondo 5v2", category: "Technical", duration: "12m", players: "7", difficulty: 2 },
      { id: "fb-d2", name: "Pressing trigger drill", category: "Tactical", duration: "20m", players: "11+", difficulty: 4 },
      { id: "fb-d3", name: "Dynamic warm-up", category: "Warm-up", duration: "15m", players: "Any", difficulty: 1 },
      { id: "fb-d4", name: "Corner routines", category: "Set Pieces", duration: "25m", players: "11", difficulty: 3 },
      { id: "fb-d5", name: "Sprint intervals 6×40m", category: "Conditioning", duration: "18m", players: "Any", difficulty: 4 },
      { id: "fb-d6", name: "1v1 attacking duels", category: "Technical", duration: "15m", players: "Pairs", difficulty: 3 },
    ],
    statLabels: ["Goals", "Assists", "Shots on target", "Pass accuracy", "Distance covered", "Clean sheets"],
    tacticalLayout: "football",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Match day",
    scheduleLabel: "Fixtures & training",
    trainingSessionTemplates: [
      { focus: "High press & transitions", intensity: "high", duration: "90m" },
      { focus: "Possession patterns", intensity: "medium", duration: "90m" },
      { focus: "Set pieces — corners & free kicks", intensity: "low", duration: "75m" },
    ],
    rosterHint: "11 on pitch; squad 16–23 recommended",
    kitRequirements: ["Home & away kit", "Shin guards", "Match balls", "Goalkeeper gloves"],
  },
  gaa: {
    family: "gaa",
    displayName: "GAA",
    governingBody: "GAA",
    rulesSummary: [
      "15 players per side (football); hurling uses sliotar and hurley",
      "Two halves of 30–35 minutes (grade dependent)",
      "Handpass/fist-pass rules; solo and bounce limits apply",
      "Helmets and gum shields mandatory for hurling/camogie",
      "Black card for cynical fouls; sin-bin periods apply",
    ],
    playersOnField: 15,
    squadMin: 15,
    squadMax: 30,
    matchDuration: "60–70 min",
    periods: "2 halves (30–35 min each)",
    positions: ["GK", "RHB", "FB", "FB", "LHB", "MF", "MF", "MF", "RHF", "HF", "HF", "LHF", "MF", "FF", "FF"],
    kitHints: ["Sliotars/footballs", "Hurls", "Helmets", "Gum shields", "Training bibs"],
    drillCategories: ["Warm-up", "Skills", "Tactical", "Conditioning", "Restarts"],
    defaultDrills: [
      { id: "gaa-d1", name: "Handpass relay", category: "Skills", duration: "10m", players: "8+", difficulty: 2 },
      { id: "gaa-d2", name: "Kick-out press", category: "Tactical", duration: "20m", players: "15", difficulty: 4 },
      { id: "gaa-d3", name: "Solo & bounce circuit", category: "Skills", duration: "15m", players: "Any", difficulty: 2 },
      { id: "gaa-d4", name: "45m free routine", category: "Restarts", duration: "20m", players: "11", difficulty: 3 },
    ],
    statLabels: ["Scores", "Turnovers won", "Kick-outs won", "Possession %", "Fouls conceded", "Distance"],
    tacticalLayout: "gaa",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Match day",
    scheduleLabel: "GAA fixtures & training",
    trainingSessionTemplates: [
      { focus: "Kick-out & restart patterns", intensity: "high", duration: "90m" },
      { focus: "Handpass chains & support runs", intensity: "medium", duration: "85m" },
      { focus: "Skills & point shooting", intensity: "medium", duration: "75m" },
    ],
    rosterHint: "15 match day; panel of 24–30",
    kitRequirements: ["Helmets", "Gum shields", "Matching jerseys", "Sliotars / footballs"],
  },
  basketball: {
    family: "basketball",
    displayName: "Basketball",
    governingBody: "FIBA",
    rulesSummary: [
      "5 players on court per team",
      "Roster max 12 players (FIBA); NBA allows 15",
      "4 quarters of 10 minutes (FIBA) or 12 (NBA)",
      "24-second shot clock; 8-second backcourt violation",
      "5 personal fouls = foul out; team fouls → bonus free throws",
    ],
    playersOnField: 5,
    squadMin: 5,
    squadMax: 12,
    matchDuration: "40 min (FIBA)",
    periods: "4 × 10 min",
    positions: ["PG", "SG", "SF", "PF", "C"],
    kitHints: ["Matching kits", "Basketballs", "Pump", "First-aid kit", "Water bottles"],
    drillCategories: ["Warm-up", "Ball handling", "Shooting", "Defense", "Conditioning", "Sets"],
    defaultDrills: [
      { id: "bb-d1", name: "Shell drill 2v2", category: "Defense", duration: "15m", players: "4+", difficulty: 3 },
      { id: "bb-d2", name: "Catch-and-shoot series", category: "Shooting", duration: "20m", players: "5+", difficulty: 2 },
      { id: "bb-d3", name: "Full-court transition", category: "Sets", duration: "18m", players: "10", difficulty: 4 },
      { id: "bb-d4", name: "Lane agility ladder", category: "Warm-up", duration: "10m", players: "Any", difficulty: 1 },
    ],
    statLabels: ["Points", "Rebounds", "Assists", "Steals", "FG%", "FT%"],
    tacticalLayout: "basketball",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Game day",
    scheduleLabel: "Games & practice",
    trainingSessionTemplates: [
      { focus: "Pick-and-roll offense", intensity: "high", duration: "90m" },
      { focus: "Zone defense rotations", intensity: "medium", duration: "85m" },
      { focus: "Free throws & late-game sets", intensity: "low", duration: "60m" },
    ],
    rosterHint: "5 on court; roster 8–12",
    kitRequirements: ["Matching kits", "Basketballs", "First-aid kit"],
  },
  rugby: {
    family: "rugby",
    displayName: "Rugby",
    governingBody: "World Rugby",
    rulesSummary: [
      "15 players per side (union)",
      "Two halves of 40 minutes",
      "Forward pass not allowed; knock-on = scrum",
      "Tackle must be below shoulder line; offside at ruck/maul",
      "Up to 8 replacements (elite competitions)",
    ],
    playersOnField: 15,
    squadMin: 15,
    squadMax: 23,
    matchDuration: "80 min",
    periods: "2 × 40 min, ≤15 min half-time",
    positions: ["1–15 numbered pack & backs"],
    kitHints: ["Mouth guards", "Boots", "Matching jerseys", "Match balls", "Scrum caps (optional)"],
    drillCategories: ["Warm-up", "Contact", "Set piece", "Phase play", "Conditioning", "Kicking"],
    defaultDrills: [
      { id: "rg-d1", name: "Lineout timing", category: "Set piece", duration: "20m", players: "15", difficulty: 3 },
      { id: "rg-d2", name: "Ruck clear-out", category: "Contact", duration: "15m", players: "8+", difficulty: 4 },
      { id: "rg-d3", name: "Kick chase & exit", category: "Kicking", duration: "18m", players: "11", difficulty: 3 },
    ],
    statLabels: ["Tries", "Conversions", "Penalties", "Turnovers", "Tackles made", "Lineouts won"],
    tacticalLayout: "rugby",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Match day",
    scheduleLabel: "Fixtures & training",
    trainingSessionTemplates: [
      { focus: "Lineout & maul attack", intensity: "high", duration: "90m" },
      { focus: "Phase-play continuity", intensity: "medium", duration: "85m" },
      { focus: "Kicking & restarts", intensity: "medium", duration: "75m" },
    ],
    rosterHint: "15 match day; squad 22–23",
    kitRequirements: ["Mouth guards", "Boots", "Matching jerseys", "Match balls"],
  },
  volleyball: {
    family: "volleyball",
    displayName: "Volleyball",
    governingBody: "FIVB",
    rulesSummary: [
      "6 players on court; libero rules apply",
      "Best of 5 sets to 25 (15 for 5th set)",
      "Rotation order must be maintained",
      "Max 3 touches before ball crosses net",
      "Block does not count as a touch",
    ],
    playersOnField: 6,
    squadMin: 6,
    squadMax: 12,
    matchDuration: "60–90 min",
    periods: "Best of 5 sets",
    positions: ["S", "OH", "MB", "MB", "OH", "OPP", "L (libero)"],
    kitHints: ["Knee pads", "Matching kits", "Match balls", "Net system"],
    drillCategories: ["Warm-up", "Serve receive", "Setting", "Attack", "Block", "Conditioning"],
    defaultDrills: [
      { id: "vb-d1", name: "Serve receive triangle", category: "Serve receive", duration: "15m", players: "6", difficulty: 2 },
      { id: "vb-d2", name: "Quick-set middle attack", category: "Attack", duration: "18m", players: "6+", difficulty: 3 },
      { id: "vb-d3", name: "Block transition", category: "Block", duration: "15m", players: "6", difficulty: 4 },
    ],
    statLabels: ["Aces", "Kills", "Blocks", "Digs", "Errors", "Side-out %"],
    tacticalLayout: "volleyball",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Match day",
    scheduleLabel: "Matches & practice",
    trainingSessionTemplates: [
      { focus: "Serve & receive patterns", intensity: "high", duration: "90m" },
      { focus: "Middle quick & pipe attack", intensity: "medium", duration: "80m" },
    ],
    rosterHint: "6 on court; roster 8–10",
    kitRequirements: ["Knee pads", "Matching kits", "Match balls", "Net system"],
  },
  tennis: {
    family: "tennis",
    displayName: "Tennis",
    governingBody: "ITF",
    rulesSummary: [
      "Singles (1v1) or doubles (2v2)",
      "Best of 3 or 5 sets; tiebreak at 6–6 (most formats)",
      "Two serves per point; let on net cord",
      "Change ends every odd game; break every 2 sets",
    ],
    playersOnField: 1,
    squadMin: 1,
    squadMax: 4,
    matchDuration: "1–3 hours",
    periods: "Sets & tiebreaks",
    positions: ["Player 1", "Player 2 (doubles)"],
    kitHints: ["Rackets", "Balls", "Court booking", "Towels", "Grip tape"],
    drillCategories: ["Warm-up", "Groundstrokes", "Serve", "Volley", "Match play", "Fitness"],
    defaultDrills: [
      { id: "tn-d1", name: "Cross-court rally", category: "Groundstrokes", duration: "15m", players: "2+", difficulty: 2 },
      { id: "tn-d2", name: "Serve + first ball", category: "Serve", duration: "20m", players: "1–2", difficulty: 3 },
      { id: "tn-d3", name: "Doubles poach drill", category: "Volley", duration: "15m", players: "4", difficulty: 3 },
    ],
    statLabels: ["Aces", "Winners", "Unforced errors", "1st serve %", "Break points", "Match time"],
    tacticalLayout: "tennis",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Match day",
    scheduleLabel: "Matches & practice",
    trainingSessionTemplates: [
      { focus: "Serve patterns & returns", intensity: "high", duration: "90m" },
      { focus: "Movement & endurance", intensity: "medium", duration: "75m" },
    ],
    rosterHint: "Singles or doubles pair",
    kitRequirements: ["Rackets", "Balls", "Court booking"],
  },
  cricket: {
    family: "cricket",
    displayName: "Cricket",
    governingBody: "MCC / ICC",
    rulesSummary: [
      "11 players per side",
      "Formats: T20 (20 overs), ODI (50), Test (multi-day)",
      "Bowlers over limits in limited-overs cricket",
      "LBW, caught, run out, stumped dismissal methods",
      "Powerplay overs in white-ball cricket",
    ],
    playersOnField: 11,
    squadMin: 11,
    squadMax: 15,
    matchDuration: "3–8 hours (format dependent)",
    periods: "Innings / overs",
    positions: ["Batter", "Bowler", "WK", "All-rounder", "Fielder"],
    kitHints: ["Pads", "Helmets", "Bats", "Balls", "Stumps", "Whites/coloured kit"],
    drillCategories: ["Warm-up", "Batting", "Bowling", "Fielding", "Game scenarios", "Fitness"],
    defaultDrills: [
      { id: "cr-d1", name: "Net batting vs swing", category: "Batting", duration: "25m", players: "6+", difficulty: 3 },
      { id: "cr-d2", name: "Yorker & death bowling", category: "Bowling", duration: "20m", players: "4+", difficulty: 4 },
      { id: "cr-d3", name: "High catch & relay", category: "Fielding", duration: "15m", players: "8+", difficulty: 2 },
    ],
    statLabels: ["Runs", "Wickets", "Economy", "Strike rate", "Catches", "Extras"],
    tacticalLayout: "cricket",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Match day",
    scheduleLabel: "Fixtures & nets",
    trainingSessionTemplates: [
      { focus: "Powerplay batting plans", intensity: "high", duration: "120m" },
      { focus: "Death bowling & field sets", intensity: "high", duration: "90m" },
    ],
    rosterHint: "11 on field; squad 13–15",
    kitRequirements: ["Pads", "Helmets", "Bats", "Balls", "Stumps"],
  },
  hockey: {
    family: "hockey",
    displayName: "Hockey",
    governingBody: "FIH / IIHF",
    rulesSummary: [
      "Field: 11 per side; Ice: 6 per side (including goalie)",
      "Field hockey: 4 quarters × 15 min; Ice: 3 periods × 20 min",
      "No feet in field hockey; icing/offside rules in ice hockey",
      "Penalty corners (field) or power plays (ice)",
    ],
    playersOnField: 11,
    squadMin: 11,
    squadMax: 18,
    matchDuration: "60–70 min",
    periods: "Quarters or periods (format dependent)",
    positions: ["GK", "DEF", "MID", "FWD"],
    kitHints: ["Sticks", "Shin guards", "Mouth guards", "Match balls/pucks", "Goalie kit"],
    drillCategories: ["Warm-up", "Skills", "Set piece", "Transition", "Conditioning"],
    defaultDrills: [
      { id: "hk-d1", name: "Penalty corner routine", category: "Set piece", duration: "20m", players: "11", difficulty: 3 },
      { id: "hk-d2", name: "Outlet under press", category: "Transition", duration: "18m", players: "8+", difficulty: 4 },
    ],
    statLabels: ["Goals", "PC conversion", "Circle entries", "Tackles", "Cards", "Possession %"],
    tacticalLayout: "hockey",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Match day",
    scheduleLabel: "Fixtures & training",
    trainingSessionTemplates: [
      { focus: "Penalty corner attack & defense", intensity: "high", duration: "90m" },
      { focus: "Pressing & counter", intensity: "medium", duration: "85m" },
    ],
    rosterHint: "11 on pitch; squad 16–18",
    kitRequirements: ["Sticks", "Shin guards", "Goalie kit", "Balls/pucks"],
  },
  baseball: {
    family: "baseball",
    displayName: "Baseball",
    governingBody: "MLB / WBSC",
    rulesSummary: [
      "9 players on defense; batting order of 9+ (DH optional)",
      "9 innings; extra innings if tied",
      "3 outs per half-inning; 3 strikes / 4 balls",
      "Force plays, tag ups, and balk rules for pitchers",
    ],
    playersOnField: 9,
    squadMin: 9,
    squadMax: 26,
    matchDuration: "2.5–3.5 hours",
    periods: "9 innings",
    positions: ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"],
    kitHints: ["Bats", "Gloves", "Helmets", "Baseballs", "Catcher gear"],
    drillCategories: ["Warm-up", "Hitting", "Fielding", "Pitching", "Base running", "Situations"],
    defaultDrills: [
      { id: "bb-d1", name: "BP — opposite field", category: "Hitting", duration: "25m", players: "Team", difficulty: 2 },
      { id: "bb-d2", name: "Double-play feeds", category: "Fielding", duration: "20m", players: "Infield", difficulty: 3 },
      { id: "bb-d3", name: "Bullpen — command", category: "Pitching", duration: "30m", players: "Pitchers", difficulty: 4 },
    ],
    statLabels: ["Runs", "Hits", "ERA", "OBP", "Errors", "Stolen bases"],
    tacticalLayout: "baseball",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Game day",
    scheduleLabel: "Games & practice",
    trainingSessionTemplates: [
      { focus: "Situation defense (1st & 3rd)", intensity: "medium", duration: "120m" },
      { focus: "Hitting approach vs breaking balls", intensity: "high", duration: "90m" },
    ],
    rosterHint: "9 on field; roster 13–26",
    kitRequirements: ["Bats", "Gloves", "Helmets", "Baseballs"],
  },
  handball: {
    family: "handball",
    displayName: "Handball",
    governingBody: "IHF",
    rulesSummary: [
      "7 players per side (6 outfield + GK)",
      "Two halves of 30 minutes",
      "3-step rule; no entering goal area (6m)",
      "Passive play can be whistled",
    ],
    playersOnField: 7,
    squadMin: 7,
    squadMax: 14,
    matchDuration: "60 min",
    periods: "2 × 30 min",
    positions: ["GK", "LW", "LB", "CB", "RB", "RW", "P"],
    kitHints: ["Resin (if allowed)", "Matching kits", "Match balls", "Knee pads"],
    drillCategories: ["Warm-up", "Fast break", "Set play", "Defense", "Goalkeeping", "Conditioning"],
    defaultDrills: [
      { id: "hb-d1", name: "7v6 fast break", category: "Fast break", duration: "18m", players: "7+", difficulty: 3 },
      { id: "hb-d2", name: "6-0 defense shift", category: "Defense", duration: "20m", players: "7", difficulty: 4 },
    ],
    statLabels: ["Goals", "Saves", "7m conversion", "Steals", "Turnovers", "Suspensions"],
    tacticalLayout: "handball",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Match day",
    scheduleLabel: "Fixtures & training",
    trainingSessionTemplates: [{ focus: "Fast break & pivot play", intensity: "high", duration: "90m" }],
    rosterHint: "7 on court; roster 12–14",
    kitRequirements: ["Matching kits", "Match balls", "Knee pads"],
  },
  water_polo: {
    family: "water_polo",
    displayName: "Water Polo",
    governingBody: "FINA",
    rulesSummary: [
      "7 players per side (6 field + GK)",
      "Four quarters of 8 minutes",
      "30-second shot clock",
      "Major/exclusion fouls → 20s man-down",
    ],
    playersOnField: 7,
    squadMin: 7,
    squadMax: 13,
    matchDuration: "32 min playing time",
    periods: "4 × 8 min",
    positions: ["GK", "CF", "Wings", "Drivers", "Point"],
    kitHints: ["Caps", "Balls", "Goals", "Swim gear"],
    drillCategories: ["Swim sets", "Man-up", "Press", "Shooting", "Goalkeeping"],
    defaultDrills: [
      { id: "wp-d1", name: "Man-up 6v5", category: "Man-up", duration: "20m", players: "7+", difficulty: 4 },
      { id: "wp-d2", name: "Counter sprint & finish", category: "Shooting", duration: "15m", players: "6+", difficulty: 3 },
    ],
    statLabels: ["Goals", "Saves", "Exclusions", "Man-up %", "Steals", "Sprints"],
    tacticalLayout: "water_polo",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Match day",
    scheduleLabel: "Fixtures & pool sessions",
    trainingSessionTemplates: [{ focus: "Man-up & press defense", intensity: "high", duration: "90m" }],
    rosterHint: "7 in water; roster 10–13",
    kitRequirements: ["Caps", "Balls", "Goals"],
  },
  american_football: {
    family: "american_football",
    displayName: "American Football",
    governingBody: "NCAA / NFL",
    rulesSummary: [
      "11 players per side",
      "4 quarters of 15 minutes (clock rules vary)",
      "4 downs to gain 10 yards",
      "Forward pass allowed from behind line of scrimmage",
    ],
    playersOnField: 11,
    squadMin: 11,
    squadMax: 53,
    matchDuration: "60 min clock",
    periods: "4 × 15 min",
    positions: ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"],
    kitHints: ["Helmets", "Shoulder pads", "Practice jerseys", "Footballs", "Kicking tees"],
    drillCategories: ["Install", "7-on-7", "Special teams", "Conditioning", "Red zone", "Walk-through"],
    defaultDrills: [
      { id: "af-d1", name: "Red zone script", category: "Red zone", duration: "25m", players: "11", difficulty: 4 },
      { id: "af-d2", name: "Kickoff coverage lanes", category: "Special teams", duration: "20m", players: "11", difficulty: 3 },
    ],
    statLabels: ["Points", "Total yards", "Turnovers", "3rd down %", "Red zone TDs", "Penalties"],
    tacticalLayout: "american_football",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Game day",
    scheduleLabel: "Games & practice",
    trainingSessionTemplates: [{ focus: "Weekly install — offense package", intensity: "high", duration: "120m" }],
    rosterHint: "11 on field; roster 40–53 (elite)",
    kitRequirements: ["Helmets", "Shoulder pads", "Matching jerseys", "Footballs"],
  },
  combat: {
    family: "combat",
    displayName: "Combat sport",
    governingBody: "Sport-specific",
    rulesSummary: [
      "Weight classes and weigh-in windows apply",
      "Round length & rest periods vary by discipline",
      "Judging criteria: effective striking/grappling, control, aggression",
      "Mandatory protective equipment per federation",
    ],
    playersOnField: 1,
    squadMin: 1,
    squadMax: 20,
    matchDuration: "3–5 rounds",
    periods: "Rounds + rest",
    positions: ["Fighter", "Corner / coaches"],
    kitHints: ["Gloves", "Mouth guard", "Groin guard", "Wraps", "Mats"],
    drillCategories: ["Warm-up", "Technique", "Sparring", "Conditioning", "Drilling", "Recovery"],
    defaultDrills: [
      { id: "cb-d1", name: "Combo pad work", category: "Technique", duration: "15m", players: "Pairs", difficulty: 3 },
      { id: "cb-d2", name: "Controlled sparring", category: "Sparring", duration: "20m", players: "Pairs", difficulty: 4 },
      { id: "cb-d3", name: "Mobility & core circuit", category: "Conditioning", duration: "15m", players: "Any", difficulty: 2 },
    ],
    statLabels: ["Wins", "Submissions/KOs", "Round scores", "Training load", "Weight", "Attendance"],
    tacticalLayout: null,
    supportsTacticalBoard: false,
    supportsMatchDay: true,
    matchDayLabel: "Fight day",
    scheduleLabel: "Camps & sessions",
    trainingSessionTemplates: [
      { focus: "Technical chains & counters", intensity: "high", duration: "90m" },
      { focus: "Sparring & fight simulation", intensity: "high", duration: "75m" },
    ],
    rosterHint: "Individual or team roster by weight class",
    kitRequirements: ["Gloves", "Mouth guard", "Protective gear", "Mats"],
  },
  racquet: {
    family: "racquet",
    displayName: "Racquet sport",
    governingBody: "BWF / WSF / ITTF",
    rulesSummary: [
      "Singles or doubles depending on sport",
      "Rally scoring to 21 (badminton) or 11 (table tennis) or games to 11 (squash)",
      "Service rules and court boundaries are sport-specific",
    ],
    playersOnField: 1,
    squadMin: 1,
    squadMax: 4,
    matchDuration: "30–90 min",
    periods: "Games / sets",
    positions: ["Player 1", "Player 2"],
    kitHints: ["Rackets/paddles", "Shuttlecocks/balls", "Court booking", "Shoes"],
    drillCategories: ["Warm-up", "Footwork", "Serve", "Rally", "Match play", "Fitness"],
    defaultDrills: [
      { id: "rq-d1", name: "Serve & third shot", category: "Serve", duration: "15m", players: "1–2", difficulty: 2 },
      { id: "rq-d2", name: "Drive & block rally", category: "Rally", duration: "18m", players: "2", difficulty: 3 },
    ],
    statLabels: ["Points won", "Unforced errors", "Serve accuracy", "Rally length", "Matches", "Training hrs"],
    tacticalLayout: "tennis",
    supportsTacticalBoard: true,
    supportsMatchDay: true,
    matchDayLabel: "Match day",
    scheduleLabel: "Matches & practice",
    trainingSessionTemplates: [{ focus: "Serve patterns & footwork", intensity: "medium", duration: "75m" }],
    rosterHint: "Singles or doubles",
    kitRequirements: ["Rackets", "Shuttlecocks/balls", "Court/table booking"],
  },
  individual: {
    family: "individual",
    displayName: "Individual sport",
    governingBody: "Sport-specific",
    rulesSummary: [
      "Training plans built around personal bests and periodization",
      "Equipment checks and safety briefing before sessions",
      "Track metrics: volume, intensity, recovery",
    ],
    playersOnField: 1,
    squadMin: 1,
    squadMax: 30,
    matchDuration: "Event dependent",
    periods: "Session blocks",
    positions: ["Athlete", "Coach", "Support"],
    kitHints: ["Sport-specific equipment", "Hydration", "Recovery tools", "Timing devices"],
    drillCategories: ["Warm-up", "Technique", "Intervals", "Strength", "Recovery", "Skills"],
    defaultDrills: [
      { id: "in-d1", name: "Technique block", category: "Technique", duration: "30m", players: "Individual", difficulty: 2 },
      { id: "in-d2", name: "Interval set", category: "Intervals", duration: "25m", players: "Individual", difficulty: 4 },
      { id: "in-d3", name: "Cool-down & mobility", category: "Recovery", duration: "15m", players: "Any", difficulty: 1 },
    ],
    statLabels: ["Personal best", "Session volume", "Attendance", "Recovery score", "Events", "Rank"],
    tacticalLayout: null,
    supportsTacticalBoard: false,
    supportsMatchDay: true,
    matchDayLabel: "Event day",
    scheduleLabel: "Sessions & events",
    trainingSessionTemplates: [
      { focus: "Technique & skill progression", intensity: "medium", duration: "75m" },
      { focus: "Threshold intervals", intensity: "high", duration: "60m" },
    ],
    rosterHint: "Roster = squad or training group",
    kitRequirements: ["Sport equipment", "Hydration", "First-aid"],
  },
  generic: {
    family: "generic",
    displayName: "Sport",
    governingBody: "Organizer",
    rulesSummary: [
      "Confirm squad size and match format with your league",
      "Document equipment and safety requirements",
      "Use Pro schedule & roster tools to align your team",
    ],
    playersOnField: 0,
    squadMin: 5,
    squadMax: 30,
    matchDuration: "Varies",
    periods: "Varies",
    positions: ["Player"],
    kitHints: ["Team kit", "Equipment for your sport", "First-aid kit", "Training bibs"],
    drillCategories: ["Warm-up", "Skills", "Tactical", "Conditioning", "Scrimmage"],
    defaultDrills: [
      { id: "gn-d1", name: "Dynamic warm-up", category: "Warm-up", duration: "15m", players: "Any", difficulty: 1 },
      { id: "gn-d2", name: "Small-sided game", category: "Scrimmage", duration: "25m", players: "8+", difficulty: 3 },
    ],
    statLabels: ["Matches", "Attendance", "Goals/points", "Training sessions", "Availability", "Form"],
    tacticalLayout: null,
    supportsTacticalBoard: false,
    supportsMatchDay: true,
    matchDayLabel: "Match day",
    scheduleLabel: "Fixtures & training",
    trainingSessionTemplates: [{ focus: "Team training session", intensity: "medium", duration: "90m" }],
    rosterHint: "Confirm minimum squad with organizer",
    kitRequirements: ["Team kit", "Equipment", "First-aid kit"],
  },
};

const profileCache = new Map<string, ProSportProfile>();

export function getProSportProfile(teamSport: string): ProSportProfile {
  const cacheKey = (teamSport || "").trim().toLowerCase();
  const cached = profileCache.get(cacheKey);
  if (cached) return cached;

  const family = resolveSportFamily(teamSport);
  const base = PROFILES[family];
  const profile: ProSportProfile = {
    ...base,
    displayName: teamSport?.trim() || base.displayName,
  };
  profileCache.set(cacheKey, profile);
  return profile;
}

/** Whether team sport aligns with event/competition sport. */
export function sportsAlign(teamSport: string, eventSport: string | null | undefined): boolean {
  if (!eventSport) return true;
  const t = norm(teamSport);
  const e = norm(eventSport);
  if (!t) return true;
  if (t === e) return true;
  return resolveSportFamily(t) === resolveSportFamily(e);
}

export function resolveTacticalLayout(teamSport: string): SportTacticalLayoutId | null {
  const p = getProSportProfile(teamSport);
  return p.tacticalLayout ?? layoutIdForSportFamily(p.family);
}

/** @deprecated Use resolveTacticalLayout */
export function resolveTacticalSport(teamSport: string): SportTacticalLayoutId | null {
  return resolveTacticalLayout(teamSport);
}
