/**
 * Demo venues for discovery / profile when the API is sparse (Cork-focused).
 */

import type { Place } from "@shared/schema";

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

function demoPhoto(seed: string, w: number, h: number): string {
  return `https://picsum.photos/seed/surna-place-${encodeURIComponent(seed)}/${w}/${h}`;
}

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
    id: "demo-place-iron-forge",
    name: "Iron Forge Gym",
    category: "gym",
    sports: ["CrossFit", "Fitness", "Strength"],
    bio: "Strength & conditioning in the heart of Cork.",
    description: "Open gym floor, lifting platforms, and coached CrossFit classes daily.",
    address: "12 South Mall",
    city: "Cork",
    state: "Co. Cork",
    country: "Ireland",
    phone: "+353 21 555 0101",
    latitude: 51.8982,
    longitude: -8.4738,
    hours: WEEKDAY_HOURS,
    amenities: ["Parking", "Showers", "Equipment rental"],
    followersCount: 842,
    reviewsCount: 126,
    averageRating: "4.8",
    profileImageUrl: demoPhoto("iron-forge-av", 400, 400),
    coverImageUrl: demoPhoto("iron-forge-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-place-greenfield-courts",
    name: "Greenfield Courts",
    category: "court",
    sports: ["Basketball", "Tennis"],
    bio: "Outdoor courts with floodlights.",
    description: "Two full basketball courts and four tennis courts. Book online or drop in.",
    address: "Marina Walk",
    city: "Cork",
    state: "Co. Cork",
    country: "Ireland",
    latitude: 51.9015,
    longitude: -8.4682,
    hours: { ...WEEKDAY_HOURS, sunday: "8:00 AM – 8:00 PM" },
    amenities: ["Parking", "Floodlights"],
    followersCount: 512,
    reviewsCount: 89,
    averageRating: "4.5",
    profileImageUrl: demoPhoto("greenfield-av", 400, 400),
    coverImageUrl: demoPhoto("greenfield-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-place-riverside-complex",
    name: "Riverside Sports Complex",
    category: "field",
    sports: ["Soccer", "Rugby", "GAA"],
    bio: "Multi-sport pitches on the Lee.",
    description: "Full-size GAA pitch, rugby field, and 5-a-side soccer cages.",
    address: "Riverside Park",
    city: "Cork",
    state: "Co. Cork",
    country: "Ireland",
    latitude: 51.8925,
    longitude: -8.4812,
    hours: WEEKDAY_HOURS,
    amenities: ["Parking", "Changing rooms", "Cafe"],
    followersCount: 1204,
    reviewsCount: 203,
    averageRating: "4.7",
    profileImageUrl: demoPhoto("riverside-av", 400, 400),
    coverImageUrl: demoPhoto("riverside-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-place-thunder-mma",
    name: "Thunder MMA Academy",
    category: "gym",
    sports: ["MMA", "Boxing", "BJJ"],
    bio: "Striking, grappling, and sparring for all levels.",
    description: "Coached classes morning and evening. Beginners welcome.",
    address: "8 MacCurtain St",
    city: "Cork",
    state: "Co. Cork",
    country: "Ireland",
    phone: "+353 21 555 0199",
    latitude: 51.9038,
    longitude: -8.4655,
    hours: WEEKDAY_HOURS,
    amenities: ["Showers", "Mats", "Pro shop"],
    followersCount: 678,
    reviewsCount: 94,
    averageRating: "4.9",
    profileImageUrl: demoPhoto("thunder-av", 400, 400),
    coverImageUrl: demoPhoto("thunder-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-place-aqua-centre",
    name: "Aqua Centre",
    category: "pool",
    sports: ["Swimming"],
    bio: "25m pool, lane swimming and aqua classes.",
    description: "Lane hire, masters swim, and kids lessons.",
    address: "Victoria Cross",
    city: "Cork",
    state: "Co. Cork",
    country: "Ireland",
    latitude: 51.8938,
    longitude: -8.4925,
    hours: WEEKDAY_HOURS,
    amenities: ["Parking", "Lockers", "Sauna"],
    followersCount: 445,
    reviewsCount: 67,
    averageRating: "4.3",
    profileImageUrl: demoPhoto("aqua-av", 400, 400),
    coverImageUrl: demoPhoto("aqua-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-place-westside-tennis",
    name: "Westside Tennis Club",
    category: "court",
    sports: ["Tennis", "Padel"],
    bio: "Indoor and outdoor courts.",
    description: "Club socials, coaching, and court hire.",
    address: "Model Farm Rd",
    city: "Cork",
    state: "Co. Cork",
    country: "Ireland",
    latitude: 51.8872,
    longitude: -8.5102,
    hours: WEEKDAY_HOURS,
    amenities: ["Parking", "Pro shop", "Cafe"],
    followersCount: 389,
    reviewsCount: 54,
    averageRating: "4.6",
    profileImageUrl: demoPhoto("westside-av", 400, 400),
    coverImageUrl: demoPhoto("westside-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-place-peak-performance",
    name: "Peak Performance",
    category: "studio",
    sports: ["Yoga", "Pilates", "Fitness"],
    bio: "Mind-body studio with daily classes.",
    description: "Yoga, reformer pilates, and mobility sessions.",
    address: "Paul St",
    city: "Cork",
    state: "Co. Cork",
    country: "Ireland",
    latitude: 51.8995,
    longitude: -8.4745,
    hours: WEEKDAY_HOURS,
    amenities: ["Mats provided", "Showers"],
    followersCount: 556,
    reviewsCount: 72,
    averageRating: "4.4",
    profileImageUrl: demoPhoto("peak-av", 400, 400),
    coverImageUrl: demoPhoto("peak-cover", 1200, 600),
    isDemo: true,
  },
  {
    id: "demo-place-pairc-gaa",
    name: "Pairc Ui Chaoimh",
    category: "gaa-pitch",
    sports: ["GAA", "Hurling", "Football"],
    bio: "County GAA grounds — training and match nights.",
    description: "Main pitch and training walls. Community sessions weekly.",
    address: "Ballintemple",
    city: "Cork",
    state: "Co. Cork",
    country: "Ireland",
    latitude: 51.8942,
    longitude: -8.4358,
    hours: { ...WEEKDAY_HOURS, friday: "4:00 PM – 10:00 PM" },
    amenities: ["Parking", "Floodlights"],
    followersCount: 2100,
    reviewsCount: 312,
    averageRating: "4.8",
    profileImageUrl: demoPhoto("pairc-av", 400, 400),
    coverImageUrl: demoPhoto("pairc-cover", 1200, 600),
    isDemo: true,
  },
];

/** Legacy map pin ids → canonical demo place id */
const LEGACY_PLACE_ID_MAP: Record<string, string> = {
  dp0: "demo-place-iron-forge",
  dp1: "demo-place-greenfield-courts",
  dp2: "demo-place-riverside-complex",
  dp3: "demo-place-thunder-mma",
  dp4: "demo-place-aqua-centre",
  dp5: "demo-place-westside-tennis",
  dp6: "demo-place-peak-performance",
};

export function normalizeDemoPlaceId(id: string): string {
  return LEGACY_PLACE_ID_MAP[id] ?? id;
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
    city: demo.city ?? "Cork",
    state: demo.state ?? "Co. Cork",
    country: demo.country ?? "Ireland",
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
    createdAt: new Date(),
    updatedAt: new Date(),
    isDemo: true,
  };
}

export function mergeWithDemoPlaces(
  apiPlaces: any[],
  options?: { skipDemo?: boolean; mixDemos?: boolean },
): any[] {
  const api = Array.isArray(apiPlaces) ? apiPlaces : [];
  if (options?.skipDemo) return api;
  if (options?.mixDemos) {
    const apiIds = new Set(api.map((p) => String(p.id)));
    const extras = DEMO_PLACES.filter((d) => !apiIds.has(d.id)).map(demoPlaceToApiRow);
    return [...api, ...extras];
  }
  if (api.length > 0) return api;
  return DEMO_PLACES.map(demoPlaceToApiRow);
}
