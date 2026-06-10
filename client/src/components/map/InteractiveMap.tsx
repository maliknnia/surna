import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster from "supercluster";
import type { Coordinates } from "@/lib/geo";
import {
  createSurnaClusterIcon,
  createSurnaMarker,
  createSurnaUserMarker,
} from "./surnaMapMarkers";
import { applySurnaMapTrees } from "./surnaMapTreeLayer";

const DEFAULT_MAP_ZOOM = 15;
const CLUSTER_MAX_ZOOM = 14;
const LONG_PRESS_MS = 500;
/** Snap-style default — steep angle; user can still pitch flat with two-finger drag. */
const DEFAULT_MAP_PITCH = 52;
const MAX_MAP_PITCH = 60;

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY?.trim() || "";

const OPENFREE_MAP_STYLES = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
} as const;

function mapStyleUrl(dark: boolean): string {
  if (MAPTILER_KEY) {
    const style = dark ? "streets-v2-dark" : "streets-v2";
    return `https://api.maptiler.com/maps/${style}/style.json?key=${MAPTILER_KEY}`;
  }
  return dark ? OPENFREE_MAP_STYLES.dark : OPENFREE_MAP_STYLES.light;
}

const MAPTILER_POI_LAYERS_HIDE = [
  "Public",
  "Shopping",
  "Transport",
  "Healthcare",
  "Education",
  "Housenumber",
  "Ferry",
  "Gondola",
  "Oneway",
  "Station",
  "Airport gate",
  "Airport",
  "Highway junction",
  "Highway shield",
  "Highway shield (US)",
  "Highway shield interstate top (US)",
  "Highway shield interstate (US)",
] as const;

/** Snap-style POIs — sport venues, parks, food, local places */
const MAPTILER_POI_LAYERS_KEEP = ["Sport", "Park", "Food", "Tourism", "Culture"] as const;

const MAPTILER_PATH_LAYERS_HIDE = [
  "Path",
  "Path minor",
  "Path outline",
  "Footway tunnel",
  "Footway tunnel outline",
  "Cablecar dash",
] as const;

const MAPTILER_GREEN_LAYERS = [
  "Grass",
  "Forest",
  "Wood",
  "Meadow",
  "Scrub",
  "Crop",
  "Stadium",
] as const;

function applyDarkSnapchatStreets(map: maplibregl.Map) {
  if (map.getLayer("Background")) {
    map.setPaintProperty("Background", "background-color", "hsl(228, 52%, 9%)");
  }
  if (map.getLayer("Residential")) {
    map.setPaintProperty("Residential", "fill-color", "hsl(228, 48%, 11%)");
  }
  if (map.getLayer("Pedestrian")) {
    map.setLayoutProperty("Pedestrian", "visibility", "none");
  }

  const minorGlow = "hsl(215, 26%, 56%)";
  const majorGlow = "hsl(212, 30%, 62%)";

  if (map.getLayer("Minor road outline")) {
    map.setLayoutProperty("Minor road outline", "visibility", "visible");
    map.setPaintProperty("Minor road outline", "line-color", minorGlow);
    map.setPaintProperty("Minor road outline", "line-opacity", 0.9);
  }
  if (map.getLayer("Minor road")) {
    map.setPaintProperty("Minor road", "line-color", "hsl(220, 22%, 34%)");
    map.setPaintProperty("Minor road", "line-opacity", 1);
  }
  if (map.getLayer("Major road outline")) {
    map.setLayoutProperty("Major road outline", "visibility", "visible");
    map.setPaintProperty("Major road outline", "line-color", majorGlow);
    map.setPaintProperty("Major road outline", "line-opacity", 0.92);
  }
  if (map.getLayer("Major road")) {
    map.setPaintProperty("Major road", "line-color", "hsl(215, 28%, 42%)");
    map.setPaintProperty("Major road", "line-opacity", 1);
  }
  if (map.getLayer("Highway outline")) {
    map.setLayoutProperty("Highway outline", "visibility", "visible");
    map.setPaintProperty("Highway outline", "line-color", "hsl(210, 32%, 66%)");
    map.setPaintProperty("Highway outline", "line-opacity", 0.9);
  }
  if (map.getLayer("Highway")) {
    map.setPaintProperty("Highway", "line-color", "hsl(212, 30%, 46%)");
    map.setPaintProperty("Highway", "line-opacity", 1);
  }
}

