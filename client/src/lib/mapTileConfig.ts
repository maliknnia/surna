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

type PublicConfig = {
  mapTilerKey?: string;
  mapTilerValid?: boolean;
};

let configPromise: Promise<PublicConfig> | null = null;

async function loadPublicConfig(): Promise<PublicConfig> {
  if (configPromise) return configPromise;
  configPromise = (async () => {
    try {
      const res = await fetch("/api/public-config", { credentials: "include" });
      if (res.ok) return (await res.json()) as PublicConfig;
    } catch {
      /* fall through */
    }
    const viteKey = import.meta.env.VITE_MAPTILER_KEY?.trim() || "";
    return { mapTilerKey: viteKey, mapTilerValid: Boolean(viteKey) };
  })();
  return configPromise;
}

export async function loadMapTilerKey(): Promise<string> {
  const cfg = await loadPublicConfig();
  return cfg.mapTilerKey?.trim() || "";
}

/** Prefer MapTiler when the server confirms the key — keeps the Snapchat-style design. */
export async function resolveWorkingMapStyle(mode: MapTileStyle): Promise<ResolvedMapStyle> {
  const cfg = await loadPublicConfig();
  const mapTilerKey = cfg.mapTilerKey?.trim() || "";
  if (mapTilerKey && cfg.mapTilerValid) {
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
