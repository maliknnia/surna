import type { UserProfileExtras } from "@shared/userProfile";
import { apiRequest } from "@/lib/queryClient";

export type UserWithProfile = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  displayName?: string;
  profileImageUrl?: string;
  bio?: string;
  sport?: string;
  primarySport?: string;
  position?: string;
  skillLevel?: string;
  availability?: string;
  lookingFor?: string;
  location?: string;
  verified?: boolean;
  profile: UserProfileExtras;
  profileCompletion?: number;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
};

export type UserProfilePatch = Partial<UserProfileExtras> & {
  bio?: string;
  location?: string;
  displayName?: string;
  primarySport?: string;
  position?: string;
  skillLevel?: string;
  availability?: string;
  lookingFor?: string;
  lookingForTags?: string[];
  markSetupComplete?: boolean;
  onboardingSkipped?: boolean;
};

export async function fetchMyProfile(): Promise<UserWithProfile> {
  const res = await fetch("/api/users/me/profile", { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}: Failed to load profile`);
  return res.json();
}

export async function fetchUserProfile(userId: string): Promise<UserWithProfile> {
  const res = await fetch(`/api/users/${userId}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}: User not found`);
  return res.json();
}

export async function updateMyProfile(patch: UserProfilePatch): Promise<UserWithProfile> {
  const res = await apiRequest("PATCH", "/api/users/me/profile", patch);
  return res.json();
}
