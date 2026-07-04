/**
 * Demo events — two showcase fallbacks only when explicitly enabled.
 */
import { resolveDemoCreatorId } from "@/lib/demoProfiles";
import { DEMO_SHOWCASE_LIMIT } from "@/lib/demoShowcase";

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
  isDemo?: boolean;
};

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600_000).toISOString();
}

export const DEMO_EVENTS: DemoEvent[] = [
  {
    id: "demo-ev-open-water",
    title: "Open Water Swim Set",
    description: "Coach-led technique session · fins optional.",
    location: "Georgia Tech Aquatic Center · Atlanta",
    sport: "Swimming",
    starts_at: hoursFromNow(20),
    going_count: 2,
    interested_count: 1,
    capacity: 8,
    creator_first_name: "Aisha",
    creator_username: "aisha_swim",
    isDemo: true,
  },
  {
    id: "demo-ev-tennis-clinic",
    title: "Serve & Match-Play Clinic",
    description: "Small group · all levels welcome.",
    location: "Central Park Courts · NYC",
    sport: "Tennis",
    starts_at: hoursFromNow(26),
    going_count: 2,
    interested_count: 0,
    capacity: 6,
    creator_first_name: "Elena",
    creator_username: "elena_tennis",
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
    going_count: demo.going_count,
    interested_count: demo.interested_count ?? 0,
    total_rsvps: demo.going_count + (demo.interested_count ?? 0),
    isDemo: true,
  };
}

export function mergeWithDemoEvents(
  apiEvents: any[],
  options?: { skipDemo?: boolean; mixDemos?: boolean; fallback?: boolean },
): any[] {
  const api = Array.isArray(apiEvents) ? apiEvents : [];
  if (options?.skipDemo ?? true) return api;
  const demos = DEMO_EVENTS.slice(0, DEMO_SHOWCASE_LIMIT);
  if (options?.mixDemos) {
    const apiIds = new Set(api.map((e) => String(e.id)));
    const extras = demos.filter((d) => !apiIds.has(d.id));
    return [...api, ...extras].slice(0, DEMO_SHOWCASE_LIMIT);
  }
  if (api.length > 0) return api;
  if (options?.fallback) return [...demos];
  return api;
}
