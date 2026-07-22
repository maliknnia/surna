/** Map privacy, layers, and display preferences — shared client/server. */

export const MAP_LOCATION_AUDIENCES = ["everyone", "teams", "friends", "nobody"] as const;
export type MapLocationAudience = (typeof MAP_LOCATION_AUDIENCES)[number];

export const MAP_LAYER_KEYS = [
  "events",
  "instant",
  "teams",
  "coaches",
  "players",
  "places",
  "challenges",
] as const;
export type MapLayerKey = (typeof MAP_LAYER_KEYS)[number];

export const MAP_SPORT_FILTERS = [
  { id: "gaa", label: "GAA" },
  { id: "hurling", label: "Hurling" },
  { id: "football", label: "Football" },
  { id: "rugby", label: "Rugby" },
  { id: "basketball", label: "Basketball" },
  { id: "cricket", label: "Cricket" },
  { id: "cycling", label: "Cycling" },
  { id: "running", label: "Running" },
  { id: "tennis", label: "Tennis" },
  { id: "volleyball", label: "Volleyball" },
  { id: "motorsport", label: "Motorsport" },
] as const;

export type MapSportId = (typeof MAP_SPORT_FILTERS)[number]["id"];

export type MapStyle = "dark" | "standard";

export interface SavedMapPlace {
  id: string;
  label: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export type MapLayerToggles = Record<MapLayerKey, boolean>;

export interface MapSettings {
  ghostMode: boolean;
  locationAudience: MapLocationAudience;
  blurLocation: boolean;
  showActiveStatus: boolean;
  layers: MapLayerToggles;
  radiusKm: number;
  selectedSports: MapSportId[];
  findTeammates: boolean;
  mapStyle: MapStyle;
  savedPlaces: SavedMapPlace[];
}

export const DEFAULT_MAP_LAYERS: MapLayerToggles = {
  events: true,
  instant: true,
  teams: true,
  coaches: true,
  players: true,
  places: true,
  challenges: true,
};

export const ALL_MAP_SPORT_IDS: MapSportId[] = MAP_SPORT_FILTERS.map((s) => s.id);

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  ghostMode: true,
  locationAudience: "nobody",
  blurLocation: false,
  showActiveStatus: false,
  layers: { ...DEFAULT_MAP_LAYERS },
  radiusKm: 10,
  selectedSports: [...ALL_MAP_SPORT_IDS],
  findTeammates: false,
  mapStyle: "standard",
  savedPlaces: [],
};

export function isMapLocationAudience(value: string): value is MapLocationAudience {
  return (MAP_LOCATION_AUDIENCES as readonly string[]).includes(value);
}

export function mapAudienceToPresenceVisibility(
  audience: MapLocationAudience,
  ghostMode: boolean,
): "ghost" | "public" | "team_only" | "friends" {
  if (ghostMode || audience === "nobody") return "ghost";
  if (audience === "everyone") return "public";
  if (audience === "teams") return "team_only";
  return "friends";
}

export const MAP_AUDIENCE_LABELS: Record<
  MapLocationAudience,
  { title: string; description: string }
> = {
  everyone: {
    title: "Everyone",
    description: "Anyone on SURNA can see your pin",
  },
  teams: {
    title: "My Teams Only",
    description: "Only members of your teams see you",
  },
  friends: {
    title: "Friends Only",
    description: "People you follow and who follow you back",
  },
  nobody: {
    title: "Nobody",
    description: "Invisible on the map — you can still see others",
  },
};

export function mergeMapSettings(partial: Partial<MapSettings> | null | undefined): MapSettings {
  const base = { ...DEFAULT_MAP_SETTINGS, layers: { ...DEFAULT_MAP_LAYERS } };
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    layers: { ...DEFAULT_MAP_LAYERS, ...(partial.layers ?? {}) },
    selectedSports:
      partial.selectedSports?.length ? [...partial.selectedSports] : [...ALL_MAP_SPORT_IDS],
    savedPlaces: partial.savedPlaces ? [...partial.savedPlaces] : [],
  };
}
