import { apiRequest } from "@/lib/queryClient";

export type SocialPerson = {
  id: string;
  username?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  sport?: string | null;
  location?: string | null;
  isFollowing?: boolean;
};

function rowToPerson(row: Record<string, unknown>): SocialPerson | null {
  const id = (row.id as string) || (row.followingId as string);
  if (!id) return null;
  return {
    id,
    username: (row.username as string) ?? null,
    displayName: (row.display_name as string) ?? (row.displayName as string) ?? null,
    firstName: (row.first_name as string) ?? (row.firstName as string) ?? null,
    lastName: (row.last_name as string) ?? (row.lastName as string) ?? null,
    profileImageUrl: (row.profile_image_url as string) ?? (row.profileImageUrl as string) ?? null,
    sport: (row.sport as string) ?? null,
    location: (row.location as string) ?? null,
  };
}

export function personDisplayName(p: SocialPerson): string {
  return (
    p.displayName ||
    `${p.firstName || ""} ${p.lastName || ""}`.trim() ||
    p.username ||
    "Athlete"
  );
}

export function personUsername(p: SocialPerson): string {
  return (p.username || "user").replace(/^@+/, "");
}

export function personInitials(p: SocialPerson): string {
  const name = personDisplayName(p);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export async function fetchFollowers(userId: string): Promise<SocialPerson[]> {
  const res = await fetch(`/api/users/${userId}/followers`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load followers");
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows.map(rowToPerson).filter((p): p is SocialPerson => p !== null);
}

export async function fetchFollowing(userId: string): Promise<SocialPerson[]> {
  const res = await fetch(`/api/users/${userId}/following`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load following");
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows.map(rowToPerson).filter((p): p is SocialPerson => p !== null);
}

export async function fetchSuggestedPeople(limit = 24): Promise<SocialPerson[]> {
  const res = await fetch(`/api/users/suggested?limit=${limit}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load suggestions");
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows.map(rowToPerson).filter((p): p is SocialPerson => p !== null);
}

export async function searchPeople(query: string, limit = 24): Promise<SocialPerson[]> {
  const params = new URLSearchParams({ q: query.trim(), type: "users", limit: String(limit) });
  const res = await fetch(`/api/search?${params}`, { credentials: "include" });
  if (!res.ok) return [];
  const data = (await res.json()) as { users?: Record<string, unknown>[] };
  const rows = data.users ?? [];
  return rows.map(rowToPerson).filter((p): p is SocialPerson => p !== null);
}

export async function followUser(userId: string): Promise<void> {
  await apiRequest("POST", `/api/users/${userId}/follow`, { followingType: "user" });
}

export async function unfollowUser(userId: string): Promise<void> {
  await apiRequest("DELETE", `/api/users/${userId}/unfollow`);
}

export function discoverPeoplePath(
  tab: "followers" | "following" | "discover",
  userId?: string,
): string {
  const params = new URLSearchParams({ tab });
  if (userId) params.set("user", userId);
  return `/discover/people?${params.toString()}`;
}
