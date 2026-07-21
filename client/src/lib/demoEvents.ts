/**
 * Demo events — polished showcase when discovery is empty or sparse.
 */
import { resolveDemoCreatorId } from "@/lib/demoProfiles";
import { DEMO_SHOWCASE_LIMIT, SHOWCASE_ATHLETES } from "@/lib/demoShowcase";
import { isDemoContentFallbackEnabled } from "@/config/demoMode";

export type DemoEvent = {
  id: string;
  title: string;
  description?: string;
  location: string;
  sport: string;
  starts_at: string;
  going_count: number;
  interested_count?: number;
  capacity?: number;
  creator_first_name?: string;
  creator_username?: string;
  creator_avatar?: string;
  cover_url?: string;
  isDemo?: boolean;
};

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600_000).toISOString();
}

function athlete(username: string) {
  return SHOWCASE_ATHLETES.find((a) => a.username === username);
}

export const DEMO_EVENTS: DemoEvent[] = [
  {
    id: "demo-ev-open-water",
    title: "Open Water Swim Set",
    description: "Coach-led technique session · fins optional.",
    location: "Georgia Tech Aquatic Center · Atlanta",
    sport: "Swimming",
    starts_at: hoursFromNow(20),
    going_count: 12,
    interested_count: 4,
    capacity: 16,
    creator_first_name: "Aisha",
    creator_username: "aisha_swim",
    creator_avatar: athlete("aisha_swim")?.profileImageUrl,
    cover_url: athlete("aisha_swim")?.coverImageUrl,
    isDemo: true,
  },
  {
    id: "demo-ev-tennis-clinic",
    title: "Serve & Match-Play Clinic",
    description: "Small group · all levels welcome.",
    location: "Central Park Courts · NYC",
    sport: "Tennis",
    starts_at: hoursFromNow(26),
    going_count: 8,
    interested_count: 3,
    capacity: 12,
    creator_first_name: "Elena",
    creator_username: "elena_tennis",
    creator_avatar: athlete("elena_tennis")?.profileImageUrl,
    cover_url: athlete("elena_tennis")?.coverImageUrl,
    isDemo: true,
  },
  {
    id: "demo-ev-sunrise-run",
    title: "Sunrise 10K & Coffee",
    description: "Easy pace group run · coffee stop after.",
    location: "Marina Walk · Cork",
    sport: "Running",
    starts_at: hoursFromNow(14),
    going_count: 18,
    interested_count: 6,
    capacity: 30,
    creator_first_name: "Marcus",
    creator_username: "marcus_run",
    creator_avatar: athlete("marcus_run")?.profileImageUrl,
    cover_url: athlete("marcus_run")?.coverImageUrl,
    isDemo: true,
  },
];

export function isDemoEventId(id: string): boolean {
  return id.startsWith("demo-ev-") || id.startsWith("demo-route-");
}

export function getDemoEvent(id: string): DemoEvent | undefined {
  return DEMO_EVENTS.find((e) => e.id === id);
}

export function demoEventToApiRow(demo: DemoEvent) {
  const end = new Date(new Date(demo.starts_at).getTime() + 2 * 3600_000).toISOString();
  return {
    id: demo.id,
    creator_id: resolveDemoCreatorId(demo),
    title: demo.title,
    description: demo.description,
    starts_at: demo.starts_at,
    ends_at: end,
    startDate: demo.starts_at,
    endDate: end,
    location: demo.location,
    sport: demo.sport,
    visibility: "public" as const,
    capacity: demo.capacity ?? null,
    created_at: demo.starts_at,
    creator_first_name: demo.creator_first_name,
    creator_username: demo.creator_username,
    creator_avatar: demo.creator_avatar,
    cover_url: demo.cover_url,
    coverUrl: demo.cover_url,
    imageUrl: demo.cover_url,
    going_count: demo.going_count,
    interested_count: demo.interested_count ?? 0,
    total_rsvps: demo.going_count + (demo.interested_count ?? 0),
    isDemo: true,
  };
}

/** Drop leftover integration-test events from public lists. */
export function isJunkApiEvent(ev: { id?: string; title?: string; creator_id?: string; creatorId?: string }): boolean {
  const creator = String(ev.creator_id ?? ev.creatorId ?? "");
  const title = String(ev.title ?? "");
  if (creator.startsWith("jwt-")) return true;
  if (/^Wave\d+\s/i.test(title)) return true;
  if (/\bmq[a-z0-9]{5,}\b/i.test(title)) return true;
  return false;
}

export function mergeWithDemoEvents(
  apiEvents: any[],
  options?: { skipDemo?: boolean; mixDemos?: boolean; fallback?: boolean },
): any[] {
  const api = (Array.isArray(apiEvents) ? apiEvents : []).filter((e) => !isJunkApiEvent(e));
  if (options?.skipDemo ?? true) return api;
  if (!isDemoContentFallbackEnabled()) return api;
  const demos = DEMO_EVENTS.slice(0, DEMO_SHOWCASE_LIMIT);
  if (options?.mixDemos) {
    const apiIds = new Set(api.map((e) => String(e.id)));
    const extras = demos.filter((d) => !apiIds.has(d.id)).map(demoEventToApiRow);
    if (api.length >= DEMO_SHOWCASE_LIMIT) return api;
    return [...api, ...extras].slice(0, DEMO_SHOWCASE_LIMIT);
  }
  if (api.length > 0) return api;
  if (options?.fallback) return demos.map(demoEventToApiRow);
  return api;
}
