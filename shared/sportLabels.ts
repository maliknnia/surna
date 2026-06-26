/**
 * Sport-aware copy for team surfaces. Same UI + connections everywhere;
 * labels adapt per sport (or family fallback).
 */

export type SportLabels = {
  /** e.g. Team, Crew, Club, Camp */
  groupNoun: string;
  /** e.g. Members, Players, Fighters, Runners */
  memberNoun: string;
  memberNounSingular: string;
  /** e.g. Home pitch, Home court, Home gym */
  homeVenue: string;
  /** Short action: Log game, Log bout, Log session */
  logActivity: string;
  /** Sheet title: Log a game */
  logActivityTitle: string;
  /** Singular: game, bout, match, session */
  activityNoun: string;
  /** Plural: games, bouts, matches, sessions */
  activityNounPlural: string;
  /** Section heading: Recent games */
  recentActivities: string;
  /** Form label: Opponent, Event, Course */
  opponentLabel: string;
  opponentPlaceholder: string;
  /** Roster picker: Who played? */
  whoParticipated: string;
  /** Members tab / header */
  rosterLabel: string;
  /** About card: Team size */
  sizeLabel: string;
  /** Profile tab (multi-sport neutral) */
  profileActivityTitle: string;
};

const DEFAULT_LABELS: SportLabels = {
  groupNoun: "Team",
  memberNoun: "Members",
  memberNounSingular: "Member",
  homeVenue: "Home venue",
  logActivity: "Log game",
  logActivityTitle: "Log a game",
  activityNoun: "game",
  activityNounPlural: "games",
  recentActivities: "Recent games",
  opponentLabel: "Opponent",
  opponentPlaceholder: "e.g. Riverside FC",
  whoParticipated: "Who played?",
  rosterLabel: "Members",
  sizeLabel: "Team size",
  profileActivityTitle: "Team activity",
};

