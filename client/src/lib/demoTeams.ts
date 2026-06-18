/**
 * Demo teams for discovery / profile when the API is sparse.
 */

import type { Team } from "@shared/schema";
import { pickStoryUsers } from "@/lib/personalizedDemoFeed";
import type { TeamMemberRow } from "@/pages/team/components/TeamMemberProfileSheet";

export type DemoTeam = {
  id: string;
  name: string;
  sport: string;
  description?: string;
  location?: string;
  city?: string;
  logo?: string;
  cover?: string;
  currentMembers?: number;
  maxMembers?: number;
  verified?: boolean;
  rating?: string;
  ratingCount?: number;
  followersCount?: number;
  latitude?: number;
  longitude?: number;
  isDemo?: boolean;
};

function demoPhoto(seed: string, w: number, h: number): string {
  return `https://picsum.photos/seed/surna-team-${encodeURIComponent(seed)}/${w}/${h}`;
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export const DEMO_TEAMS: DemoTeam[] = [
  {
    id: "demo-team-cork-fc",
    name: "Cork FC United",
    sport: "Soccer",
    description: "Competitive 5-a-side and league squad based in Cork city centre.",
    location: "Marina Walk",
    city: "Cork",
    currentMembers: 18,
    maxMembers: 22,
    verified: true,
    rating: "4.8",
    ratingCount: 34,
    followersCount: 412,
    latitude: 51.8982,
    longitude: -8.4738,
    logo: demoPhoto("cork-fc-logo", 400, 400),
    cover: demoPhoto("cork-fc-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-team-rebel-athletic",
    name: "Rebel Athletic",
    sport: "Basketball",
    description: "Pickup runs and weekly scrimmages — all skill levels welcome.",
    location: "Greenfield Courts",
    city: "Cork",
    currentMembers: 12,
    maxMembers: 16,
    verified: true,
    rating: "4.6",
    ratingCount: 21,
    followersCount: 288,
    latitude: 51.9015,
    longitude: -8.4682,
    logo: demoPhoto("rebel-athletic-logo", 400, 400),
    cover: demoPhoto("rebel-athletic-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-team-leeside-united",
    name: "Leeside United",
    sport: "Running",
    description: "Road and trail group runs along the Lee — tempo Tuesdays, long Sunday.",
    location: "Fitzgerald's Park",
    city: "Cork",
    currentMembers: 25,
    maxMembers: 40,
    verified: false,
    rating: "4.7",
    ratingCount: 18,
    followersCount: 356,
    latitude: 51.8925,
    longitude: -8.4812,
    logo: demoPhoto("leeside-logo", 400, 400),
    cover: demoPhoto("leeside-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-team-munster-rugby",
    name: "Munster Rugby Club",
    sport: "Rugby",
    description: "Social and competitive rugby — training Wed/Fri, matches on weekends.",
    location: "Ballintemple",
    city: "Cork",
    currentMembers: 20,
    maxMembers: 28,
    verified: true,
    rating: "4.9",
    ratingCount: 42,
    followersCount: 520,
    latitude: 51.8942,
    longitude: -8.4358,
    logo: demoPhoto("munster-rugby-logo", 400, 400),
    cover: demoPhoto("munster-rugby-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-team-shandon-crossfit",
    name: "Shandon CrossFit Crew",
    sport: "CrossFit",
    description: "Community WOD crew — partner workouts and open gym sessions.",
    location: "Shandon",
    city: "Cork",
    currentMembers: 8,
    maxMembers: 14,
    verified: false,
    rating: "4.5",
    ratingCount: 11,
    followersCount: 164,
    latitude: 51.9038,
    longitude: -8.4655,
    logo: demoPhoto("shandon-cf-logo", 400, 400),
    cover: demoPhoto("shandon-cf-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-team-la-pickup",
    name: "LA Pickup Crew",
    sport: "Basketball",
    description: "Westside pickup runs — bring your A-game and good vibes.",
    location: "Venice Beach Courts",
    city: "Los Angeles",
    currentMembers: 14,
    maxMembers: 18,
    verified: false,
    rating: "4.4",
    ratingCount: 9,
    followersCount: 198,
    logo: demoPhoto("la-pickup-logo", 400, 400),
    cover: demoPhoto("la-pickup-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-team-sunset-run",
    name: "Sunset Run Club",
    sport: "Running",
    description: "Sunset beach runs and Saturday 10Ks around Santa Monica.",
    location: "Santa Monica Pier",
    city: "Los Angeles",
    currentMembers: 22,
    maxMembers: 35,
    verified: true,
    rating: "4.8",
    ratingCount: 27,
    followersCount: 445,
    logo: demoPhoto("sunset-run-logo", 400, 400),
    cover: demoPhoto("sunset-run-cover", 1200, 600),
    isDemo: true,
  },
];

const LEGACY_TEAM_ID_MAP: Record<string, string> = {
  dt0: "demo-team-cork-fc",
  dt1: "demo-team-rebel-athletic",
  dt2: "demo-team-leeside-united",
  dt3: "demo-team-munster-rugby",
  dt4: "demo-team-shandon-crossfit",
  "demo-team-pickup": "demo-team-la-pickup",
  "demo-team-run-club": "demo-team-sunset-run",
};

export function normalizeDemoTeamId(id: string): string {
  return LEGACY_TEAM_ID_MAP[id] ?? id;
}

export function isDemoTeamId(id: string): boolean {
  const normalized = normalizeDemoTeamId(id);
  return normalized.startsWith("demo-team-") || id.startsWith("dt");
}

export function getDemoTeam(id: string): DemoTeam | undefined {
  const normalized = normalizeDemoTeamId(id);
  return DEMO_TEAMS.find((t) => t.id === normalized);
}

export function getDemoTeamMembers(teamId: string): TeamMemberRow[] {
  const normalized = normalizeDemoTeamId(teamId);
  const team = getDemoTeam(normalized);
  const count = Math.min(team?.currentMembers ?? 8, 12);
  return pickStoryUsers(hashSeed(normalized), count).map((u, i) => ({
    id: `${normalized}-m-${i}`,
    userId: u.id,
    role: i === 0 ? "captain" : i === 1 ? "co-captain" : "member",
    gamesPlayed: 5 + (hashSeed(u.id) % 40),
    skillLevel: (["beginner", "intermediate", "advanced", "expert"] as const)[hashSeed(u.id) % 4],
    user: {
      id: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      profileImageUrl: u.profileImageUrl,
      sport: u.sport,
    },
  }));
}

export function demoTeamToApiRow(demo: DemoTeam): Team & { isDemo?: boolean } {
  return {
    id: demo.id,
    name: demo.name,
    slug: null,
    description: demo.description ?? null,
    sport: demo.sport,
    location: demo.location ?? null,
    city: demo.city ?? null,
    captainId: "demo-captain",
    placeId: null,
    logo: demo.logo ?? null,
    cover: demo.cover ?? null,
    verified: demo.verified ?? false,
    rating: demo.rating ?? "0",
    ratingCount: demo.ratingCount ?? 0,
    followersCount: demo.followersCount ?? 0,
    sponsors: null,
    isPublic: true,
    joinPolicy: "open",
    featuredHighlightIds: [],
    maxMembers: demo.maxMembers ?? 20,
    currentMembers: demo.currentMembers ?? 1,
    currentWinStreak: 0,
    longestWinStreak: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDemo: true,
  };
}

function matchesSportFilter(teamSport: string, filter: string): boolean {
  const a = teamSport.toLowerCase();
  const b = filter.toLowerCase();
  return a.includes(b) || b.includes(a);
}

export function mergeWithDemoTeams(
  apiTeams: any[],
  options?: { skipDemo?: boolean; mixDemos?: boolean; sport?: string },
): any[] {
  const api = Array.isArray(apiTeams) ? apiTeams : [];
  if (options?.skipDemo) return api;

  let demos = DEMO_TEAMS;
  if (options?.sport && options.sport !== "All") {
    demos = demos.filter((t) => matchesSportFilter(t.sport, options.sport!));
  }

  if (options?.mixDemos) {
    const apiIds = new Set(api.map((t) => String(t.id)));
    const extras = demos.filter((d) => !apiIds.has(d.id)).map(demoTeamToApiRow);
    return [...api, ...extras];
  }
  if (api.length > 0) return api;
  return demos.map(demoTeamToApiRow);
}
