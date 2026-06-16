import type { MapPin } from "@/components/map/InteractiveMap";
import type { Coordinates } from "@/lib/geo";
import { calculateDistance } from "@/lib/geo";
import { pinMatchesSport } from "@/lib/mapSettings";
import type { MapSportId } from "@shared/mapSettings";

export type MapCategoryFilter =
  | "all"
  | "events"
  | "places"
  | "teams"
  | "coaches"
  | "players"
  | "challenges";

export const MAP_CATEGORY_OPTIONS: { value: MapCategoryFilter; label: string; short: string }[] = [
  { value: "all", label: "All", short: "All" },
  { value: "events", label: "Events", short: "Events" },
  { value: "places", label: "Venues", short: "Venues" },
  { value: "teams", label: "Teams", short: "Teams" },
  { value: "coaches", label: "Coaches", short: "Coaches" },
  { value: "players", label: "People", short: "People" },
  { value: "challenges", label: "Challenges", short: "Challenges" },
];

export const MAP_TIME_OPTIONS = [
  { value: "all", label: "Anytime" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "weekend", label: "Weekend" },
] as const;

/** Quick sport chips on map — ids match common post/map sport strings. */
export const MAP_SPORT_CHIP_OPTIONS = [
  { value: "all", label: "All sports" },
  { value: "basketball", label: "Basketball" },
  { value: "soccer", label: "Soccer" },
  { value: "football", label: "Football" },
  { value: "rugby", label: "Rugby" },
  { value: "tennis", label: "Tennis" },
  { value: "running", label: "Running" },
  { value: "mma", label: "MMA" },
  { value: "swimming", label: "Swimming" },
  { value: "yoga", label: "Yoga" },
  { value: "crossfit", label: "CrossFit" },
  { value: "volleyball", label: "Volleyball" },
] as const;

export const MAP_DISTANCE_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "1", label: "1 km" },
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
] as const;

export function pinMatchesCategory(pin: MapPin, filterType: MapCategoryFilter): boolean {
  if (filterType === "all") return true;
  if (filterType === "players") return pin.type === "person" || pin.type === "player";
  const singular = filterType.replace(/s$/, "");
  return pin.type === singular || (pin.type as string) === filterType;
}

export function pinMatchesSportChip(
  pin: MapPin,
  sportFilter: string,
  settingsSports: MapSportId[],
): boolean {
  const sportRaw = (pin.data?.sport || pin.subtitle) as string | undefined;
  if (sportFilter !== "all") {
    if (!sportRaw) return false;
    const s = sportRaw.toLowerCase();
    const chip = sportFilter.toLowerCase();
    return s.includes(chip) || chip.includes(s);
  }
  return pinMatchesSport(sportRaw, settingsSports);
}

export function pinMatchesDistanceChip(
  pin: MapPin,
  distanceFilter: string,
  origin: Coordinates,
  settingsRadiusKm: number,
): boolean {
  if (pin.type === "saved") return true;
  const km =
    distanceFilter === "all"
      ? settingsRadiusKm
      : Number.parseFloat(distanceFilter) || settingsRadiusKm;
  return calculateDistance(origin, pin.coords) <= km;
}

export function activeMapFilterCount(opts: {
  filterType: MapCategoryFilter;
  timeFilter: string;
  sportFilter: string;
  distanceFilter: string;
}): number {
  return [
    opts.filterType !== "all",
    opts.timeFilter !== "all",
    opts.sportFilter !== "all",
    opts.distanceFilter !== "all",
  ].filter(Boolean).length;
}