function applyDarkWater(map: maplibregl.Map) {
  ["Water", "Water intermittent"].forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "fill-color", "#050508");
      map.setPaintProperty(layerId, "fill-opacity", 1);
    }
  });
}

function applyDarkGreenery(map: maplibregl.Map) {
  // Snap-style: muted olive canopy on dark ground — not neon lime
  const greenFills: Record<string, string> = {
    Grass: "hsl(115, 18%, 16%)",
    Forest: "hsl(98, 28%, 24%)",
    Wood: "hsl(96, 30%, 26%)",
    Meadow: "hsl(105, 22%, 20%)",
    Scrub: "hsl(100, 20%, 19%)",
    Crop: "hsl(102, 18%, 18%)",
    Stadium: "hsl(108, 24%, 22%)",
  };

  MAPTILER_GREEN_LAYERS.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "fill-color", greenFills[layerId]);
      map.setPaintProperty(layerId, "fill-opacity", 0.92);
    }
  });
}

/** Muted POI colors; logos visible at normal city zoom (no strict rank filters). */
function applySurnaPoiTraffic(map: maplibregl.Map, dark: boolean) {
  const poiIconColors: Record<string, string> = dark
    ? {
        Park: "hsl(98, 22%, 58%)",
        Sport: "hsl(108, 28%, 62%)",
        Food: "hsl(28, 28%, 72%)",
        Tourism: "hsl(278, 28%, 72%)",
        Culture: "hsl(310, 26%, 74%)",
      }
    : {
        Park: "hsl(98, 32%, 42%)",
        Sport: "hsl(108, 35%, 38%)",
        Food: "hsl(28, 30%, 45%)",
        Tourism: "hsl(278, 30%, 48%)",
        Culture: "hsl(310, 28%, 48%)",
      };

  const iconFade = (fromZoom: number): maplibregl.ExpressionSpecification => [
    "step",
    ["zoom"],
    0,
    fromZoom,
    0.88,
    fromZoom + 1,
    0.92,
  ];

  const textFade = (fromZoom: number): maplibregl.ExpressionSpecification => [
    "step",
    ["zoom"],
    0,
    fromZoom,
    0.82,
    fromZoom + 1,
    0.88,
  ];

  const poiRules: Record<string, { from: number; textFrom: number }> = {
    Park: { from: 13, textFrom: 14 },
    Sport: { from: 14, textFrom: 15 },
    Food: { from: 14, textFrom: 15 },
    Tourism: { from: 14, textFrom: 15 },
    Culture: { from: 14, textFrom: 15 },
  };

  Object.entries(poiRules).forEach(([layerId, rules]) => {
    if (!map.getLayer(layerId)) return;

    const color = poiIconColors[layerId];
    if (color) {
      map.setPaintProperty(layerId, "icon-color", color);
      map.setPaintProperty(layerId, "text-color", color);
    }

    map.setPaintProperty(layerId, "icon-opacity", iconFade(rules.from));
    map.setPaintProperty(layerId, "text-opacity", textFade(rules.textFrom));
    map.setLayoutProperty(layerId, "icon-size", [
      "interpolate",
      ["linear"],
      ["zoom"],
      rules.from,
      0.85,
      16,
      0.95,
      18,
      1,
    ]);
  });

  if (map.getLayer("Road labels")) {
    map.setPaintProperty("Road labels", "text-opacity", [
      "step",
      ["zoom"],
      0.85,
      13,
      1,
    ]);
  }
}

