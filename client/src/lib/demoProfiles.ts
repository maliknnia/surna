import type { DemoStoryUser } from "@/lib/personalizedDemoFeed";
import { DEMO_STORY_POOL } from "@/lib/personalizedDemoFeed";
import { SHOWCASE_ATHLETES } from "@/lib/demoShowcase";
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
  return DEMO_STORY_POOL[0]?.id ?? "ds-aisha";
}

function storyUserToProfile(demo: DemoStoryUser) {
  const showcase = SHOWCASE_ATHLETES.find((a) => a.id === demo.id);
  const displayName = [demo.firstName, demo.lastName].filter(Boolean).join(" ") || demo.username;
  return normalizeUserProfile({
    id: demo.id,
    firstName: demo.firstName,
    lastName: demo.lastName || "",
    username: demo.username,
    profileImageUrl: demo.profileImageUrl,
    displayName,
    email: `${demo.username}@demo.surna.app`,
    bio: showcase?.bio ?? `${demo.sport} · SURNA showcase athlete`,
    primarySport: demo.sport,
    verified: true,
    followersCount: 840,
    followingCount: 128,
    isFollowing: false,
    isDemo: true,
  });
}

/** Video reel authors — same two showcase athletes. */
const VIDEO_AUTHOR_PROFILES: Record<
  string,
  { firstName: string; lastName: string; sport: string; username: string; profileImageUrl: string }
> = {
  u1: {
    firstName: SHOWCASE_ATHLETES[0].firstName,
    lastName: SHOWCASE_ATHLETES[0].lastName,
    sport: SHOWCASE_ATHLETES[0].sport,
    username: SHOWCASE_ATHLETES[0].username,
    profileImageUrl: SHOWCASE_ATHLETES[0].profileImageUrl,
  },
  u2: {
    firstName: SHOWCASE_ATHLETES[1].firstName,
    lastName: SHOWCASE_ATHLETES[1].lastName,
    sport: SHOWCASE_ATHLETES[1].sport,
    username: SHOWCASE_ATHLETES[1].username,
    profileImageUrl: SHOWCASE_ATHLETES[1].profileImageUrl,
  },
};

function videoAuthorProfile(userId: string) {
  const row = VIDEO_AUTHOR_PROFILES[userId];
  if (!row) return null;
  return normalizeUserProfile({
    id: userId,
    firstName: row.firstName,
    lastName: row.lastName,
    username: row.username,
    profileImageUrl: row.profileImageUrl,
    displayName: `${row.firstName} ${row.lastName}`,
    email: `${row.username}@demo.surna.app`,
    bio: `${row.sport} · SURNA showcase athlete`,
    primarySport: row.sport,
    verified: true,
    followersCount: 840,
    followingCount: 128,
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
