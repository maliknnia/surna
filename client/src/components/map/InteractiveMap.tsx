import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Globe, Layers, Moon, Sun } from "lucide-react";
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
import {
  bindMapRouteClicks,
  ensureMapRouteLayers,
  syncMapRouteData,
  type MapRoute,
} from "./surnaMapRoutes";
import {
  MAP_TILE_STYLE_CHANGE_EVENT,
  MAP_TILE_STYLE_MENU_EVENT,
  readMapTileStyle,
  writeMapTileStyle,
  type MapTileStyle,
} from "@/lib/mapTileStyle";

const DEFAULT_MAP_ZOOM = 15;
const CLUSTER_MAX_ZOOM = 14;
const LONG_PRESS_MS = 500;
/** Snap-style default — steep angle; user can still pitch flat with two-finger drag. */
const DEFAULT_MAP_PITCH = 52;
const MAX_MAP_PITCH = 60;

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY?.trim() || "";

const MAPTILER_STYLES = {
  dark: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`,
  light: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
  satellite: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
} as const;

const MAP_TILE_STYLE_OPTIONS: {
  mode: MapTileStyle;
  label: string;
  Icon: typeof Moon;
}[] = [
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "satellite", label: "Satellite", Icon: Globe },
];

const OPENFREE_MAP_STYLES = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
} as const;

function mapStyleUrl(dark: boolean): string {
  if (MAPTILER_KEY) {
    return dark ? MAPTILER_STYLES.dark : MAPTILER_STYLES.light;
  }
  return dark ? OPENFREE_MAP_STYLES.dark : OPENFREE_MAP_STYLES.light;
}

function resolveMapTileStyleUrl(mode: MapTileStyle): string {
  if (MAPTILER_KEY) return MAPTILER_STYLES[mode];
  if (mode === "satellite") return OPENFREE_MAP_STYLES.dark;
  return mode === "dark" ? OPENFREE_MAP_STYLES.dark : OPENFREE_MAP_STYLES.light;
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

/** Earth-tone colours for satellite only (OSM building:colour when tagged). */
const SATELLITE_BUILDING_COLOUR: maplibregl.ExpressionSpecification = [
  "case",
  ["all", ["has", "colour"], ["!=", ["get", "colour"], ""]],
  ["get", "colour"],
  [
    "interpolate",
    ["linear"],
    [
      "coalesce",
      ["to-number", ["get", "render_height"]],
      ["to-number", ["get", "height"]],
      10,
    ],
    6,
    "#b5aa9c",
    14,
    "#a89d8f",
    28,
    "#968b7e",
    50,
    "#847a6e",
    85,
    "#736961",
  ],
];

/** Two thin lit slabs per building — Snap-style window boxes, not full-height glow bands. */
function snapWindowSlabPaint(
  buildingHeight: maplibregl.ExpressionSpecification,
  windowLit: string,
  verticalStart: number,
  opacity: number,
) {
  const slabBase: maplibregl.ExpressionSpecification = ["*", buildingHeight, verticalStart];
  return {
    "fill-extrusion-color": windowLit,
    "fill-extrusion-base": slabBase,
    "fill-extrusion-height": [
      "+",
      slabBase,
      ["max", 1.8, ["*", buildingHeight, 0.06]],
    ] as maplibregl.ExpressionSpecification,
    "fill-extrusion-opacity": opacity,
  };
}

function applySnapchatBuildings(
  map: maplibregl.Map,
  dark: boolean,
  insertBefore?: string,
  satellite = false,
) {
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

  try {
    ["surna-building-glow", "surna-building-windows", "surna-building-windows-high", "surna-building-window-lower", "surna-building-window-upper", "surna-3d-buildings"].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });

    if (satellite) {
      map.addLayer(
        {
          id: "surna-3d-buildings",
          source: "maptiler_planet",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": SATELLITE_BUILDING_COLOUR,
            "fill-extrusion-height": buildingHeight,
            "fill-extrusion-base": [
              "coalesce",
              ["to-number", ["get", "render_min_height"]],
              ["to-number", ["get", "min_height"]],
              0,
            ],
            "fill-extrusion-opacity": 0.93,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        beforeId,
      );
    } else {
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
    }

    const windowLit = satellite
      ? "#fff8eb"
      : dark
        ? "#c8e4ff"
        : "#ffe9a8";
    const windowOpacity = satellite ? 0.38 : dark ? 0.78 : 0.52;
    const tallBuildingFilter = [">=", buildingHeight, 8] as maplibregl.FilterSpecification;

    map.addLayer({
      id: "surna-building-window-lower",
      source: "maptiler_planet",
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 15,
      filter: tallBuildingFilter,
      paint: snapWindowSlabPaint(buildingHeight, windowLit, 0.26, windowOpacity),
    });

    map.addLayer({
      id: "surna-building-window-upper",
      source: "maptiler_planet",
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 15,
      filter: tallBuildingFilter,
      paint: snapWindowSlabPaint(buildingHeight, windowLit, 0.5, windowOpacity),
    });
  } catch (error) {
    console.error("[InteractiveMap] 3D buildings failed:", error);
  }
}

function applyMapTilerStyleLoad(map: maplibregl.Map, dark: boolean, satellite = false) {
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

    if (!satellite) {
      if (dark) {
        applyDarkSnapchatStreets(map);
        applyDarkGreenery(map);
        applyDarkWater(map);
      } else {
        applyLightSnapchatStreets(map);
        applyLightGreenery(map);
        applyLightWater(map);
      }
    }

    applySurnaPoiTraffic(map, dark);

    map.setTerrain(null);
    const mapWithFog = map as maplibregl.Map & { setFog?: (fog: object | null) => void };
    if (satellite || dark) {
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
    applySnapchatBuildings(map, dark, labelLayerId, satellite);
    applySurnaMapTrees(map);
  };

  map.once("idle", apply3DEnhancements);
}

export type { MapRoute } from "./surnaMapRoutes";

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
  /** Full map page uses the top-right toolbar Layers button instead of the on-map control */
  externalStyleControl?: boolean;
  /** Vertical offset for the style menu when `externalStyleControl` is true */
  externalStyleControlOffsetTop?: number;
  /** Event routes (cycling / running / hiking) drawn as glowing lines */
  routes?: MapRoute[];
  onRouteClick?: (route: MapRoute) => void;
  /** Fit map to this route and show start (green) / finish (red) pins */
  routeFocus?: MapRoute | null;
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

function createRouteEndpointMarker(label: string, pinColor: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "display:flex;flex-direction:column;align-items:center;pointer-events:none;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.4));";
  wrap.innerHTML = `
    <div style="width:20px;height:20px;border-radius:50%;background:${pinColor};border:3px solid #fff;box-shadow:0 0 0 2px ${pinColor}66;"></div>
    <span style="margin-top:4px;padding:2px 10px;border-radius:999px;background:#fff;color:#111;font-size:11px;font-weight:800;text-transform:uppercase;white-space:nowrap;font-family:system-ui,sans-serif;border:2px solid ${pinColor};">${label}</span>
  `;
  return wrap;
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
  externalStyleControl = false,
  externalStyleControlOffsetTop = 68,
  routes = [],
  onRouteClick,
  routeFocus = null,
}: InteractiveMapProps) {
  const [mounted, setMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pinMarkersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const clusterIndexRef = useRef<Supercluster<PinFeatureProps, ClusterProps> | null>(null);
  const prevCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const onPinClickRef = useRef(onPinClick);
  const onRouteClickRef = useRef(onRouteClick);
  const routesRef = useRef(routes);
  const routeFocusRef = useRef(routeFocus);
  const routeEndpointMarkersRef = useRef<maplibregl.Marker[]>([]);
  const routeClickCleanupRef = useRef<(() => void) | null>(null);
  const styleRef = useRef<string>("");
  const mapTilerFallbackRef = useRef(false);
  const initialPitchSetRef = useRef(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);
  useEffect(() => {
    onRouteClickRef.current = onRouteClick;
  }, [onRouteClick]);
  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);
  useEffect(() => {
    routeFocusRef.current = routeFocus;
  }, [routeFocus]);

  const syncRouteFocusOnMap = () => {
    const map = mapRef.current;
    const focus = routeFocusRef.current;

    routeEndpointMarkersRef.current.forEach((m) => m.remove());
    routeEndpointMarkersRef.current = [];

    if (!map || !focus || focus.coordinates.length < 2) return;

    const start = focus.coordinates[0]!;
    const end = focus.coordinates[focus.coordinates.length - 1]!;

    routeEndpointMarkersRef.current.push(
      new maplibregl.Marker({
        element: createRouteEndpointMarker("Start", "#22c55e"),
        anchor: "bottom",
      })
        .setLngLat([start.lng, start.lat])
        .addTo(map),
      new maplibregl.Marker({
        element: createRouteEndpointMarker("Finish", "#ef4444"),
        anchor: "bottom",
      })
        .setLngLat([end.lng, end.lat])
        .addTo(map),
    );

    const bounds = new maplibregl.LngLatBounds();
    focus.coordinates.forEach((c) => bounds.extend([c.lng, c.lat]));
    map.fitBounds(bounds, {
      padding: { top: 72, bottom: 96, left: 48, right: 48 },
      maxZoom: 15,
      duration: 800,
    });
  };

  const syncRoutesOnMap = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const beforeId = map.getLayer("Road labels") ? "Road labels" : undefined;
    ensureMapRouteLayers(map, beforeId);
    syncMapRouteData(map, routesRef.current);

    if (onRouteClickRef.current) {
      routeClickCleanupRef.current?.();
      routeClickCleanupRef.current = bindMapRouteClicks(
        map,
        (route) => onRouteClickRef.current?.(route),
        routesRef,
      );
    }

    syncRouteFocusOnMap();
  };

  const useDarkTiles = mapStyle !== undefined ? mapStyle === "dark" : isDark;
  const mapCenter = isValidCoord(center.lat, center.lng)
    ? center
    : { lat: 51.8985, lng: -8.4756 };
  const youCoords = userDisplayCoords ?? mapCenter;

  const [tileStyleMode, setTileStyleMode] = useState<MapTileStyle>(() => {
    const stored = readMapTileStyle();
    if (stored) return stored;
    return useDarkTiles ? "dark" : "light";
  });
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const styleMenuRef = useRef<HTMLDivElement>(null);

  const extrusionDarkRef = useRef(tileStyleMode === "light" ? false : true);
  const tileStyleModeRef = useRef<MapTileStyle>(tileStyleMode);
  const isMapDarkTheme = tileStyleMode !== "light";
  const mapTheme = tileStyleMode === "satellite" ? "satellite" : tileStyleMode;
  const tileStyle = resolveMapTileStyleUrl(tileStyleMode);
  const useMapTiler3D = Boolean(MAPTILER_KEY);

  const useDarkTilesRef = useRef(isMapDarkTheme);
  const tileStyleRef = useRef(tileStyle);

  useEffect(() => {
    tileStyleModeRef.current = tileStyleMode;
    useDarkTilesRef.current = isMapDarkTheme;
    tileStyleRef.current = tileStyle;
  }, [tileStyleMode, isMapDarkTheme, tileStyle]);

  const selectMapTileStyle = (mode: MapTileStyle) => {
    if (mode === "dark") extrusionDarkRef.current = true;
    if (mode === "light") extrusionDarkRef.current = false;
    setTileStyleMode(mode);
    setStyleMenuOpen(false);
    writeMapTileStyle(mode);
  };

  useEffect(() => {
    const onTileStyleChange = (event: Event) => {
      const detail = (event as CustomEvent<MapTileStyle>).detail;
      const next = detail ?? readMapTileStyle();
      if (!next || next === tileStyleModeRef.current) return;
      if (next === "dark") extrusionDarkRef.current = true;
      if (next === "light") extrusionDarkRef.current = false;
      setTileStyleMode(next);
    };

    const onMenuToggle = () => setStyleMenuOpen((open) => !open);

    window.addEventListener(MAP_TILE_STYLE_CHANGE_EVENT, onTileStyleChange);
    window.addEventListener(MAP_TILE_STYLE_MENU_EVENT, onMenuToggle);
    return () => {
      window.removeEventListener(MAP_TILE_STYLE_CHANGE_EVENT, onTileStyleChange);
      window.removeEventListener(MAP_TILE_STYLE_MENU_EVENT, onMenuToggle);
    };
  }, []);

  useEffect(() => {
    if (!styleMenuOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target instanceof Element && target.closest("[data-map-style-trigger]")) return;
      if (styleMenuRef.current && target && !styleMenuRef.current.contains(target)) {
        setStyleMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [styleMenuOpen]);

  const clearPinMarkers = () => {
    pinMarkersRef.current.forEach((marker) => marker.remove());
    pinMarkersRef.current = [];
  };

  const finishStyleLoad = (map: maplibregl.Map) => {
    const styleUrl = tileStyleRef.current;
    console.log(`[InteractiveMap] style.load — ${tileStyleModeRef.current}:`, styleUrl);
    applyMapTilerStyleLoad(
      map,
      extrusionDarkRef.current,
      tileStyleModeRef.current === "satellite",
    );
    if (MAPTILER_KEY && !initialPitchSetRef.current) {
      map.setPitch(DEFAULT_MAP_PITCH);
      initialPitchSetRef.current = true;
    }
    map.resize();
    syncPinMarkers();
    syncRoutesOnMap();
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
      const message = event.error?.message ?? "";
      const authFailure = /403|401|Invalid key|Forbidden|Unauthorized/i.test(message);
      if (mapTilerFallbackRef.current) return;
      if (!MAPTILER_KEY) return;
      if (!styleRef.current.includes("maptiler.com") && !authFailure) return;
      if (!authFailure && /layer|fill-extrusion|paint|sprite|style/i.test(message)) {
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
      routeClickCleanupRef.current?.();
      routeClickCleanupRef.current = null;
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
    syncRoutesOnMap();
  }, [routes, routeFocus]);

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
        className={`surna-map-root relative ${isMapDarkTheme ? "surna-map-dark" : "surna-map-light"} ${className}`}
        style={{ minHeight: "400px" }}
        aria-busy="true"
        aria-label="Loading map"
      />
    );
  }

  const styleButtonPreview: Record<MapTileStyle, CSSProperties> = {
    dark: { background: "hsl(228, 52%, 9%)" },
    light: { background: "hsl(42, 22%, 91%)" },
    satellite: {
      background: "linear-gradient(145deg, #1e4620 0%, #2a5a8c 45%, #5c4033 100%)",
    },
  };

  const mapControlBtn: CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: isMapDarkTheme ? "rgba(18, 18, 18, 0.88)" : "rgba(255, 255, 255, 0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: isMapDarkTheme ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    cursor: "pointer",
    color: isMapDarkTheme ? "#ffffff" : "#111111",
    padding: 0,
  };

  return (
    <div
      className={`surna-map-root relative ${isMapDarkTheme ? "surna-map-dark" : "surna-map-light"} ${className}`}
    >
      <div
        ref={mapContainerRef}
        className="h-full w-full z-0 surna-leaflet"
        style={{ minHeight: "400px" }}
      />

      <div
        ref={styleMenuRef}
        className="surna-map-style-switcher"
        style={{
          position: "absolute",
          ...(externalStyleControl
            ? { top: externalStyleControlOffsetTop, right: 12 }
            : { bottom: "max(16px, env(safe-area-inset-bottom, 0px))", right: 12 }),
          zIndex: 1000,
          pointerEvents: styleMenuOpen || !externalStyleControl ? "auto" : "none",
        }}
      >
        {styleMenuOpen && (
          <div
            role="menu"
            aria-label="Map style options"
            className="surna-map-style-menu"
            style={{
              position: "absolute",
              ...(externalStyleControl
                ? { top: "100%", right: 0, marginTop: 8 }
                : { bottom: "100%", right: 0, marginBottom: 8 }),
              minWidth: 168,
              padding: 6,
              borderRadius: 14,
              background: isMapDarkTheme ? "rgba(18, 18, 18, 0.94)" : "rgba(255, 255, 255, 0.96)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: isMapDarkTheme ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
            }}
          >
            {MAP_TILE_STYLE_OPTIONS.filter(
              (opt) => MAPTILER_KEY || opt.mode !== "satellite",
            ).map(({ mode, label, Icon }) => {
              const active = tileStyleMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => selectMapTileStyle(mode)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 10px",
                    borderRadius: 10,
                    border: "none",
                    background: active
                      ? isMapDarkTheme
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.06)"
                      : "transparent",
                    color: isMapDarkTheme ? "#ffffff" : "#111111",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      flexShrink: 0,
                      border: active
                        ? "2px solid #ffffff"
                        : isMapDarkTheme
                          ? "2px solid rgba(255,255,255,0.2)"
                          : "2px solid rgba(0,0,0,0.12)",
                      ...styleButtonPreview[mode],
                    }}
                  />
                  <Icon size={16} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.85 }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                </button>
              );
            })}
          </div>
        )}

        {!externalStyleControl && (
        <button
          type="button"
          aria-label="Map style"
          aria-haspopup="menu"
          aria-expanded={styleMenuOpen}
          title="Map style — dark, light, satellite"
          onClick={() => setStyleMenuOpen((open) => !open)}
          style={mapControlBtn}
          data-testid="button-map-style"
          data-map-style-trigger
        >
          {tileStyleMode === "satellite" ? (
            <Globe size={18} strokeWidth={2} />
          ) : (
            <Layers size={18} strokeWidth={2} />
          )}
        </button>
        )}
      </div>

      <div className="surna-map-vignette" aria-hidden />
      <div className="surna-map-grain" aria-hidden />
    </div>
  );
}
