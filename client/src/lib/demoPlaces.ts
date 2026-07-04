/**
 * Demo venues — two showcase locations only (swim + tennis).
 */

import type { Place } from "@shared/schema";
import { DEMO_SHOWCASE_LIMIT } from "@/lib/demoShowcase";
import { defaultBookingModeForCategory } from "@shared/placeBooking";

export type DemoPlace = {
  id: string;
  name: string;
  category: string;
  sports: string[];
  bio?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  hours?: Record<string, string>;
  amenities?: string[];
  followersCount?: number;
  reviewsCount?: number;
  averageRating?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  isDemo?: boolean;
};

const IMG = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=85`;

const WEEKDAY_HOURS = {
  monday: "6:00 AM – 10:00 PM",
  tuesday: "6:00 AM – 10:00 PM",
  wednesday: "6:00 AM – 10:00 PM",
  thursday: "6:00 AM – 10:00 PM",
  friday: "6:00 AM – 9:00 PM",
  saturday: "7:00 AM – 8:00 PM",
  sunday: "8:00 AM – 6:00 PM",
};

export const DEMO_PLACES: DemoPlace[] = [
  {
    id: "demo-place-tech-aquatics",
    name: "Georgia Tech Aquatic Center",
    category: "pool",
    sports: ["Swimming"],
    bio: "Olympic-quality 50m pool — masters and youth sessions.",
    description: "Competition pool with timing system, diving well, and coached lane sessions.",
    address: "750 Ferst Dr NW",
    city: "Atlanta",
    state: "GA",
    country: "USA",
    latitude: 33.7756,
    longitude: -84.3963,
    hours: WEEKDAY_HOURS,
    amenities: ["Indoor", "Timing system", "Coaching"],
    followersCount: 412,
    reviewsCount: 68,
    averageRating: "4.9",
    profileImageUrl: IMG("1629909613654-28e377c9fb7a", 400, 400),
    coverImageUrl: IMG("1629909613654-28e377c9fb7a", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-place-metro-tennis",
    name: "Metro Tennis Center",
    category: "court",
    sports: ["Tennis"],
    bio: "Hard courts with evening lights — USTA league home base.",
    description: "Eight lighted hard courts, ball machine rental, and pro shop on site.",
    address: "340 W 96th St",
    city: "New York",
    state: "NY",
    country: "USA",
    latitude: 40.793,
    longitude: -73.971,
    hours: { ...WEEKDAY_HOURS, sunday: "8:00 AM – 8:00 PM" },
    amenities: ["Lights", "Pro shop", "Coaching"],
    followersCount: 328,
    reviewsCount: 54,
    averageRating: "4.8",
    profileImageUrl: IMG("1622163640459-1b9a4661f851", 400, 400),
    coverImageUrl: IMG("1622163640459-1b9a4661f851", 1200, 600),
    isDemo: true,
  },
];

export function normalizeDemoPlaceId(id: string): string {
  const normalized = id.replace(/^place-/, "demo-place-");
  if (normalized.startsWith("demo-place-")) return normalized;
  return id.startsWith("demo-") ? id : `demo-place-${id}`;
}

export function isDemoPlaceId(id: string): boolean {
  const normalized = normalizeDemoPlaceId(id);
  return normalized.startsWith("demo-place-") || id.startsWith("dp");
}

export function getDemoPlace(id: string): DemoPlace | undefined {
  const normalized = normalizeDemoPlaceId(id);
  return DEMO_PLACES.find((p) => p.id === normalized);
}

/** Shape expected by PlaceProfile / VenueCard */
export function demoPlaceToApiRow(demo: DemoPlace): Place & { isDemo?: boolean } {
  return {
    id: demo.id,
    ownerId: "demo-owner",
    name: demo.name,
    category: demo.category,
    sports: demo.sports,
    bio: demo.bio ?? null,
    description: demo.description ?? null,
    profileImageUrl: demo.profileImageUrl ?? null,
    coverImageUrl: demo.coverImageUrl ?? null,
    email: null,
    phone: demo.phone ?? null,
    website: demo.website ?? null,
    address: demo.address ?? null,
    city: demo.city ?? null,
    state: demo.state ?? null,
    country: demo.country ?? null,
    zipCode: null,
    latitude: demo.latitude != null ? String(demo.latitude) : null,
    longitude: demo.longitude != null ? String(demo.longitude) : null,
    hours: demo.hours ?? null,
    amenities: demo.amenities ?? [],
    pricing: null,
    isVerified: true,
    isActive: true,
    followersCount: demo.followersCount ?? 0,
    reviewsCount: demo.reviewsCount ?? 0,
    averageRating: demo.averageRating ?? "0",
    bookingsCount: 0,
    viewsCount: 0,
    bookingMode: defaultBookingModeForCategory(demo.category),
    slotDurationMinutes: 60,
    slotPrice: null,
    featuredHighlightIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDemo: true,
  };
}

export function mergeWithDemoPlaces(
  apiPlaces: any[],
  options?: { skipDemo?: boolean; mixDemos?: boolean; fallback?: boolean },
): any[] {
  const api = Array.isArray(apiPlaces) ? apiPlaces : [];
  if (options?.skipDemo ?? true) return api;
  const demos = DEMO_PLACES.slice(0, DEMO_SHOWCASE_LIMIT).map(demoPlaceToApiRow);
  if (options?.mixDemos) {
    const apiIds = new Set(api.map((p) => String(p.id)));
    const extras = demos.filter((d) => !apiIds.has(d.id));
    return [...api, ...extras].slice(0, DEMO_SHOWCASE_LIMIT);
  }
  if (api.length > 0) return api;
  if (options?.fallback) return demos;
  return demos;
}
