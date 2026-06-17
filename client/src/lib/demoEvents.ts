/**
 * Demo events with fake attendee counts for home / events list when API is sparse.
 */
import { resolveDemoCreatorId } from "@/lib/demoProfiles";

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
    id: "demo-ev-pickup-bball",
    title: "Pickup Basketball — Open Run",
    description: "Casual 3v3/5v5, all levels. Bring trainers.",
    location: "Marina Courts · Cork",
    sport: "Basketball",
    starts_at: hoursFromNow(2),
    going_count: 8,
    interested_count: 3,
    capacity: 12,
    creator_first_name: "Jordan",
    creator_username: "jordan_bball",
    isDemo: true,
  },
  {
    id: "demo-ev-5v5-soccer",
    title: "5-a-side Tonight — Need 2",
    description: "Kickoff 7pm. Keeper + outfield still open.",
    location: "Pairc Ui Chaoimh",
    sport: "Soccer",
    starts_at: hoursFromNow(5),
    going_count: 6,
    interested_count: 4,
    capacity: 10,
    creator_first_name: "Cork FC",
    creator_username: "cork_fc",
    isDemo: true,
  },
  {
    id: "demo-ev-padel-mixer",
    title: "Padel Doubles Mixer",
    description: "All levels · courts 2 & 4 booked.",
    location: "Padel Hub Marina",
    sport: "Padel",
    starts_at: hoursFromNow(26),
    going_count: 4,
    interested_count: 2,
    capacity: 8,
    creator_first_name: "Mia",
    creator_username: "mia_futsal",
    isDemo: true,
  },
  {
    id: "demo-ev-trail-run",
    title: "Sunday Trail Run 12km",
    description: "All paces welcome · water at halfway.",
    location: "Fitzgerald's Park",
    sport: "Running",
    starts_at: hoursFromNow(48),
    going_count: 14,
    interested_count: 6,
    capacity: 30,
    creator_first_name: "Sam",
    creator_username: "sam_track",
    isDemo: true,
  },
  {
    id: "demo-route-cycling",
    title: "Harbour Loop Ride",
    description: "Scenic 18 km loop along the waterfront.",
    location: "Cork Harbour",
    sport: "Cycling",
    starts_at: hoursFromNow(24),
    going_count: 22,
    interested_count: 8,
    capacity: 40,
    creator_first_name: "Cycle",
    creator_username: "cycle_squad",
    isDemo: true,
  },
  {
    id: "demo-route-hiking",
    title: "Ridge Trail Hike",
    description: "Moderate hike with city views.",
    location: "Montenotte Ridge",
    sport: "Hiking",
    starts_at: hoursFromNow(72),
    going_count: 9,
    interested_count: 4,
    capacity: 16,
    creator_first_name: "Trail",
    creator_username: "trail_cork",
    isDemo: true,
  },
  {
    id: "demo-ev-beach-vb",
    title: "Beach Volleyball — Sunset Session",
    description: "Drop-in friendly games on the strand.",
    location: "Marina Strand",
    sport: "Volleyball",
    starts_at: hoursFromNow(8),
    going_count: 11,
    interested_count: 5,
    capacity: 16,
    creator_first_name: "Beach VB",
    creator_username: "beach_vb",
    isDemo: true,
  },
  {
    id: "demo-ev-yoga-pier",
    title: "Sunrise Yoga on the Pier",
    description: "Community flow · mats provided.",
    location: "City Pier",
    sport: "Yoga",
    starts_at: hoursFromNow(30),
    going_count: 9,
    interested_count: 7,
    capacity: 20,
    creator_first_name: "Zoe",
    creator_username: "zoe_flow",
    isDemo: true,
  },
  {
    id: "demo-ev-open-water",
    title: "Open Water Swim Set",
    description: "Coach on deck · bring fins if you have them.",
    location: "Aqua Centre",
    sport: "Swimming",
    starts_at: hoursFromNow(20),
    going_count: 5,
    interested_count: 2,
    capacity: 10,
    creator_first_name: "Aqua",
    creator_username: "aqua_centre",
    isDemo: true,
  },
  {
    id: "demo-ev-mma-spar",
    title: "MMA Sparring — Intermediate",
    description: "Controlled rounds · mouthguard required.",
    location: "Nova Gym",
    sport: "MMA",
    starts_at: hoursFromNow(72),
    going_count: 7,
    interested_count: 3,
    capacity: 12,
    creator_first_name: "Kai",
    creator_username: "kai_muay",
    isDemo: true,
  },
];

export function isDemoEventId(id: string): boolean {
  return id.startsWith("demo-ev-");
}

export function getDemoEvent(id: string): DemoEvent | undefined {
  return DEMO_EVENTS.find((e) => e.id === id);
}

/** Shape expected by EventDetailsPage / useEvent */
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

/** Use demo events only when the API returns nothing, or mix demos in for home discovery. */
export function mergeWithDemoEvents(
  apiEvents: any[],
  options?: { skipDemo?: boolean; mixDemos?: boolean },
): any[] {
  const api = Array.isArray(apiEvents) ? apiEvents : [];
  if (options?.skipDemo) return api;
  if (options?.mixDemos) {
    const apiIds = new Set(api.map((e) => String(e.id)));
    const extras = DEMO_EVENTS.filter((d) => !apiIds.has(d.id));
    return [...api, ...extras];
  }
  if (api.length > 0) return api;
  return [...DEMO_EVENTS];
}
