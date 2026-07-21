import type { UserStats } from "../../../shared/performance-types";

export type GamificationSummary = {
  totalPoints: number;
  currentLevel: number;
  levelProgress: number;
  badgeCount: number;
  rank: number;
  recentBadge?: {
    title: string;
    iconEmoji: string;
    earnedAt: string;
  };
  currentStreak: number;
  pointsToday: number;
};

type RawGamificationUser = {
  level?: number;
  totalPoints?: number;
  pointsToNextLevel?: number;
  badges?: Array<{ name?: string; iconUrl?: string; earnedAt?: string }>;
  streaks?: Array<{ type?: string; currentStreak?: number; longestStreak?: number }>;
  recentActivities?: Array<{ points?: number; createdAt?: string }>;
};

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function normalizeGamificationUserStats(raw: RawGamificationUser): UserStats {
  const totalPoints = Number(raw.totalPoints ?? 0);
  const currentLevel = Number(raw.level ?? 1);
  const xpToNext = Number(raw.pointsToNextLevel ?? 100);
  const streakRow =
    raw.streaks?.find((s) => s.type === "daily_login" || s.type === "login") ?? raw.streaks?.[0];

  return {
    totalPoints,
    currentLevel,
    xpToNext,
    currentXP: xpToNext > 0 ? totalPoints % xpToNext : totalPoints,
    rank: 0,
    streaks: {
      dailyLogin: streakRow?.currentStreak ?? 0,
      longestStreak: streakRow?.longestStreak ?? 0,
      lastActiveDate: new Date(),
    },
    badges: (raw.badges ?? []).map((b, i) => ({
      id: String(i),
      name: b.name ?? "Badge",
      description: "",
      category: "engagement" as const,
      rarity: "common" as const,
      earnedAt: b.earnedAt ? new Date(b.earnedAt) : new Date(),
      iconUrl: b.iconUrl,
    })),
    achievements: [],
    recentActivity: [],
    challenges: [],
  };
}

export function toGamificationSummary(raw: RawGamificationUser): GamificationSummary {
  const totalPoints = Number(raw.totalPoints ?? 0);
  const currentLevel = Number(raw.level ?? 1);
  const xpToNext = Number(raw.pointsToNextLevel ?? 100);
  const levelProgress =
    xpToNext > 0 ? Math.min(100, Math.round(((totalPoints % xpToNext) / xpToNext) * 100)) : 0;
  const streakRow =
    raw.streaks?.find((s) => s.type === "daily_login" || s.type === "login") ?? raw.streaks?.[0];
  const pointsToday = (raw.recentActivities ?? [])
    .filter((a) => a.createdAt && isToday(a.createdAt) && Number(a.points ?? 0) > 0)
    .reduce((sum, a) => sum + Number(a.points ?? 0), 0);
  const latestBadge = raw.badges?.[0];

  return {
    totalPoints,
    currentLevel,
    levelProgress,
    badgeCount: raw.badges?.length ?? 0,
    rank: 0,
    currentStreak: streakRow?.currentStreak ?? 0,
    pointsToday,
    recentBadge: latestBadge
      ? {
          title: latestBadge.name ?? "Badge",
          iconEmoji: "🏅",
          earnedAt: latestBadge.earnedAt ?? new Date().toISOString(),
        }
      : undefined,
  };
}

export async function fetchGamificationUser(): Promise<RawGamificationUser | null> {
  const res = await fetch("/api/gamification/user", { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}
