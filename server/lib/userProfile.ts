import type { UserProfileExtras } from "@shared/userProfile";
import { parseUserProfile } from "@shared/userProfile";

export type UserRow = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
  bio?: string | null;
  sport?: string | null;
  primarySport?: string | null;
  position?: string | null;
  skillLevel?: string | null;
  availability?: string | null;
  lookingFor?: string | null;
  location?: string | null;
  verified?: boolean | null;
  profileJson?: unknown;
};

export function enrichUserRow<T extends UserRow>(row: T) {
  const profile = parseUserProfile(row.profileJson, row);
  return { ...row, profile, profileCompletion: undefined as number | undefined };
}

export function mergeUserProfile(current: UserProfileExtras, patch: Partial<UserProfileExtras>): UserProfileExtras {
  return {
    ...current,
    ...patch,
    interests: patch.interests ?? current.interests,
    sports: patch.sports ?? current.sports,
    activities: patch.activities ?? current.activities,
    highlights: patch.highlights ?? current.highlights,
    lookingFor: patch.lookingFor ?? current.lookingFor,
    favoriteTeams: patch.favoriteTeams ?? current.favoriteTeams,
    socialLinks: patch.socialLinks ?? current.socialLinks,
    media: patch.media ?? current.media,
  };
}