/** Normalize sport string to lookup key */
export function normalizeSportKey(sport: string | null | undefined): string {
  if (!sport?.trim()) return "";
  return sport.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

type LabelPartial = Partial<SportLabels>;

/** Ten flagship sports — explicit copy */
const SPORT_OVERRIDES: Record<string, LabelPartial> = {
  soccer: {
    groupNoun: "Team",
    homeVenue: "Home pitch",
    opponentPlaceholder: "e.g. Riverside FC",
    sizeLabel: "Squad size",
  },
  football: {
    groupNoun: "Team",
    homeVenue: "Home field",
    opponentPlaceholder: "e.g. Northside Hawks",
    sizeLabel: "Roster size",
  },
  basketball: {
    groupNoun: "Team",
    homeVenue: "Home court",
    opponentPlaceholder: "e.g. Downtown Ballers",
    sizeLabel: "Roster size",
  },
  tennis: {
    groupNoun: "Club",
    memberNoun: "Players",
    memberNounSingular: "Player",
    homeVenue: "Home courts",
    logActivity: "Log match",
    logActivityTitle: "Log a match",
    activityNoun: "match",
    activityNounPlural: "matches",
    recentActivities: "Recent matches",
    opponentLabel: "Opponent",
    opponentPlaceholder: "e.g. Westside Tennis Club",
    whoParticipated: "Who played?",
    rosterLabel: "Players",
    sizeLabel: "Club size",
    profileActivityTitle: "Club matches",
  },
  boxing: {
    groupNoun: "Camp",
    memberNoun: "Fighters",
    memberNounSingular: "Fighter",
    homeVenue: "Home gym",
    logActivity: "Log bout",
    logActivityTitle: "Log a bout",
    activityNoun: "bout",
    activityNounPlural: "bouts",
    recentActivities: "Recent bouts",
    opponentLabel: "Opponent",
    opponentPlaceholder: "e.g. Martinez Boxing",
    whoParticipated: "Who fought?",
    rosterLabel: "Fighters",
    sizeLabel: "Camp size",
    profileActivityTitle: "Fight record",
  },
  running: {
    groupNoun: "Crew",
    memberNoun: "Runners",
    memberNounSingular: "Runner",
    homeVenue: "Meetup spot",
    logActivity: "Log session",
    logActivityTitle: "Log a session",
    activityNoun: "session",
    activityNounPlural: "sessions",
    recentActivities: "Recent sessions",
    opponentLabel: "Event / route",
    opponentPlaceholder: "e.g. City 10K or Park loop",
    whoParticipated: "Who ran?",
    rosterLabel: "Runners",
    sizeLabel: "Crew size",
    profileActivityTitle: "Run history",
  },
  swimming: {
    groupNoun: "Team",
    memberNoun: "Swimmers",
    memberNounSingular: "Swimmer",
    homeVenue: "Home pool",
    logActivity: "Log meet",
    logActivityTitle: "Log a meet",
    activityNoun: "meet",
    activityNounPlural: "meets",
    recentActivities: "Recent meets",
    opponentLabel: "Meet / opponent",
    opponentPlaceholder: "e.g. Regional Championships",
    whoParticipated: "Who swam?",
    rosterLabel: "Swimmers",
    sizeLabel: "Squad size",
    profileActivityTitle: "Meet history",
  },
  cycling: {
    groupNoun: "Club",
    memberNoun: "Riders",
    memberNounSingular: "Rider",
    homeVenue: "Meetup point",
    logActivity: "Log ride",
    logActivityTitle: "Log a ride",
    activityNoun: "ride",
    activityNounPlural: "rides",
    recentActivities: "Recent rides",
    opponentLabel: "Event / route",
    opponentPlaceholder: "e.g. Coastal century or Club TT",
    whoParticipated: "Who rode?",
    rosterLabel: "Riders",
    sizeLabel: "Club size",
    profileActivityTitle: "Ride history",
  },
  volleyball: {
    groupNoun: "Team",
    homeVenue: "Home court",
    opponentPlaceholder: "e.g. Beach Volley Co.",
    sizeLabel: "Roster size",
  },
  baseball: {
    groupNoun: "Team",
    homeVenue: "Home field",
    opponentPlaceholder: "e.g. Metro Sluggers",
    sizeLabel: "Roster size",
  },
  cricket: {
    groupNoun: "Team",
    homeVenue: "Home ground",
    opponentPlaceholder: "e.g. County XI",
    sizeLabel: "Squad size",
    profileActivityTitle: "Match history",
  },
};

/** Family fallbacks for sports outside the top 10 */
const FAMILY_DEFAULTS: Record<string, LabelPartial> = {
  team_field: {
    homeVenue: "Home field",
    sizeLabel: "Squad size",
  },
  team_court: {
    homeVenue: "Home court",
    sizeLabel: "Roster size",
  },
  combat: {
    groupNoun: "Camp",
    memberNoun: "Fighters",
    memberNounSingular: "Fighter",
    homeVenue: "Home gym",
    logActivity: "Log bout",
    logActivityTitle: "Log a bout",
    activityNoun: "bout",
    activityNounPlural: "bouts",
    recentActivities: "Recent bouts",
    whoParticipated: "Who fought?",
    rosterLabel: "Fighters",
    sizeLabel: "Camp size",
    profileActivityTitle: "Fight record",
  },
  endurance: {
    groupNoun: "Crew",
    memberNoun: "Athletes",
    memberNounSingular: "Athlete",
    homeVenue: "Meetup spot",
    logActivity: "Log session",
    logActivityTitle: "Log a session",
    activityNoun: "session",
    activityNounPlural: "sessions",
    recentActivities: "Recent sessions",
    opponentLabel: "Event",
    whoParticipated: "Who participated?",
    rosterLabel: "Athletes",
    sizeLabel: "Crew size",
    profileActivityTitle: "Activity history",
  },
  aquatic: {
    memberNoun: "Swimmers",
    memberNounSingular: "Swimmer",
    homeVenue: "Home pool",
    rosterLabel: "Swimmers",
  },
  racquet: {
    groupNoun: "Club",
    memberNoun: "Players",
    memberNounSingular: "Player",
    logActivity: "Log match",
    logActivityTitle: "Log a match",
    activityNoun: "match",
    activityNounPlural: "matches",
    recentActivities: "Recent matches",
    rosterLabel: "Players",
    sizeLabel: "Club size",
  },
};

const SPORT_FAMILY: Record<string, string> = {
  rugby: "team_field",
  cricket: "team_field",
  hockey: "team_field",
  gaa: "team_field",
  hurling: "team_field",
  handball: "team_court",
  mma: "combat",
  martial_arts: "combat",
  wrestling: "combat",
  triathlon: "endurance",
  track_and_field: "endurance",
  golf: "endurance",
  badminton: "racquet",
  table_tennis: "racquet",
  squash: "racquet",
  water_polo: "aquatic",
  surfing: "aquatic",
};

export const FLAGSHIP_SPORTS = [
  "Soccer",
  "Basketball",
  "Tennis",
  "Boxing",
  "Running",
  "Swimming",
  "Cycling",
  "Volleyball",
  "Baseball",
  "Cricket",
] as const;

function mergeLabels(base: SportLabels, ...layers: LabelPartial[]): SportLabels {
  let result: SportLabels = { ...base };
  for (const layer of layers) {
    if (layer) result = { ...result, ...layer };
  }
  return result;
}

/** Resolve display labels for a team sport */
export function getSportLabels(sport: string | null | undefined): SportLabels {
  const key = normalizeSportKey(sport);
  if (!key) return { ...DEFAULT_LABELS };

  const familyKey = SPORT_FAMILY[key];
  const family = familyKey ? FAMILY_DEFAULTS[familyKey] : undefined;
  const override = SPORT_OVERRIDES[key];

  return mergeLabels(DEFAULT_LABELS, family ?? {}, override ?? {});
}

/** Prefix for "vs opponent" lines — running/cycling use "at" when no head-to-head */
export function formatActivityVersus(
  labels: SportLabels,
  name: string,
  sport?: string | null,
): string {
  const key = normalizeSportKey(sport);
  if (key === "running" || key === "cycling") {
    return name;
  }
  return `vs ${name}`;
}
