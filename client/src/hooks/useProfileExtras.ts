import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchChallengesList } from "@/lib/challengesApi";
import {
  OWNER_DEMO_STATS,
  resolveProfileSports,
} from "@/lib/demoProfileMedia";
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

  return useMemo(() => {
    const sports = resolveProfileSports(
      user?.sports ?? user?.profile?.sports,
      user?.primarySport ?? user?.sport ?? user?.profile?.primarySport,
      isOwnProfile,
    );

    const matches = (challengesData as { matches?: unknown[] } | undefined)?.matches ?? [];
    const matchStats = userId
      ? computeMatchStats(matches as Parameters<typeof computeMatchStats>[0], userId)
      : { total: 0, winRate: 0 };

    const apiLevel = gamification?.level ?? user?.stats?.level ?? 0;
    const apiWinRate = user?.stats?.winRate ?? (matchStats.total > 0 ? matchStats.winRate : 0);
    const apiGames = user?.stats?.gamesPlayed ?? matchStats.total;

    const parsedRating = parseRating(user);
    const useDemo = isOwnProfile && apiLevel <= 1 && apiGames === 0 && parsedRating.value === 0;

    const level = useDemo ? OWNER_DEMO_STATS.level : apiLevel > 0 ? apiLevel : OWNER_DEMO_STATS.level;
    const gamesCount = useDemo ? OWNER_DEMO_STATS.gamesCount : apiGames > 0 ? apiGames : isOwnProfile ? OWNER_DEMO_STATS.gamesCount : 0;
    const winRate = useDemo
      ? OWNER_DEMO_STATS.winRate
      : apiWinRate > 0
        ? apiWinRate
        : isOwnProfile
          ? OWNER_DEMO_STATS.winRate
          : 0;
    const rating = useDemo
      ? OWNER_DEMO_STATS.rating
      : parsedRating.value > 0
        ? parsedRating.value
        : isOwnProfile
          ? OWNER_DEMO_STATS.rating
          : 0;
    const ratingCount = useDemo
      ? OWNER_DEMO_STATS.ratingCount
      : parsedRating.count > 0
        ? parsedRating.count
        : isOwnProfile
          ? OWNER_DEMO_STATS.ratingCount
          : 0;

    return { sports, level, winRate, gamesCount, rating, ratingCount };
  }, [user, userId, isOwnProfile, gamification, challengesData]);
}
