import type { MapLocationAudience } from "./mapSettings";

export type PrivacyAudience = "everyone" | "friends" | "nobody";
export type FollowAudience = "everyone" | "approval";
export type StrangerMessages = "allow" | "block";
export type MarketplaceAudience = "everyone" | "friends";

export interface UserPrivacySettings {
  // Location
  mapLocationAudience: MapLocationAudience;
  ghostMode: boolean;
  blurLocation: boolean;
  showActiveOnMap: boolean;

  // Profile
  profileVisibility: PrivacyAudience;
  statsVisibility: PrivacyAudience;
  teamsVisibility: PrivacyAudience;
  showInSearch: boolean;
  showSportAndPosition: boolean;

  // Social
  whoCanFollow: FollowAudience;
  whoCanMessage: PrivacyAudience;
  whoCanChallenge: PrivacyAudience;
  whoCanTag: PrivacyAudience;
  showInPeopleNearby: boolean;

  // Event & activity
  showInAttendeeLists: boolean;
  showPhotoInAttendeeLists: boolean;
  showActivityInFeed: boolean;
  showTeamJoinActivity: boolean;
  showEventAttendance: boolean;

  // Health profile
  healthWeeklyLoadVisibility: PrivacyAudience;
  healthMonthlyTrendVisibility: PrivacyAudience;
  healthStreakVisibility: PrivacyAudience;
  healthPersonalBestsVisibility: PrivacyAudience;

  // Messenger
  readReceipts: boolean;
  showOnlineStatus: boolean;
  whoCanAddToGroups: PrivacyAudience;
  messageRequestsFromStrangers: StrangerMessages;

  // Content
  postsVisibility: PrivacyAudience;
  whoCanComment: PrivacyAudience;
  whoCanShare: PrivacyAudience;
  marketplaceVisibility: MarketplaceAudience;
}

export const DEFAULT_USER_PRIVACY: UserPrivacySettings = {
  mapLocationAudience: "nobody",
  ghostMode: true,
  blurLocation: false,
  showActiveOnMap: false,

  profileVisibility: "everyone",
  statsVisibility: "friends",
  teamsVisibility: "everyone",
  showInSearch: true,
  showSportAndPosition: true,

  whoCanFollow: "everyone",
  whoCanMessage: "friends",
  whoCanChallenge: "friends",
  whoCanTag: "friends",
  showInPeopleNearby: true,

  showInAttendeeLists: true,
  showPhotoInAttendeeLists: true,
  showActivityInFeed: true,
  showTeamJoinActivity: true,
  showEventAttendance: true,

  healthWeeklyLoadVisibility: "friends",
  healthMonthlyTrendVisibility: "friends",
  healthStreakVisibility: "friends",
  healthPersonalBestsVisibility: "friends",

  readReceipts: true,
  showOnlineStatus: true,
  whoCanAddToGroups: "friends",
  messageRequestsFromStrangers: "allow",

  postsVisibility: "everyone",
  whoCanComment: "everyone",
  whoCanShare: "friends",
  marketplaceVisibility: "everyone",
};

export function mergeUserPrivacy(
  partial: Partial<UserPrivacySettings> | null | undefined,
): UserPrivacySettings {
  return { ...DEFAULT_USER_PRIVACY, ...(partial ?? {}) };
}
