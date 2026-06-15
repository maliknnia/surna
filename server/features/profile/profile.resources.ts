import { db } from "../../db";
import {
  posts,
  teams,
  teamMembers,
  events,
  eventParticipants,
} from "@shared/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import { GamificationService } from "../../gamification/gamificationService";

export async function getProfileTeams(userId: string) {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      logo: teams.logo,
      sport: teams.sport,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.status, "active")))
    .orderBy(desc(teamMembers.joinedAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    logo: r.logo,
    sport: r.sport,
    role: r.role ?? "member",
    joinedAt: r.joinedAt?.toISOString?.() ?? r.joinedAt,
  }));
}

export async function getProfileFeed(userId: string, limit = 20) {
  const rows = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl,
      videoUrl: posts.videoUrl,
      createdAt: posts.createdAt,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
    })
    .from(posts)
    .where(and(eq(posts.authorId, userId), eq(posts.removed, false)))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  return rows.map((p) => ({
    id: p.id,
    content: p.content,
    imageUrl: p.imageUrl,
    videoUrl: p.videoUrl,
    createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
    likesCount: p.likesCount ?? 0,
    commentsCount: p.commentsCount ?? 0,
  }));
}

export async function getProfileAchievements(userId: string) {
  const stats = await GamificationService.getUserStats(userId);
  return stats.badges.map((b) => ({
    title: b.name,
    description: b.description,
    date: b.earnedAt instanceof Date ? b.earnedAt.toISOString() : String(b.earnedAt),
    tier: b.tier || "bronze",
  }));
}

async function weeklyActivityCounts(userId: string): Promise<number[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const rows = await db
    .select({ createdAt: posts.createdAt })
    .from(posts)
    .where(and(eq(posts.authorId, userId), gte(posts.createdAt, start)));

  const buckets = new Array(7).fill(0);
  for (const row of rows) {
    if (!row.createdAt) continue;
    const dayIndex = Math.floor(
      (new Date(row.createdAt).getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (dayIndex >= 0 && dayIndex < 7) buckets[dayIndex]++;
  }
  return buckets;
}

export async function getProfilePerformance(userId: string) {
  const stats = await GamificationService.getUserStats(userId);
  const weeklyActivity = await weeklyActivityCounts(userId);
  const streak = stats.streaks[0];

  return {
    weeklyActivity,
    monthlyGoals: {
      completed: stats.recentActivities.length,
      total: Math.max(stats.recentActivities.length, 10),
    },
    improvementRate: Math.min(100, Math.round((stats.totalPoints / Math.max(stats.level, 1)) % 100)),
    consistency: streak && streak.currentStreak >= 7 ? "High" : streak && streak.currentStreak >= 3 ? "Medium" : "Building",
    aiSummary:
      stats.totalPoints > 0
        ? `Level ${stats.level} with ${stats.totalPoints} points. ${streak ? `Current streak: ${streak.currentStreak} days.` : "Keep logging activity to build streaks."}`
        : "Complete challenges and join events to unlock performance insights.",
    recentMatches: stats.recentActivities.slice(0, 5).map((a) => ({
      date: a.createdAt instanceof Date ? a.createdAt.toISOString().slice(0, 10) : String(a.createdAt).slice(0, 10),
      opponent: a.description || a.action,
      result: a.points > 0 ? "win" : "draw",
      score: `${a.points} pts`,
    })),
  };
}

export async function getProfileEvents(userId: string) {
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      date: events.startDate,
      location: events.location,
      status: eventParticipants.status,
    })
    .from(eventParticipants)
    .innerJoin(events, eq(eventParticipants.eventId, events.id))
    .where(eq(eventParticipants.userId, userId))
    .orderBy(desc(events.startDate))
    .limit(30);

  const now = Date.now();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date?.toISOString?.() ?? r.date,
    location: { address: r.location ?? "" },
    status:
      r.date && new Date(r.date).getTime() < now
        ? "attended"
        : r.status === "confirmed"
          ? "upcoming"
          : r.status ?? "registered",
  }));
}
