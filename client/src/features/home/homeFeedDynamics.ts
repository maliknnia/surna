import type { QueryClient } from "@tanstack/react-query";

/** Five minutes — home section data freshness window. */
export const HOME_STALE_TIME_MS = 5 * 60 * 1000;

export const HOME_LAST_VISIT_KEY = "surna-home-last-visit";

export type HomeSectionId =
  | "happeningNearYou"
  | "teamsLooking"
  | "coachesNearYou"
  | "featured"
  | "challenges"
  | "feedSpotlight";

export const SHUFFLABLE_HOME_SECTIONS: HomeSectionId[] = [
  "happeningNearYou",
  "teamsLooking",
  "coachesNearYou",
  "featured",
  "challenges",
  "feedSpotlight",
];

export const HOME_QUERY_KEYS = {
  events: ["/api/events"] as const,
  teams: ["/api/teams"] as const,
  instant: ["/api/instant-teams", "home"] as const,
  coaches: ["home-coaches"] as const,
  challenges: ["home-challenges"] as const,
  marketplace: ["home-marketplace"] as const,
};

export function fisherYatesShuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function shuffleHomeSections(): HomeSectionId[] {
  return fisherYatesShuffle(SHUFFLABLE_HOME_SECTIONS);
}

export function getHomeLastVisit(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(HOME_LAST_VISIT_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function setHomeLastVisit(timestamp: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HOME_LAST_VISIT_KEY, String(timestamp));
  } catch {
    /* private mode */
  }
}

export function createdAtMs(item: {
  createdAt?: string | Date | null;
  created_at?: string | Date | null;
}): number {
  const raw = item.createdAt ?? item.created_at;
  if (!raw) return 0;
  const n = Date.parse(String(raw));
  return Number.isFinite(n) ? n : 0;
}

export function hasNewItemsSince(
  items: Array<{ createdAt?: string | Date | null; created_at?: string | Date | null }>,
  since: number,
): boolean {
  if (since <= 0) return false;
  return items.some((item) => createdAtMs(item) > since);
}

export type HomeNewIndicators = {
  happeningNearYou: boolean;
  teamsLooking: boolean;
};

export function computeHomeNewIndicators(
  since: number,
  data: {
    events: unknown[];
    instantGames: unknown[];
    teams: unknown[];
  },
): HomeNewIndicators {
  return {
    happeningNearYou:
      hasNewItemsSince(data.events as Parameters<typeof hasNewItemsSince>[0], since) ||
      hasNewItemsSince(data.instantGames as Parameters<typeof hasNewItemsSince>[0], since),
    teamsLooking: hasNewItemsSince(data.teams as Parameters<typeof hasNewItemsSince>[0], since),
  };
}

export function countActiveInstantGames(games: Array<{
  status?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  playersNeeded?: number | null;
  playersJoined?: number | null;
}>): number {
  const now = Date.now();
  return games.filter((g) => {
    if (g.status && g.status !== "active") return false;
    const start = g.startTime ? Date.parse(g.startTime) : NaN;
    const end = g.endTime ? Date.parse(g.endTime) : NaN;
    if (Number.isFinite(end) && end < now) return false;
    if (Number.isFinite(start) && start > now + 24 * 60 * 60 * 1000) return false;
    const needed = g.playersNeeded ?? 0;
    const joined = g.playersJoined ?? 0;
    if (needed > 0 && joined >= needed) return false;
    return true;
  }).length;
}

export async function refetchAllHomeQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all(
    Object.values(HOME_QUERY_KEYS).map((queryKey) =>
      queryClient.refetchQueries({ queryKey: [...queryKey], type: "active" }),
    ),
  );
}
