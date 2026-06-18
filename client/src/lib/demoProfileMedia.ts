/** Demo profile stats + media for owner when API data is sparse (local / dev). */

export type DemoProfilePhoto = {
  id: string;
  imageUrl: string;
  caption?: string;
  sport?: string;
};

export const OWNER_DEMO_SPORTS = ["Basketball", "Soccer", "Tennis", "Running"] as const;

export const OWNER_DEMO_STATS = {
  level: 112,
  winRate: 72,
  gamesCount: 87,
  rating: 4.8,
  ratingCount: 24,
  currentStreak: 5,
} as const;

export const OWNER_DEMO_ABOUT = {
  bio: "Hooper & fitness junkie. Always looking for the next pickup game 🏀",
  location: "Los Angeles, CA",
  primarySport: "Basketball",
  position: "Guard / Forward",
  skillLevel: "Advanced",
  availability: "Weekends & evenings",
  lookingFor: "Pickup games, running partners, competitive sets",
} as const;

export type DemoProfileTeam = {
  id: string;
  name: string;
  sport: string;
  role: string;
  joinedAt: string;
};

export type DemoProfileEvent = {
  id: string;
  title: string;
  starts_at: string;
  location?: string;
  category?: string;
};

export const DEMO_OWNER_TEAMS: DemoProfileTeam[] = [
  { id: "demo-team-pickup", name: "LA Pickup Crew", sport: "Basketball", role: "member", joinedAt: "2025-09-12" },
  { id: "demo-team-run-club", name: "Sunset Run Club", sport: "Running", role: "member", joinedAt: "2025-11-03" },
];

export const DEMO_OWNER_EVENTS: DemoProfileEvent[] = [
  {
    id: "demo-ev-pickup-bball",
    title: "Pickup Basketball — Open Run",
    starts_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    location: "Marina Courts",
    category: "Basketball",
  },
  {
    id: "demo-ev-trail-run",
    title: "Trail Run — Griffith Loop",
    starts_at: new Date(Date.now() - 21 * 86400000).toISOString(),
    location: "Griffith Park",
    category: "Running",
  },
];

export function mergeProfileTeams<T extends { id: string }>(apiTeams: T[], isOwnProfile: boolean): (T | DemoProfileTeam)[] {
  if (apiTeams.length > 0) return apiTeams;
  if (!isOwnProfile) return [];
  return DEMO_OWNER_TEAMS;
}

export function mergeProfileEvents<T extends { id: string }>(apiEvents: T[], isOwnProfile: boolean): (T | DemoProfileEvent)[] {
  if (apiEvents.length > 0) return apiEvents;
  if (!isOwnProfile) return [];
  return DEMO_OWNER_EVENTS;
}

export const DEMO_OWNER_PHOTOS: DemoProfilePhoto[] = [
  {
    id: "demo-photo-streak",
    imageUrl: "/avatars/me.png",
    caption: "Golden hour by the water",
    sport: "Running",
  },
  {
    id: "demo-photo-bball",
    imageUrl:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80",
    caption: "Pickup at the park",
    sport: "Basketball",
  },
  {
    id: "demo-photo-soccer",
    imageUrl:
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=80",
    caption: "Sunday league",
    sport: "Soccer",
  },
  {
    id: "demo-photo-tennis",
    imageUrl:
      "https://images.unsplash.com/photo-1622279457126-aaeb751a2a38?w=600&auto=format&fit=crop&q=80",
    caption: "Evening sets",
    sport: "Tennis",
  },
  {
    id: "demo-photo-run",
    imageUrl:
      "https://images.unsplash.com/photo-1476480862126-209bf4358e27?w=600&auto=format&fit=crop&q=80",
    caption: "Trail miles",
    sport: "Running",
  },
  {
    id: "demo-photo-gym",
    imageUrl: "/5Kv9LVil48kLmqOE.webp",
    caption: "Training day",
    sport: "Basketball",
  },
];

export function mergeProfilePhotos<T extends { id: string }>(
  apiPhotos: T[],
  isOwnProfile: boolean,
): (T | DemoProfilePhoto)[] {
  if (apiPhotos.length > 0) return apiPhotos;
  if (!isOwnProfile) return [];
  return DEMO_OWNER_PHOTOS;
}

export function resolveProfileSports(
  fromUser: string[] | undefined | null,
  primarySport?: string | null,
  isOwnProfile?: boolean,
): string[] {
  const list = (fromUser ?? []).filter(Boolean);
  if (list.length > 0) return list;
  if (primarySport) return [primarySport, ...OWNER_DEMO_SPORTS.filter((s) => s !== primarySport)].slice(0, 4);
  if (isOwnProfile) return [...OWNER_DEMO_SPORTS];
  return [];
}
