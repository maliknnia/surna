/**
 * Showcase story pool — exactly two curated athletes when the API is empty.
 */

import { DEMO_SHOWCASE_LIMIT, SHOWCASE_ATHLETES } from "@/lib/demoShowcase";

export type DemoStoryUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl: string;
  hasUnviewed: boolean;
  isLive: boolean;
  ownerType: "person" | "team" | "event" | "place" | "coach" | "challenge";
  sport: string;
  teaser: string;
};

export const DEMO_STORY_POOL: DemoStoryUser[] = SHOWCASE_ATHLETES.map((a, i) => ({
  id: a.id,
  firstName: a.firstName,
  lastName: a.lastName,
  username: a.username,
  profileImageUrl: a.profileImageUrl,
  hasUnviewed: i === 0,
  isLive: i === 1,
  ownerType: "person" as const,
  sport: a.sport,
  teaser: i === 0 ? "Morning laps 🏊" : "Serve clinic tonight 🎾",
}));

export function pickStoryUsers(_seed: number, count = DEMO_SHOWCASE_LIMIT): DemoStoryUser[] {
  return DEMO_STORY_POOL.slice(0, Math.min(count, DEMO_SHOWCASE_LIMIT));
}

/** No-op — kept for main.tsx boot hook compatibility. */
export function bumpHomeLoadGeneration(): number {
  return 0;
}
