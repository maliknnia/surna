import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchChallengesList } from "@/lib/challengesApi";
import { resolveProfileSports } from "@/lib/demoProfileMedia";
import { getQueryFn } from "@/lib/queryClient";

export type ProfileExtras = {
  sports: string[];
  level: number;
  winRate: number;
  gamesCount: number;
  rating: number;
  ratingCount: number;
};

type UserSlice = {
  id?: string;
  primarySport?: string | null;
  sport?: string | null;
  sports?: string[] | null;
  profile?: { sports?: string[] | null; primarySport?: string | null };
  rating?: { value?: number; count?: number } | number;
  stats?: { level?: number; winRate?: number; gamesPlayed?: number };
  verified?: boolean | null;
};

function parseRating(user: UserSlice | null | undefined): { value: number; count: number } {
  if (!user?.rating) return { value: 0, count: 0 };
  if (typeof user.rating === "number") return { value: user.rating, count: 0 };
  return {
    value: user.rating.value ?? 0,
    count: user.rating.count ?? 0,
  };
}

function computeMatchStats(matches: Array<{ creatorId?: string; result?: { outcome?: string } }>, userId: string) {
  let wins = 0;
  let total = 0;
  for (const m of matches) {
    const outcome = m.result?.outcome;
    if (!outcome || outcome === "cancelled") continue;
    total += 1;
    const isHost = m.creatorId === userId;
    if (outcome === "draw") continue;
    if ((isHost && outcome === "hostWin") || (!isHost && outcome === "guestWin")) wins += 1;
  }
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  return { total, winRate };
}

export function useProfileExtras(
  userId: string | undefined,
  user: UserSlice | null | undefined,
  isOwnProfile: boolean,
): ProfileExtras {
  const { data: gamification } = useQuery<{ level?: number }>({
    queryKey: ["/api/gamification/user"],
    queryFn: getQueryFn({ on401: "returnNull" }) as () => Promise<{ level?: number }>,
    enabled: isOwnProfile && !!userId,
  });

  const { data: challengesData } = useQuery({
    queryKey: ["challenges-list", "profile", userId],
    queryFn: () => fetchChallengesList({ userId: userId! }),
    enabled: !!userId,
  });

  const { data: teamGamesSummary } = useQuery({
    queryKey: ["/api/profile", userId, "team-games", "summary"],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${userId}/team-games`, { credentials: "include" });
      if (!res.ok) return { total: 0, wins: 0, winRate: 0 };
      const json = await res.json();
      return json.summary as { total: number; wins: number; winRate: number };
    },
    enabled: !!userId,
  });

  return useMemo(() => {
    const sports = resolveProfileSports(
      user?.sports ?? user?.profile?.sports,
      user?.primarySport ?? user?.sport ?? user?.profile?.primarySport,
      false,
    );

    const matches = (challengesData as { matches?: unknown[] } | undefined)?.matches ?? [];
    const matchStats = userId
      ? computeMatchStats(matches as Parameters<typeof computeMatchStats>[0], userId)
      : { total: 0, winRate: 0 };

    const teamTotal = teamGamesSummary?.total ?? 0;
    const teamWinRate = teamGamesSummary?.winRate ?? 0;
    const combinedGames = matchStats.total + teamTotal;
    const combinedWinRate =
      combinedGames > 0
        ? Math.round(
            ((matchStats.total > 0 ? (matchStats.winRate / 100) * matchStats.total : 0) +
              (teamTotal > 0 ? (teamWinRate / 100) * teamTotal : 0)) /
              combinedGames *
              100,
          )
        : 0;

    const level = gamification?.level ?? user?.stats?.level ?? 1;
    const gamesCount = user?.stats?.gamesPlayed ?? combinedGames;
    const winRate =
      user?.stats?.winRate ?? (combinedGames > 0 ? combinedWinRate : matchStats.winRate);

    const parsedRating = parseRating(user);

    return {
      sports,
      level: level > 0 ? level : 1,
      winRate,
      gamesCount,
      rating: parsedRating.value,
      ratingCount: parsedRating.count,
    };
  }, [user, userId, gamification, challengesData, teamGamesSummary]);
}
