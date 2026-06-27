import type { CompetitiveMatch } from "@shared/schema";

export type ChallengeMatchView = CompetitiveMatch & {
  coverUrl?: string | null;
};

export type ChallengeListFilters = {
  status?: string;
  mine?: boolean;
  userId?: string;
  teamId?: string;
  type?: string;
  sport?: string;
  limit?: number;
};

export function buildChallengesListUrl(filters: ChallengeListFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.mine) params.set("mine", "true");
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.teamId) params.set("teamId", filters.teamId);
  if (filters.type) params.set("type", filters.type);
  if (filters.sport) params.set("sport", filters.sport);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return qs ? `/api/competitive-challenges?${qs}` : "/api/competitive-challenges";
}

export async function fetchChallengesList(
  filters: ChallengeListFilters = {},
): Promise<{ matches: ChallengeMatchView[] }> {
  const res = await fetch(buildChallengesListUrl(filters), { credentials: "include" });
  if (!res.ok) {
    throw new Error(`${res.status}: Failed to load challenges`);
  }
  return res.json();
}

export function buildLeaderboardUrl(scope: "user" | "team", sport?: string): string {
  const params = new URLSearchParams({ scope });
  if (sport) params.set("sport", sport);
  return `/api/competitive-challenges/leaderboards?${params.toString()}`;
}

export async function fetchLeaderboard(scope: "user" | "team", sport?: string) {
  const res = await fetch(buildLeaderboardUrl(scope, sport), { credentials: "include" });
  if (!res.ok) {
    throw new Error(`${res.status}: Failed to load leaderboard`);
  }
  return res.json() as Promise<{ leaderboard: Array<{ entityId: string; rating: number; sport: string }> }>;
}

export async function fetchChallengeDetail(challengeId: string) {
  const res = await fetch(`/api/competitive-challenges/${challengeId}`, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`${res.status}: Challenge not found`);
  }
  return res.json();
}

export async function fetchUserRatings(userId: string) {
  const res = await fetch(`/api/competitive-challenges/ratings/${userId}`, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`${res.status}: Failed to load ratings`);
  }
  return res.json();
}

export async function fetchTeamRatings(teamId: string) {
  const res = await fetch(`/api/competitive-challenges/ratings/team/${teamId}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`${res.status}: Failed to load team ratings`);
  }
  return res.json();
}
