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
} as const;

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
