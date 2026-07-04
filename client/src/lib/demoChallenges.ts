/** Demo challenges — two polished fallbacks when the competitive API is empty. */

import { DEMO_SHOWCASE_LIMIT } from "@/lib/demoShowcase";

export type DemoChallenge = {
  id: string;
  title: string;
  sport: string;
  type?: string;
  participantCount?: number;
  status?: string;
  isDemo?: boolean;
};

export const DEMO_CHALLENGES: DemoChallenge[] = [
  {
    id: "demo-ch-swim",
    title: "100m Freestyle Time Trial",
    sport: "Swimming",
    type: "Head to head · This week",
    participantCount: 2,
    status: "pending",
    isDemo: true,
  },
  {
    id: "demo-ch-tennis",
    title: "Singles Ladder — Open Court",
    sport: "Tennis",
    type: "Match play · Tonight",
    participantCount: 2,
    status: "live",
    isDemo: true,
  },
];

export function isDemoChallengeId(id: string): boolean {
  return id.startsWith("demo-ch-");
}

export function challengeDetailRoute(id: string): string {
  return isDemoChallengeId(id) ? "/challenges" : `/challenges/${id}`;
}

export function mergeWithDemoChallenges(
  apiMatches: unknown[],
  options?: { skipDemo?: boolean; mixDemos?: boolean; fallback?: boolean },
): DemoChallenge[] {
  const api = (Array.isArray(apiMatches) ? apiMatches : []) as DemoChallenge[];
  if (options?.skipDemo ?? true) return api;
  if (options?.mixDemos) {
    const apiIds = new Set(api.map((m) => String(m.id)));
    const extras = DEMO_CHALLENGES.filter((d) => !apiIds.has(d.id));
    return [...api, ...extras].slice(0, DEMO_SHOWCASE_LIMIT);
  }
  if (api.length > 0) return api;
  if (options?.fallback) return DEMO_CHALLENGES.slice(0, DEMO_SHOWCASE_LIMIT);
  return api;
}
