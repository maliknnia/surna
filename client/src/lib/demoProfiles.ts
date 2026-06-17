import type { DemoStoryUser } from "@/lib/personalizedDemoFeed";
import { DEMO_STORY_POOL } from "@/lib/personalizedDemoFeed";
import { isDemoStoryUserId, findDemoStoryUser } from "@/lib/demoStories";
import { normalizeUserProfile } from "@/lib/normalizeUserProfile";

/** Map demo event organizer username → story-pool profile id. */
export function resolveDemoCreatorId(demo: {
  creator_username?: string;
  creator_first_name?: string;
}): string {
  const username = (demo.creator_username || "").replace(/^@+/, "").toLowerCase();
  if (username) {
    const match = DEMO_STORY_POOL.find(
      (u) => u.username.replace(/^@+/, "").toLowerCase() === username,
    );
    if (match) return match.id;
  }
  const first = (demo.creator_first_name || "").toLowerCase();
  if (first) {
    const match = DEMO_STORY_POOL.find((u) => u.firstName.toLowerCase() === first);
    if (match) return match.id;
  }
  return DEMO_STORY_POOL[0]?.id ?? "ds-jordan";
}

function storyUserToProfile(demo: DemoStoryUser) {
  const displayName = [demo.firstName, demo.lastName].filter(Boolean).join(" ") || demo.username;
  return normalizeUserProfile({
    id: demo.id,
    firstName: demo.firstName,
    lastName: demo.lastName || "",
    username: demo.username,
    profileImageUrl: demo.profileImageUrl,
    displayName,
    email: `${demo.username}@demo.surna.app`,
    bio: `${demo.sport} · Demo athlete on SURNA`,
    primarySport: demo.sport,
    verified: false,
    followersCount: 120 + (demo.id.length * 17) % 400,
    followingCount: 48 + (demo.id.length * 11) % 120,
    isFollowing: false,
    isDemo: true,
  });
}

/** Minimal profile for legacy demo video author ids (u1, u2, …). */
const VIDEO_AUTHOR_PROFILES: Record<
  string,
  { firstName: string; lastName: string; sport: string; username: string; seed: string }
> = {
  u1: { firstName: "Marcus", lastName: "Johnson", sport: "Basketball", username: "marcus_j", seed: "marcus" },
  u2: { firstName: "Sarah", lastName: "Chen", sport: "Fitness", username: "sarah_lift", seed: "sarah" },
  u3: { firstName: "Jordan", lastName: "Williams", sport: "Soccer", username: "jordan_w", seed: "jordan" },
  u4: { firstName: "Alex", lastName: "Rivera", sport: "Swimming", username: "alex_swim", seed: "alex" },
  u5: { firstName: "Taylor", lastName: "Smith", sport: "Tennis", username: "taylor_t", seed: "taylor" },
  u6: { firstName: "Dylan", lastName: "Healy", sport: "Running", username: "dylan_run", seed: "dylan" },
  u7: { firstName: "Leila", lastName: "Musa", sport: "Yoga", username: "leila_yoga", seed: "leila" },
};

function videoAuthorProfile(userId: string) {
  const row = VIDEO_AUTHOR_PROFILES[userId];
  if (!row) return null;
  return normalizeUserProfile({
    id: userId,
    firstName: row.firstName,
    lastName: row.lastName,
    username: row.username,
    profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.seed)}`,
    displayName: `${row.firstName} ${row.lastName}`,
    email: `${row.username}@demo.surna.app`,
    bio: `${row.sport} · Demo athlete on SURNA`,
    primarySport: row.sport,
    verified: false,
    followersCount: 200,
    followingCount: 64,
    isFollowing: false,
    isDemo: true,
  });
}

export function isDemoProfileUserId(userId: string | undefined): boolean {
  if (!userId) return false;
  if (isDemoStoryUserId(userId)) return true;
  if (userId === "demo-creator") return true;
  return userId in VIDEO_AUTHOR_PROFILES;
}

/** Build a viewable profile for demo / seed users (no API). */
export function buildDemoUserProfile(userId: string) {
  const story = findDemoStoryUser(userId);
  if (story) return storyUserToProfile(story);

  if (userId === "demo-creator") {
    const fallback = DEMO_STORY_POOL[0];
    return fallback ? storyUserToProfile(fallback) : null;
  }

  return videoAuthorProfile(userId);
}
