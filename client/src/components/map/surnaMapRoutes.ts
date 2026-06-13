import type maplibregl from "maplibre-gl";
import type { Coordinates } from "@/lib/geo";

export interface MapRoute {
  id: string;
  coordinates: Coordinates[];
  sportType: string;
  title: string;
}

const ROUTE_SOURCE_ID = "surna-routes";
const ROUTE_GLOW_LAYER_ID = "surna-routes-glow";
const ROUTE_LINE_LAYER_ID = "surna-routes-line";

export function routeColorForSport(sportType: string): string {
  const sport = sportType.toLowerCase();
  if (sport.includes("cycl") || sport.includes("bike")) return "#4A90D9";
  if (sport.includes("run") || sport.includes("jog")) return "#CC6B4A";
  if (sport.includes("hik") || sport.includes("trail") || sport.includes("walk")) return "#4CAF50";
  return "#4A90D9";
}

function isValidRouteCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function normalizeRouteCoordinates(raw: unknown): Coordinates[] {
  if (!Array.isArray(raw) || raw.length < 2) return [];

  const coords: Coordinates[] = [];
  for (const point of raw) {
    if (Array.isArray(point) && point.length >= 2) {
      const lat = Number(point[0]);
      const lng = Number(point[1]);
      if (isValidRouteCoord(lat, lng)) coords.push({ lat, lng });
      continue;
    }
    if (point && typeof point === "object") {
      const p = point as { lat?: unknown; lng?: unknown; latitude?: unknown; longitude?: unknown };
      const lat = Number(p.lat ?? p.latitude);
      const lng = Number(p.lng ?? p.longitude);
      if (isValidRouteCoord(lat, lng)) coords.push({ lat, lng });
    }
  }
  return coords;
}

function buildRoutesGeoJSON(routes: MapRoute[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: routes
      .filter((route) => route.coordinates.length >= 2)
      .map((route) => ({
        type: "Feature" as const,
        properties: {
          id: route.id,
          title: route.title,
          sportType: route.sportType,
          color: routeColorForSport(route.sportType),
        },
        geometry: {
          type: "LineString" as const,
          coordinates: route.coordinates.map((c) => [c.lng, c.lat]),
        },
      })),
  };
}

export function ensureMapRouteLayers(map: maplibregl.Map, beforeId?: string) {
  if (!map.getSource(ROUTE_SOURCE_ID)) {
    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  if (!map.getLayer(ROUTE_GLOW_LAYER_ID)) {
    map.addLayer(
      {
        id: ROUTE_GLOW_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 10,
          "line-opacity": 0.25,
          "line-blur": 1.5,
        },
      },
      beforeId,
    );
  }

  if (!map.getLayer(ROUTE_LINE_LAYER_ID)) {
    map.addLayer(
      {
        id: ROUTE_LINE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4,
          "line-opacity": 0.85,
        },
      },
      beforeId,
    );
  }
}

export function syncMapRouteData(map: maplibregl.Map, routes: MapRoute[]) {
  const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData(buildRoutesGeoJSON(routes));
}

export function bindMapRouteClicks(
  map: maplibregl.Map,
  onRouteClick: (route: MapRoute) => void,
  routesRef: { current: MapRoute[] },
) {
  const layerIds = [ROUTE_LINE_LAYER_ID, ROUTE_GLOW_LAYER_ID];

  const handleClick = (event: maplibregl.MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const routeId = feature?.properties?.id;
    if (!routeId) return;
    const route = routesRef.current.find((r) => r.id === routeId);
    if (route) {
      event.originalEvent.stopPropagation();
      onRouteClick(route);
    }
  };

  const handleEnter = () => {
    map.getCanvas().style.cursor = "pointer";
  };

  const handleLeave = () => {
    map.getCanvas().style.cursor = "";
  };

  for (const layerId of layerIds) {
    map.off("click", layerId, handleClick);
    map.off("mouseenter", layerId, handleEnter);
    map.off("mouseleave", layerId, handleLeave);
    map.on("click", layerId, handleClick);
    map.on("mouseenter", layerId, handleEnter);
    map.on("mouseleave", layerId, handleLeave);
  }

  return () => {
    for (const layerId of layerIds) {
      map.off("click", layerId, handleClick);
      map.off("mouseenter", layerId, handleEnter);
      map.off("mouseleave", layerId, handleLeave);
    }
    map.getCanvas().style.cursor = "";
  };
}

export function removeMapRouteLayers(map: maplibregl.Map) {
  if (map.getLayer(ROUTE_LINE_LAYER_ID)) map.removeLayer(ROUTE_LINE_LAYER_ID);
  if (map.getLayer(ROUTE_GLOW_LAYER_ID)) map.removeLayer(ROUTE_GLOW_LAYER_ID);
  if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
}

/** Full-screen event route detail — thick line, always on top of basemap. */
const DETAIL_SOURCE_ID = "surna-event-route-detail";
const DETAIL_GLOW_LAYER_ID = "surna-event-route-detail-glow";
const DETAIL_LINE_LAYER_ID = "surna-event-route-detail-line";

function moveLayersToTop(map: maplibregl.Map, layerIds: string[]) {
  for (const id of layerIds) {
    if (map.getLayer(id)) map.moveLayer(id);
  }
}

export function syncEventRouteDetailLayer(
  map: maplibregl.Map,
  coordinates: Coordinates[],
  color: string,
) {
  if (coordinates.length < 2) return;

  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { color },
        geometry: {
          type: "LineString",
          coordinates: coordinates.map((c) => [c.lng, c.lat]),
        },
      },
    ],
  };

  const existing = map.getSource(DETAIL_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(geojson);
    moveLayersToTop(map, [DETAIL_GLOW_LAYER_ID, DETAIL_LINE_LAYER_ID]);
    return;
  }

  map.addSource(DETAIL_SOURCE_ID, { type: "geojson", data: geojson });

  map.addLayer({
    id: DETAIL_GLOW_LAYER_ID,
    type: "line",
    source: DETAIL_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": color,
      "line-width": 22,
      "line-opacity": 0.45,
      "line-blur": 2,
    },
  });

  map.addLayer({
    id: DETAIL_LINE_LAYER_ID,
    type: "line",
    source: DETAIL_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": color,
      "line-width": 7,
      "line-opacity": 1,
    },
  });

  moveLayersToTop(map, [DETAIL_GLOW_LAYER_ID, DETAIL_LINE_LAYER_ID]);
}

export function removeEventRouteDetailLayer(map: maplibregl.Map) {
  if (map.getLayer(DETAIL_LINE_LAYER_ID)) map.removeLayer(DETAIL_LINE_LAYER_ID);
  if (map.getLayer(DETAIL_GLOW_LAYER_ID)) map.removeLayer(DETAIL_GLOW_LAYER_ID);
  if (map.getSource(DETAIL_SOURCE_ID)) map.removeSource(DETAIL_SOURCE_ID);
}
