/** Shared tournament sport matching and format hints (client + server). */

import { resolveSportFamily, sportsAlign } from "./proSportProfiles";

export const TOURNAMENT_SPORTS = [
  "Soccer",
  "Football",
  "GAA",
  "Hurling",
  "Basketball",
  "Rugby",
  "Tennis",
  "Volleyball",
  "Cricket",
  "Hockey",
  "Baseball",
  "Handball",
  "Water Polo",
  "American Football",
] as const;

export type TournamentSport = (typeof TOURNAMENT_SPORTS)[number];

export type TournamentFormat = "league" | "knockout" | "group_knockout";

/** Whether a team's sport can enter a tournament of the given sport. */
export function tournamentSportsAlign(teamSport: string, tournamentSport: string): boolean {
  return sportsAlign(teamSport, tournamentSport);
}

export type SportTournamentProfile = {
  sport: string;
  recommendedFormats: TournamentFormat[];
  defaultFormat: TournamentFormat;
  typicalTeamCounts: readonly number[];
  kitRequirements: string[];
  rosterHint: string;
};

const PROFILES: Record<string, SportTournamentProfile> = {
  gaa: {
    sport: "GAA",
    recommendedFormats: ["knockout", "group_knockout"],
    defaultFormat: "group_knockout",
    typicalTeamCounts: [8, 16],
    kitRequirements: ["Helmets", "Gum shields", "Matching jerseys", "Sliotars / footballs"],
    rosterHint: "15 players match day (11 football / 15 hurling)",
  },
  football: {
    sport: "Soccer",
    recommendedFormats: ["league", "knockout", "group_knockout"],
    defaultFormat: "group_knockout",
    typicalTeamCounts: [8, 16, 32],
    kitRequirements: ["Home & away kit", "Shin guards", "Match balls", "Goalkeeper gloves"],
    rosterHint: "Minimum squad of 11; recommend 16–18",
  },
  basketball: {
    sport: "Basketball",
    recommendedFormats: ["league", "knockout"],
    defaultFormat: "knockout",
    typicalTeamCounts: [4, 8, 16],
    kitRequirements: ["Matching kits", "Basketballs", "First-aid kit"],
    rosterHint: "5 on court; roster of 8–12",
  },
  rugby: {
    sport: "Rugby",
    recommendedFormats: ["knockout", "group_knockout"],
    defaultFormat: "knockout",
    typicalTeamCounts: [8, 16],
    kitRequirements: ["Mouth guards", "Boots", "Matching jerseys", "Match balls"],
    rosterHint: "15 match day; squad of 22+",
  },
  tennis: {
    sport: "Tennis",
    recommendedFormats: ["knockout"],
    defaultFormat: "knockout",
    typicalTeamCounts: [4, 8, 16],
    kitRequirements: ["Rackets", "Balls", "Court booking"],
    rosterHint: "Singles or doubles teams",
  },
  volleyball: {
    sport: "Volleyball",
    recommendedFormats: ["knockout", "league"],
    defaultFormat: "knockout",
    typicalTeamCounts: [4, 8],
    kitRequirements: ["Knee pads", "Matching kits", "Match balls", "Net system"],
    rosterHint: "6 on court; roster of 8–10",
  },
  cricket: {
    sport: "Cricket",
    recommendedFormats: ["knockout", "league"],
    defaultFormat: "knockout",
    typicalTeamCounts: [4, 8, 16],
    kitRequirements: ["Pads", "Helmets", "Bats", "Balls", "Stumps"],
    rosterHint: "11 on field; squad 13–15",
  },
  hockey: {
    sport: "Hockey",
    recommendedFormats: ["league", "knockout"],
    defaultFormat: "league",
    typicalTeamCounts: [4, 8, 16],
    kitRequirements: ["Sticks", "Shin guards", "Goalie kit", "Balls/pucks"],
    rosterHint: "11 on pitch; squad 16–18",
  },
  baseball: {
    sport: "Baseball",
    recommendedFormats: ["league", "knockout"],
    defaultFormat: "league",
    typicalTeamCounts: [4, 8, 16],
    kitRequirements: ["Bats", "Gloves", "Helmets", "Baseballs"],
    rosterHint: "9 on field; roster 13–26",
  },
  handball: {
    sport: "Handball",
    recommendedFormats: ["knockout", "group_knockout"],
    defaultFormat: "knockout",
    typicalTeamCounts: [4, 8],
    kitRequirements: ["Matching kits", "Match balls", "Knee pads"],
    rosterHint: "7 on court; roster 12–14",
  },
  water_polo: {
    sport: "Water Polo",
    recommendedFormats: ["knockout"],
    defaultFormat: "knockout",
    typicalTeamCounts: [4, 8],
    kitRequirements: ["Caps", "Balls", "Goals"],
    rosterHint: "7 in water; roster 10–13",
  },
  american_football: {
    sport: "American Football",
    recommendedFormats: ["knockout", "league"],
    defaultFormat: "knockout",
    typicalTeamCounts: [4, 8, 16],
    kitRequirements: ["Helmets", "Shoulder pads", "Matching jerseys", "Footballs"],
    rosterHint: "11 on field; large roster",
  },
};

export function getSportTournamentProfile(sport: string): SportTournamentProfile {
  const family = resolveSportFamily(sport);
  return PROFILES[family] ?? {
    sport: sport || "Sport",
    recommendedFormats: ["knockout", "league"],
    defaultFormat: "knockout",
    typicalTeamCounts: [4, 8, 16],
    kitRequirements: ["Team kit", "Equipment for your sport", "First-aid kit"],
    rosterHint: "Check minimum squad size with the organizer",
  };
}

export type TournamentSettings = {
  autoApprove: boolean;
  captainOnly: boolean;
  minMembers: number;
  /** What teams must bring / comply with */
  requirements: string;
  /** Message shown on the public registration page */
  welcomeMessage: string;
  /** Collect team goals / expectations from applicants */
  collectTeamGoals: boolean;
};

export const DEFAULT_TOURNAMENT_SETTINGS: TournamentSettings = {
  autoApprove: true,
  captainOnly: true,
  minMembers: 5,
  requirements: "",
  welcomeMessage: "",
  collectTeamGoals: true,
};