function applyLightSnapchatStreets(map: maplibregl.Map) {
  if (map.getLayer("Background")) {
    map.setPaintProperty("Background", "background-color", "hsl(42, 22%, 91%)");
  }
  if (map.getLayer("Residential")) {
    map.setPaintProperty("Residential", "fill-color", "hsl(40, 18%, 87%)");
  }
  if (map.getLayer("Pedestrian")) {
    map.setLayoutProperty("Pedestrian", "visibility", "none");
  }

  const minorGlow = "hsl(42, 12%, 78%)";
  const majorGlow = "hsl(38, 10%, 72%)";

  if (map.getLayer("Minor road outline")) {
    map.setLayoutProperty("Minor road outline", "visibility", "visible");
    map.setPaintProperty("Minor road outline", "line-color", minorGlow);
    map.setPaintProperty("Minor road outline", "line-opacity", 0.85);
  }
  if (map.getLayer("Minor road")) {
    map.setPaintProperty("Minor road", "line-color", "hsl(40, 8%, 96%)");
    map.setPaintProperty("Minor road", "line-opacity", 1);
  }
  if (map.getLayer("Major road outline")) {
    map.setLayoutProperty("Major road outline", "visibility", "visible");
    map.setPaintProperty("Major road outline", "line-color", majorGlow);
    map.setPaintProperty("Major road outline", "line-opacity", 0.8);
  }
  if (map.getLayer("Major road")) {
    map.setPaintProperty("Major road", "line-color", "hsl(42, 10%, 98%)");
    map.setPaintProperty("Major road", "line-opacity", 1);
  }
  if (map.getLayer("Highway outline")) {
    map.setLayoutProperty("Highway outline", "visibility", "visible");
    map.setPaintProperty("Highway outline", "line-color", "hsl(36, 12%, 68%)");
    map.setPaintProperty("Highway outline", "line-opacity", 0.75);
  }
  if (map.getLayer("Highway")) {
    map.setPaintProperty("Highway", "line-color", "hsl(40, 12%, 94%)");
    map.setPaintProperty("Highway", "line-opacity", 1);
  }
}

function applyLightWater(map: maplibregl.Map) {
  ["Water", "Water intermittent"].forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "fill-color", "hsl(205, 42%, 72%)");
      map.setPaintProperty(layerId, "fill-opacity", 1);
    }
  });
}

function applyLightGreenery(map: maplibregl.Map) {
  const greenFills: Record<string, string> = {
    Grass: "hsl(108, 38%, 74%)",
    Forest: "hsl(98, 46%, 48%)",
    Wood: "hsl(96, 44%, 44%)",
    Meadow: "hsl(105, 40%, 68%)",
    Scrub: "hsl(100, 32%, 65%)",
    Crop: "hsl(102, 35%, 70%)",
    Stadium: "hsl(108, 38%, 72%)",
  };

  MAPTILER_GREEN_LAYERS.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "fill-color", greenFills[layerId]);
      map.setPaintProperty(layerId, "fill-opacity", 0.95);
    }
  });
}

function applySnapchatBuildings(map: maplibregl.Map, dark: boolean, insertBefore?: string) {
  if (!map.getSource("maptiler_planet")) {
    console.warn("[InteractiveMap] maptiler_planet missing — 3D buildings skipped");
    return;
  }

  const beforeId = map.getLayer("Road labels") ? "Road labels" : insertBefore;
  const buildingHeight = [
    "coalesce",
    ["to-number", ["get", "render_height"]],
    ["to-number", ["get", "height"]],
    10,
  ] as maplibregl.ExpressionSpecification;

  const windowLit = dark ? "#d8ecff" : "#fff0c8";

  try {
    ["surna-building-glow", "surna-building-windows", "surna-building-windows-high", "surna-3d-buildings"].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });

    const buildingColor = dark ? "#0c0e22" : "#c8c4bb";

    map.addLayer(
      {
        id: "surna-3d-buildings",
        source: "maptiler_planet",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 14,
        paint: {
          "fill-extrusion-color": buildingColor,
          "fill-extrusion-height": buildingHeight,
          "fill-extrusion-base": [
            "coalesce",
            ["to-number", ["get", "render_min_height"]],
            ["to-number", ["get", "min_height"]],
            0,
          ],
          "fill-extrusion-opacity": 1,
          "fill-extrusion-vertical-gradient": dark,
        },
      },
      beforeId,
    );

    // One large lit block per apartment — Snap-style, not a repeating grid
    map.addLayer({
      id: "surna-building-windows",
      source: "maptiler_planet",
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 15,
      filter: [">=", buildingHeight, 6],
      paint: {
        "fill-extrusion-color": windowLit,
        "fill-extrusion-base": ["*", buildingHeight, 0.38],
        "fill-extrusion-height": ["*", buildingHeight, 0.62],
        "fill-extrusion-opacity": dark ? 0.78 : 0.62,
      },
    });

    // Second window row only on taller blocks
    map.addLayer({
      id: "surna-building-windows-high",
      source: "maptiler_planet",
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 15,
      filter: [">=", buildingHeight, 14],
      paint: {
        "fill-extrusion-color": windowLit,
        "fill-extrusion-base": ["*", buildingHeight, 0.68],
        "fill-extrusion-height": ["*", buildingHeight, 0.86],
        "fill-extrusion-opacity": dark ? 0.7 : 0.55,
      },
    });
  } catch (error) {
    console.error("[InteractiveMap] 3D buildings failed:", error);
  }
}

