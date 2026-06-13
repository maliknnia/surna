import type { MapTileStyle } from "@/lib/mapTileStyle";

export const OPENFREE_MAP_STYLES = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
} as const;

export type MapTileProvider = "maptiler" | "openfreemap";

export type ResolvedMapStyle = {
  url: string;
  provider: MapTileProvider;
  mapTilerKey: string;
};

function mapTilerStyleUrl(key: string, mode: MapTileStyle): string {
  const styles = {
    dark: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${key}`,
    light: `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`,
    satellite: `https://api.maptiler.com/maps/satellite/style.json?key=${key}`,
  } as const;
  return styles[mode];
}

function openFreeStyleUrl(mode: MapTileStyle): string {
  if (mode === "satellite") return OPENFREE_MAP_STYLES.dark;
  return mode === "dark" ? OPENFREE_MAP_STYLES.dark : OPENFREE_MAP_STYLES.light;
}

async function mapTilerStyleWorks(key: string, mode: MapTileStyle): Promise<boolean> {
  if (!key.trim()) return false;
  try {
    const res = await fetch(mapTilerStyleUrl(key, mode), { credentials: "omit" });
    if (!res.ok) return false;
    const json = (await res.json()) as { version?: number; sources?: unknown };
    return json.version === 8 && Boolean(json.sources);
  } catch {
    return false;
  }
}

let runtimeKeyPromise: Promise<string> | null = null;

/** MapTiler key from server env (works without Vite rebuild) with build-time fallback. */
export async function loadMapTilerKey(): Promise<string> {
  if (runtimeKeyPromise) return runtimeKeyPromise;
  runtimeKeyPromise = (async () => {
    try {
      const res = await fetch("/api/public-config", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { mapTilerKey?: string };
        const fromServer = data.mapTilerKey?.trim();
        if (fromServer) return fromServer;
      }
    } catch {
      /* use build fallback */
    }
    return import.meta.env.VITE_MAPTILER_KEY?.trim() || "";
  })();
  return runtimeKeyPromise;
}

export async function resolveWorkingMapStyle(mode: MapTileStyle): Promise<ResolvedMapStyle> {
  const mapTilerKey = await loadMapTilerKey();
  if (mapTilerKey && (await mapTilerStyleWorks(mapTilerKey, mode))) {
    return {
      url: mapTilerStyleUrl(mapTilerKey, mode),
      provider: "maptiler",
      mapTilerKey,
    };
  }
  return {
    url: openFreeStyleUrl(mode),
    provider: "openfreemap",
    mapTilerKey: "",
  };
}
