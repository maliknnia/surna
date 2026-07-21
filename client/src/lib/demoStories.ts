import type { StoryWithUser } from "@shared/schema";
import type { DemoStoryUser } from "@/lib/personalizedDemoFeed";
import { DEMO_SHOWCASE_LIMIT } from "@/lib/demoShowcase";
import { DEMO_STORY_POOL } from "@/lib/personalizedDemoFeed";
import { isDemoContentFallbackEnabled } from "@/config/demoMode";

export function isDemoStoryUserId(userId: string): boolean {
  return userId.startsWith("ds-");
}

export function isDemoStoryId(storyId: string): boolean {
  return storyId.startsWith("demo-story-");
}

function demoUserFromStoryAccount(demo: DemoStoryUser) {
  return {
    id: demo.id,
    firstName: demo.firstName,
    lastName: demo.lastName || "",
    username: demo.username,
    profileImageUrl: demo.profileImageUrl,
    displayName: [demo.firstName, demo.lastName].filter(Boolean).join(" "),
    email: `${demo.username}@demo.surna.app`,
  };
}

/** Build viewable story slides for demo avatars in the stories bar. */
export function buildDemoStoriesForUser(demo: DemoStoryUser): StoryWithUser[] {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const createdAt = new Date(Date.now() - 45 * 60 * 1000);
  const seed = encodeURIComponent(demo.id);
  const mediaUrl = `https://picsum.photos/seed/${seed}/1080/1920`;

  const base = {
    id: `demo-story-${demo.id}`,
    userId: demo.id,
    ownerType: demo.ownerType,
    ownerId: demo.id,
    mediaUrl,
    mediaType: "image" as const,
    thumbnailUrl: `https://picsum.photos/seed/${seed}/400/700`,
    caption: demo.teaser,
    hasAudio: false,
    duration: 6,
    backgroundColor: "#0a0a0a",
    visibility: "public",
    viewCount: 0,
    expiresAt,
    createdAt,
    viewedByCurrentUser: !demo.hasUnviewed,
    user: demoUserFromStoryAccount(demo) as StoryWithUser["user"],
  };

  return [base as StoryWithUser];
}

export function buildAllDemoStories(): StoryWithUser[] {
  return DEMO_STORY_POOL.slice(0, DEMO_SHOWCASE_LIMIT).flatMap(buildDemoStoriesForUser);
}

/** API stories first; showcase demos when the feed is empty and demos are enabled. */
export function mergeApiStoriesWithDemo(apiStories: StoryWithUser[]): StoryWithUser[] {
  if (apiStories.length > 0) return apiStories;
  if (!isDemoContentFallbackEnabled()) return apiStories;
  return buildAllDemoStories();
}

export function findDemoStoryUser(userId: string): DemoStoryUser | undefined {
  return DEMO_STORY_POOL.find((d) => d.id === userId);
}