function applyMapTilerStyleLoad(map: maplibregl.Map, dark: boolean) {
  if (!MAPTILER_KEY) return;

  try {
    if (map.getLayer("sky")) {
      map.removeLayer("sky");
    }

    MAPTILER_POI_LAYERS_HIDE.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", "none");
      }
    });

    MAPTILER_POI_LAYERS_KEEP.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", "visible");
      }
    });

    MAPTILER_PATH_LAYERS_HIDE.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", "none");
      }
    });

    if (dark) {
      applyDarkSnapchatStreets(map);
      applyDarkGreenery(map);
      applyDarkWater(map);
    } else {
      applyLightSnapchatStreets(map);
      applyLightGreenery(map);
      applyLightWater(map);
    }

    applySurnaPoiTraffic(map, dark);

    map.setTerrain(null);
    const mapWithFog = map as maplibregl.Map & { setFog?: (fog: object | null) => void };
    if (dark) {
      mapWithFog.setFog?.(null);
    } else {
      mapWithFog.setFog?.({
        color: "rgb(232, 228, 218)",
        "high-color": "rgb(238, 234, 224)",
        "horizon-blend": 0.06,
        "space-color": "rgb(228, 224, 214)",
      });
    }

    if (map.getLayer("Building")) {
      map.setLayoutProperty("Building", "visibility", "none");
    }
    if (map.getLayer("Building 3D")) {
      map.setLayoutProperty("Building 3D", "visibility", "none");
    }
  } catch (error) {
    console.error("[InteractiveMap] style tweaks failed:", error);
  }

  const labelLayerId = map.getStyle().layers.find(
    (layer) => layer.type === "symbol" && layer.layout?.["text-field"],
  )?.id;

  const apply3DEnhancements = () => {
    applySnapchatBuildings(map, dark, labelLayerId);
    applySurnaMapTrees(map);
  };

  map.once("idle", apply3DEnhancements);
}

export interface MapPin {
  id: string;
  coords: Coordinates;
  type: "event" | "place" | "person" | "player" | "team" | "coach" | "challenge" | "instant" | "saved";
  title: string;
  subtitle?: string;
  data: any;
  active?: boolean;
  sport?: string;
  iconUrl?: string;
  coverUrl?: string;
  hasStory?: boolean;
  storyState?: "new" | "seen" | "live" | "none";
  presence?: "active" | "idle" | "offline";
  /** Purple ring for teammate highlight */
  highlightTeammate?: boolean;
}

interface UserMarkerOptions {
  ghostMode?: boolean;
  showActiveStatus?: boolean;
  avatarUrl?: string | null;
  initials?: string;
}

interface InteractiveMapProps {
  center: Coordinates;
  pins: MapPin[];
  onPinClick: (pin: MapPin) => void;
  className?: string;
  isDark?: boolean;
  /** CARTO dark vs light tiles — overrides isDark when set */
  mapStyle?: "dark" | "standard";
  /** When false (e.g. home carousel off-screen), skip init until visible. */
  mapActive?: boolean;
  /** Fly map to these coordinates when set (e.g. deep link from notifications). */
  flyTo?: Coordinates | null;
  flyToZoom?: number;
  /** Deep-linked entity — rendered as a gold highlighted pin until tapped. */
  highlightedPinId?: string | null;
  userMarker?: UserMarkerOptions;
  /** Display position for "you" pin (may be blurred) */
  userDisplayCoords?: Coordinates;
  onLongPress?: (coords: Coordinates) => void;
}

type DivIconLike = {
  options: {
    html?: string | false | HTMLElement;
    className?: string;
    iconSize?: [number, number] | { x: number; y: number };
    iconAnchor?: [number, number] | { x: number; y: number };
  };
};

type PinFeatureProps = { pin: MapPin; hasStory: boolean };
type ClusterProps = { cluster: true; cluster_id: number; point_count: number };

function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function readPoint(
  value: [number, number] | { x: number; y: number } | undefined,
  fallback: [number, number],
): [number, number] {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  return [value.x, value.y];
}

