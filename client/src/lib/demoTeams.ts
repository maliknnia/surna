/**
 * Demo teams for discovery / profile when the API is sparse.
 */

import type { Team } from "@shared/schema";
import { DEMO_SHOWCASE_LIMIT, SHOWCASE_ATHLETES } from "@/lib/demoShowcase";
import { isDemoContentFallbackEnabled } from "@/config/demoMode";
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

const IMG = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=90`;

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
    /** Crest thumb — tight ball crop, distinct from wide cover. */
    logo: IMG("1431324150109-9a3dd769846c", 400, 400),
    cover: IMG("1574629810360-7efbbe195018", 1200, 600),
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
    logo: IMG("1519861531473-920adc777f58", 400, 400),
    cover: IMG("1546519638-68e109498ffc", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-team-leeside-runners",
    name: "Leeside Run Crew",
    sport: "Running",
    description: "Tuesday thresholds + Sunday long runs along the Lee.",
    location: "Fitzgerald Park",
    city: "Cork",
    currentMembers: 24,
    maxMembers: 40,
    verified: true,
    rating: "4.9",
    ratingCount: 41,
    followersCount: 520,
    latitude: 51.8955,
    longitude: -8.4901,
    logo: IMG("1552674605-db6ffd4facb5", 400, 400),
    cover: IMG("1476480862126-209bfaa8edc8", 1200, 600),
    isDemo: true,
  },
];

const LEGACY_TEAM_ID_MAP: Record<string, string> = {
  dt0: "demo-team-cork-fc",
  dt1: "demo-team-rebel-athletic",
  dt2: "demo-team-leeside-runners",
  dt3: "demo-team-cork-fc",
  dt4: "demo-team-rebel-athletic",
  "demo-team-pickup": "demo-team-rebel-athletic",
  "demo-team-run-club": "demo-team-leeside-runners",
  "demo-team-leeside-united": "demo-team-leeside-runners",
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
  const count = Math.min(team?.currentMembers ?? 2, DEMO_SHOWCASE_LIMIT);
  const athletes = SHOWCASE_ATHLETES.length
    ? SHOWCASE_ATHLETES
    : pickStoryUsers(hashSeed(normalized), count);
  return athletes.slice(0, count).map((u, i) => ({
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
    joinFeeCents: 0,
    joinFeeNote: null,
    joinRequirements: { questions: [], documents: [] },
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
  options?: { skipDemo?: boolean; mixDemos?: boolean; sport?: string; fallback?: boolean },
): any[] {
  const api = Array.isArray(apiTeams) ? apiTeams : [];
  if (options?.skipDemo ?? true) return api;
  if (!isDemoContentFallbackEnabled()) return api;

  let demos = DEMO_TEAMS.slice(0, DEMO_SHOWCASE_LIMIT);
  if (options?.sport && options.sport !== "All") {
    demos = demos.filter((t) => matchesSportFilter(t.sport, options.sport!));
  }

  if (options?.mixDemos) {
    const apiIds = new Set(api.map((t) => String(t.id)));
    const extras = demos.filter((d) => !apiIds.has(d.id)).map(demoTeamToApiRow);
    return [...api, ...extras].slice(0, DEMO_SHOWCASE_LIMIT);
  }
  if (api.length > 0) return api;
  if (options?.fallback) return demos.map(demoTeamToApiRow);
  return api;
}
