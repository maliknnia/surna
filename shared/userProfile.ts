/** Rich athlete/person showcase (stored in users.profile_json). */

import type { GearProfile } from "./gearProfile";
import { parseGearProfile } from "./gearProfile";

export type UserHighlight = {
  id: string;
  title: string;
  description?: string;
  year?: string;
  emoji?: string;
};

export type UserSocialLink = {
  platform: string;
  url: string;
};

export type UserMediaItem = {
  id: string;
  type: "image" | "video";
  url: string;
  title?: string;
};

export type UserProfileExtras = {
  tagline?: string;
  /** General interests & hobbies beyond sports */
  interests?: string[];
  /** Sports they play, watch, or care about */
  sports?: string[];
  /** What they do on SURNA: pickup, leagues, coaching, spectating, etc. */
  activities?: string[];
  highlights?: UserHighlight[];
  /** fun | competitive | training | friends | events */
  lookingFor?: string[];
  favoriteTeams?: string[];
  socialLinks?: UserSocialLink[];
  media?: UserMediaItem[];
  profileSetupCompletedAt?: string;
  onboardingSkipped?: boolean;
  profilePathChosenAt?: string;
  /** Kit / merch sizing — used for team bulk orders */
  gearProfile?: GearProfile;
};

export const DEFAULT_USER_PROFILE: UserProfileExtras = {
  tagline: "",
  interests: [],
  sports: [],
  activities: [],
  highlights: [],
  lookingFor: [],
  favoriteTeams: [],
  socialLinks: [],
  media: [],
};

type UserLike = {
  id?: string;
  bio?: string | null;
  sport?: string | null;
  primarySport?: string | null;
  location?: string | null;
  skillLevel?: string | null;
  lookingFor?: string | null;
  availability?: string | null;
  position?: string | null;
  profileImageUrl?: string | null;
  verified?: boolean | null;
  heightCm?: number | null;
};

export function parseUserProfile(raw: unknown, user?: UserLike): UserProfileExtras {
  const base: UserProfileExtras = { ...DEFAULT_USER_PROFILE };
  if (raw && typeof raw === "object") {
    const o = raw as Partial<UserProfileExtras>;
    Object.assign(base, o);
    if (o.highlights) base.highlights = o.highlights;
    if (o.interests) base.interests = o.interests;
    if (o.sports) base.sports = o.sports;
    if (o.activities) base.activities = o.activities;
    if (o.media) base.media = o.media;
    if (o.gearProfile) base.gearProfile = parseGearProfile(o.gearProfile);
  }

  if (user) {
    if (!base.tagline?.trim() && user.bio) {
      const snippet = user.bio.trim().slice(0, 120);
      base.tagline = snippet.length < user.bio.trim().length ? `${snippet}…` : snippet;
    }
    if (!base.sports?.length) {
      const sports = [user.primarySport, user.sport].filter(Boolean) as string[];
      if (sports.length) base.sports = [...new Set(sports)];
    }
    if (!base.lookingFor?.length && user.lookingFor) {
      base.lookingFor = user.lookingFor.split(/[,|]+/).map((s) => s.trim()).filter(Boolean);
    }
    if (!base.gearProfile?.heightCm && user.heightCm) {
      base.gearProfile = { ...(base.gearProfile ?? {}), heightCm: user.heightCm };
    }
  }

  return base;
}

export type ProfileCompletionSection = {
  id: string;
  label: string;
  complete: boolean;
  weight: number;
};

export function profileCompletionSections(
  user: UserLike | undefined,
  profile: UserProfileExtras,
): ProfileCompletionSection[] {
  const hasName = !!(user?.bio || profile.tagline);
  return [
    { id: "photo", label: "Profile photo", complete: !!user?.profileImageUrl, weight: 15 },
    { id: "bio", label: "About you", complete: !!(user?.bio && user.bio.length >= 20), weight: 20 },
    { id: "sports", label: "Sports", complete: (profile.sports?.length ?? 0) > 0, weight: 20 },
    { id: "interests", label: "Interests", complete: (profile.interests?.length ?? 0) > 0, weight: 15 },
    { id: "highlights", label: "Highlights", complete: (profile.highlights?.length ?? 0) > 0, weight: 15 },
    { id: "location", label: "Location", complete: !!user?.location, weight: 15 },
  ];
}

export function profileCompletionPercent(user: UserLike | undefined, profile: UserProfileExtras): number {
  const sections = profileCompletionSections(user, profile);
  const total = sections.reduce((s, x) => s + x.weight, 0);
  const done = sections.filter((x) => x.complete).reduce((s, x) => s + x.weight, 0);
  return total ? Math.round((done / total) * 100) : 0;
}