function createMarkerElement(icon: DivIconLike): HTMLDivElement {
  const rawHtml = icon.options.html;
  const html = typeof rawHtml === "string" ? rawHtml : "";
  const [width] = readPoint(icon.options.iconSize, [40, 40]);
  const [anchorX, anchorY] = readPoint(icon.options.iconAnchor, [width / 2, width]);

  const el = document.createElement("div");
  el.className = icon.options.className || "";
  el.innerHTML = html;
  el.style.width = `${width}px`;
  el.style.pointerEvents = "auto";
  el.style.transform = `translate(-${anchorX}px, -${anchorY}px)`;
  return el;
}

function attachMarker(
  map: maplibregl.Map,
  lng: number,
  lat: number,
  icon: DivIconLike,
  onClick?: () => void,
): maplibregl.Marker {
  const el = createMarkerElement(icon);
  if (onClick) {
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      onClick();
    });
  }
  return new maplibregl.Marker({ element: el, anchor: "top-left" })
    .setLngLat([lng, lat])
    .addTo(map);
}

export default function InteractiveMap({
  center,
  pins,
  onPinClick,
  className = "",
  isDark = true,
  mapStyle,
  mapActive = true,
  flyTo,
  flyToZoom = 15,
  highlightedPinId = null,
  userMarker,
  userDisplayCoords,
  onLongPress,
}: InteractiveMapProps) {
  const [mounted, setMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pinMarkersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const clusterIndexRef = useRef<Supercluster<PinFeatureProps, ClusterProps> | null>(null);
  const prevCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const onPinClickRef = useRef(onPinClick);
  const styleRef = useRef<string>("");
  const mapTilerFallbackRef = useRef(false);
  const initialPitchSetRef = useRef(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);

  const useDarkTiles = mapStyle !== undefined ? mapStyle === "dark" : isDark;
  const mapCenter = isValidCoord(center.lat, center.lng)
    ? center
    : { lat: 51.8985, lng: -8.4756 };
  const youCoords = userDisplayCoords ?? mapCenter;
  const mapTheme = useDarkTiles ? "dark" : "light";
  const tileStyle = MAPTILER_KEY
    ? useDarkTiles
      ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`
      : `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
    : mapStyleUrl(useDarkTiles);
  const useMapTiler3D = Boolean(MAPTILER_KEY);

  const useDarkTilesRef = useRef(useDarkTiles);
  const tileStyleRef = useRef(tileStyle);

  useEffect(() => {
    useDarkTilesRef.current = useDarkTiles;
    tileStyleRef.current = tileStyle;
  }, [useDarkTiles, tileStyle]);

  const clearPinMarkers = () => {
    pinMarkersRef.current.forEach((marker) => marker.remove());
    pinMarkersRef.current = [];
  };

  const finishStyleLoad = (map: maplibregl.Map) => {
    const theme = useDarkTilesRef.current ? "dark" : "light";
    const styleUrl = tileStyleRef.current;
    console.log(`[InteractiveMap] style.load — ${theme}:`, styleUrl);
    applyMapTilerStyleLoad(map, useDarkTilesRef.current);
    if (MAPTILER_KEY && !initialPitchSetRef.current) {
      map.setPitch(DEFAULT_MAP_PITCH);
      initialPitchSetRef.current = true;
    }
    map.resize();
    syncPinMarkers();
  };

  const syncPinMarkers = () => {
    const map = mapRef.current;
    const index = clusterIndexRef.current;
    if (!map) return;

    clearPinMarkers();

    const zoom = map.getZoom();
    const validPins = pins.filter((pin) => isValidCoord(pin.coords.lat, pin.coords.lng));

    if (zoom >= CLUSTER_MAX_ZOOM || !index) {
      validPins.forEach((pin) => {
        const isFocused = highlightedPinId != null && pin.id === highlightedPinId;
        const marker = attachMarker(
          map,
          pin.coords.lng,
          pin.coords.lat,
          createSurnaMarker(pin, isFocused, Math.round(zoom)),
          () => onPinClickRef.current(pin),
        );
        pinMarkersRef.current.push(marker);
      });
      return;
    }

    const bounds = map.getBounds();
    const clusters = index.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      Math.floor(zoom),
    );

    clusters.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties as PinFeatureProps & Partial<ClusterProps & { cluster_id: number; point_count: number }>;

      if ("cluster" in props && props.cluster && props.cluster_id != null) {
        const count = props.point_count ?? 0;
        const hasStory = index.getLeaves(props.cluster_id, Infinity).some((leaf) => leaf.properties.hasStory);
        const clusterMarker = attachMarker(
          map,
          lng,
          lat,
          createSurnaClusterIcon(count, hasStory),
          () => {
            const expansionZoom = Math.min(
              index.getClusterExpansionZoom(props.cluster_id!),
              CLUSTER_MAX_ZOOM,
            );
            map.flyTo({ center: [lng, lat], zoom: expansionZoom, duration: 550 });
          },
        );
        pinMarkersRef.current.push(clusterMarker);
        return;
      }

      const pin = props.pin;
      if (!pin) return;
      const isFocused = highlightedPinId != null && pin.id === highlightedPinId;
      const marker = attachMarker(
        map,
        lng,
        lat,
        createSurnaMarker(pin, isFocused, Math.round(zoom)),
        () => onPinClickRef.current(pin),
      );
      pinMarkersRef.current.push(marker);
    });
  };

  useEffect(() => {
    clusterIndexRef.current = new Supercluster<PinFeatureProps, ClusterProps>({
      radius: 48,
      maxZoom: CLUSTER_MAX_ZOOM - 1,
    });
    clusterIndexRef.current.load(
      pins
        .filter((pin) => isValidCoord(pin.coords.lat, pin.coords.lng))
        .map((pin) => ({
          type: "Feature" as const,
          properties: { pin, hasStory: Boolean(pin.hasStory) },
          geometry: {
            type: "Point" as const,
            coordinates: [pin.coords.lng, pin.coords.lat] as [number, number],
          },
        })),
    );
    syncPinMarkers();
  }, [pins]);

  useEffect(() => {
    if (!mounted || !mapActive || !mapContainerRef.current) return;

    console.log("[InteractiveMap] loading map style:", mapTheme, tileStyle);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: tileStyle,
      center: [mapCenter.lng, mapCenter.lat],
      zoom: DEFAULT_MAP_ZOOM,
      pitch: useMapTiler3D ? DEFAULT_MAP_PITCH : 0,
      maxPitch: MAX_MAP_PITCH,
      touchPitch: useMapTiler3D,
      attributionControl: false,
    });

    mapRef.current = map;
    styleRef.current = tileStyle;
    mapTilerFallbackRef.current = false;
    initialPitchSetRef.current = false;
    prevCenterRef.current = { lat: mapCenter.lat, lng: mapCenter.lng };

    const onStyleReady = () => finishStyleLoad(map);

    const onMapError = (event: maplibregl.ErrorEvent) => {
      if (mapTilerFallbackRef.current || !MAPTILER_KEY) return;
      if (!styleRef.current.includes("maptiler.com")) return;
      const message = event.error?.message ?? "";
      if (/layer|fill-extrusion|paint|sprite|style/i.test(message)) {
        console.warn("[InteractiveMap] layer/style error (keeping MapTiler):", message);
        return;
      }
      mapTilerFallbackRef.current = true;
      const fallback = useDarkTilesRef.current ? OPENFREE_MAP_STYLES.dark : OPENFREE_MAP_STYLES.light;
      styleRef.current = fallback;
      tileStyleRef.current = fallback;
      console.log("[InteractiveMap] loading map style:", useDarkTilesRef.current ? "dark" : "light", fallback);
      map.setStyle(fallback);
      console.warn("MapTiler unavailable, using OpenFreeMap fallback.", event.error?.message);
    };

    map.on("style.load", onStyleReady);
    map.on("error", onMapError);
    map.on("zoomend", syncPinMarkers);
    map.on("moveend", syncPinMarkers);

    if (map.isStyleLoaded()) {
      finishStyleLoad(map);
    }

    return () => {
      map.off("style.load", onStyleReady);
      map.off("error", onMapError);
      map.off("zoomend", syncPinMarkers);
      map.off("moveend", syncPinMarkers);
      clearPinMarkers();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [mounted, mapActive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleRef.current === tileStyle) return;

    styleRef.current = tileStyle;
    tileStyleRef.current = tileStyle;
    mapTilerFallbackRef.current = false;
    console.log("[InteractiveMap] loading map style:", mapTheme, tileStyle);
    map.setStyle(tileStyle);
  }, [tileStyle, mapTheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!prevCenterRef.current) {
      map.setCenter([mapCenter.lng, mapCenter.lat]);
      map.setZoom(DEFAULT_MAP_ZOOM);
    } else if (
      prevCenterRef.current.lat !== mapCenter.lat ||
      prevCenterRef.current.lng !== mapCenter.lng
    ) {
      map.setCenter([mapCenter.lng, mapCenter.lat]);
    }
    prevCenterRef.current = { lat: mapCenter.lat, lng: mapCenter.lng };
  }, [mapCenter.lat, mapCenter.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo || !isValidCoord(flyTo.lat, flyTo.lng)) return;
    map.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: flyToZoom,
      duration: 550,
    });
  }, [flyTo?.lat, flyTo?.lng, flyToZoom]);

  useEffect(() => {
    syncPinMarkers();
  }, [highlightedPinId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    userMarkerRef.current?.remove();
    const icon = createSurnaUserMarker(userMarker);
    const el = createMarkerElement(icon);
    el.title = userMarker?.ghostMode ? "Ghost mode — only you see this" : "You are here";
    userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "top-left" })
      .setLngLat([youCoords.lng, youCoords.lat])
      .addTo(map);
  }, [userMarker, youCoords.lat, youCoords.lng]);

  useEffect(() => {
    if (!mapActive) return;
    const map = mapRef.current;
    const run = () => map?.resize();
    const raf = requestAnimationFrame(run);
    const timer = window.setTimeout(run, 150);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [mapActive, className]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onLongPress) return;

    let timer: number | null = null;
    let startPoint: { x: number; y: number } | null = null;

    const clearTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      startPoint = null;
    };

    const fireLongPress = () => {
      if (!startPoint) return;
      const rect = map.getContainer().getBoundingClientRect();
      const x = startPoint.x - rect.left;
      const y = startPoint.y - rect.top;
      const lngLat = map.unproject([x, y]);
      onLongPress({ lat: lngLat.lat, lng: lngLat.lng });
      clearTimer();
    };

    const onDown = (event: MouseEvent | TouchEvent) => {
      const point = "touches" in event ? event.touches[0] : event;
      startPoint = { x: point.clientX, y: point.clientY };
      timer = window.setTimeout(fireLongPress, LONG_PRESS_MS);
    };

    const onMove = (event: MouseEvent | TouchEvent) => {
      if (!startPoint) return;
      const point = "touches" in event ? event.touches[0] : event;
      if (Math.hypot(point.clientX - startPoint.x, point.clientY - startPoint.y) > 10) {
        clearTimer();
      }
    };

    const container = map.getContainer();
    container.addEventListener("mousedown", onDown);
    container.addEventListener("touchstart", onDown, { passive: true });
    container.addEventListener("mousemove", onMove);
    container.addEventListener("touchmove", onMove, { passive: true });
    container.addEventListener("mouseup", clearTimer);
    container.addEventListener("touchend", clearTimer);
    container.addEventListener("mouseleave", clearTimer);
    container.addEventListener("touchcancel", clearTimer);

    return () => {
      clearTimer();
      container.removeEventListener("mousedown", onDown);
      container.removeEventListener("touchstart", onDown);
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("touchmove", onMove);
      container.removeEventListener("mouseup", clearTimer);
      container.removeEventListener("touchend", clearTimer);
      container.removeEventListener("mouseleave", clearTimer);
      container.removeEventListener("touchcancel", clearTimer);
    };
  }, [onLongPress]);

  if (!mounted || !mapActive) {
    return (
      <div
        className={`surna-map-root relative ${useDarkTiles ? "surna-map-dark" : "surna-map-light"} ${className}`}
        style={{ minHeight: "400px" }}
        aria-busy="true"
        aria-label="Loading map"
      />
    );
  }

  return (
    <div
      className={`surna-map-root relative ${useDarkTiles ? "surna-map-dark" : "surna-map-light"} ${className}`}
    >
      <div
        ref={mapContainerRef}
        className="h-full w-full z-0 surna-leaflet"
        style={{ minHeight: "400px" }}
      />

      <div className="surna-map-vignette" aria-hidden />
      <div className="surna-map-grain" aria-hidden />
    </div>
  );
}
