import {
  ALL_MAP_SPORT_IDS,
  DEFAULT_MAP_LAYERS,
  DEFAULT_MAP_SETTINGS,
  mergeMapSettings,
  type MapLayerKey,
  type MapSettings,
} from "@shared/mapSettings";

const STORAGE_KEY = "surna_map_settings";

export function loadMapSettingsLocal(): MapSettings {
  if (typeof window === "undefined") {
    return mergeMapSettings(null);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeMapSettings(null);
    return mergeMapSettings(JSON.parse(raw));
  } catch {
    return mergeMapSettings(null);
  }
}

export function saveMapSettingsLocal(patch: Partial<MapSettings>): MapSettings {
  const next = mergeMapSettings({ ...loadMapSettingsLocal(), ...patch, layers: {
    ...loadMapSettingsLocal().layers,
    ...patch.layers,
  } });
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function resetMapSettingsLocal(): MapSettings {
  const defaults = mergeMapSettings(null);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  }
  return defaults;
}

/** Stable blur offset within `radiusM` metres (does not jump each render). */
export function blurCoordinates(
  coords: { lat: number; lng: number },
  seed: string,
  radiusM = 500,
): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const angle = ((Math.abs(hash) % 360) * Math.PI) / 180;
  const dist = ((Math.abs(hash >> 8) % 1000) / 1000) * radiusM;
  const latOffset = (dist * Math.cos(angle)) / 111320;
  const lngOffset =
    (dist * Math.sin(angle)) / (111320 * Math.cos((coords.lat * Math.PI) / 180));
  return { lat: coords.lat + latOffset, lng: coords.lng + lngOffset };
}

export function layersToViewportParam(layers: MapSettings["layers"]): string {
  const parts: string[] = [];
  if (layers.players) parts.push("people");
  if (layers.teams) parts.push("teams");
  if (layers.places) parts.push("places");
  if (layers.events) parts.push("events");
  if (layers.coaches) parts.push("coaches");
  if (layers.challenges) parts.push("challenges");
  return parts.length ? parts.join(",") : "events";
}

export function pinMatchesSport(
  sportRaw: string | undefined | null,
  selectedSports: string[],
): boolean {
  if (!selectedSports.length || selectedSports.length >= ALL_MAP_SPORT_IDS.length) return true;
  if (!sportRaw) return true;
  const s = sportRaw.toLowerCase();
  return selectedSports.some((id) => s.includes(id) || id.includes(s));
}

export function pinMatchesLayer(
  pinType: string,
  layers: MapSettings["layers"],
): boolean {
  switch (pinType) {
    case "event":
      return layers.events;
    case "instant":
      return layers.instant;
    case "team":
      return layers.teams;
    case "coach":
      return layers.coaches;
    case "person":
    case "player":
      return layers.players;
    case "place":
      return layers.places;
    case "challenge":
      return layers.challenges;
    case "saved":
      return true;
    default:
      return true;
  }
}

export { DEFAULT_MAP_SETTINGS, DEFAULT_MAP_LAYERS, type MapLayerKey, type MapSettings };
