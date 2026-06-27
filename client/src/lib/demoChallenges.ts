/** Demo challenges for home / map when the competitive API is sparse. */

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
    id: "demo-ch-5v5",
    title: "5v5 Street Football",
    sport: "Soccer",
    type: "Pick-up · Tonight",
    participantCount: 9,
    status: "pending",
    isDemo: true,
  },
  {
    id: "demo-ch-3pt",
    title: "3-Point Shootout",
    sport: "Basketball",
    type: "Open match",
    participantCount: 8,
    status: "live",
    isDemo: true,
  },
  {
    id: "demo-ch-1v1",
    title: "1v1 Tennis Showdown",
    sport: "Tennis",
    type: "Head to head",
    participantCount: 2,
    status: "pending",
    isDemo: true,
  },
  {
    id: "demo-ch-sprint",
    title: "Sprint Challenge",
    sport: "Running",
    type: "Time trial",
    participantCount: 4,
    status: "live",
    isDemo: true,
  },
  {
    id: "demo-ch-padel",
    title: "Padel Ladder Night",
    sport: "Padel",
    type: "Doubles ladder",
    participantCount: 6,
    status: "pending",
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
  options?: { skipDemo?: boolean; mixDemos?: boolean },
): DemoChallenge[] {
  const api = (Array.isArray(apiMatches) ? apiMatches : []) as DemoChallenge[];
  if (options?.skipDemo) return api;
  if (options?.mixDemos) {
    const apiIds = new Set(api.map((m) => String(m.id)));
    const extras = DEMO_CHALLENGES.filter((d) => !apiIds.has(d.id));
    return [...api, ...extras];
  }
  if (api.length > 0) return api;
  return [...DEMO_CHALLENGES];
}
