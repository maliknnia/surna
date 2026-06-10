import type { LocationAudience } from "@shared/locationSharing";
import { isLocationAudience, shareLocationToVisibility } from "@shared/locationSharing";
import type { PresenceVisibility } from "@shared/locationSharing";

export type DistanceUnit = "km" | "miles";

export type AppPreferences = {
  distanceUnit: DistanceUnit;
  searchRadiusKm: number;
  shareLocation: boolean;
  /** Who can see your live map pin when sharing is on */
  locationAudience: LocationAudience;
  autoJoinGames: boolean;
  notifyMessages: boolean;
  notifyLikes: boolean;
  notifyEvents: boolean;
  notifyTeamUpdates: boolean;
};

const STORAGE_KEY = "surna_app_preferences";

const DEFAULTS: AppPreferences = {
  distanceUnit: "km",
  searchRadiusKm: 10,
  shareLocation: false,
  locationAudience: "ghost",
  autoJoinGames: false,
  notifyMessages: true,
  notifyLikes: true,
  notifyEvents: true,
  notifyTeamUpdates: true,
};

export function loadAppPreferences(): AppPreferences {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as AppPreferences;
    if (!isLocationAudience(parsed.locationAudience)) {
      parsed.locationAudience = DEFAULTS.locationAudience;
    }
    return parsed;
  } catch {
    return { ...DEFAULTS };
  }
}

export function preferencesToPresenceVisibility(prefs: AppPreferences): PresenceVisibility {
  return shareLocationToVisibility(prefs.shareLocation, prefs.locationAudience);
}

export function saveAppPreferences(patch: Partial<AppPreferences>): AppPreferences {
  const next = { ...loadAppPreferences(), ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function searchRadiusLabel(km: number, unit: DistanceUnit): string {
  if (unit === "miles") {
    const mi = Math.round(km * 0.621371);
    return `${mi} mi`;
  }
  return `${km} km`;
}
