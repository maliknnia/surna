import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Coordinates } from "@/lib/geo";
import { readMapTileStyle } from "@/lib/mapTileStyle";
import {
  removeEventRouteDetailLayer,
  routeColorForSport,
  syncEventRouteDetailLayer,
} from "@/components/map/surnaMapRoutes";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY?.trim() || "";

function mapStyleUrl(mode: "dark" | "light" | "satellite"): string {
  const styles = {
    dark: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`,
    light: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
    satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
  };
  return styles[mode];
}

function createEndpointMarker(label: string, pinColor: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "display:flex;flex-direction:column;align-items:center;pointer-events:none;";
  wrap.innerHTML = `
    <div style="
      width:18px;height:18px;border-radius:50%;
      background:${pinColor};
      border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>
    <span style="
      margin-top:5px;padding:3px 10px;border-radius:999px;
      background:#fff;color:#111;
      font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;
      white-space:nowrap;font-family:system-ui,sans-serif;
      box-shadow:0 1px 4px rgba(0,0,0,0.2);
      border:1.5px solid ${pinColor};
    ">${label}</span>
  `;
  return wrap;
}

interface EventRouteMapViewProps {
  center: Coordinates;
  routeCoordinates: Coordinates[];
  sportType: string;
  isDark?: boolean;
}

type RouteMapProps = Pick<EventRouteMapViewProps, "center" | "routeCoordinates" | "sportType">;

function applyRouteToMap(
  map: maplibregl.Map,
  markersRef: { current: maplibregl.Marker[] },
  props: RouteMapProps,
) {
  if (!map.isStyleLoaded()) return;

  markersRef.current.forEach((m) => m.remove());
  markersRef.current = [];

  const { center, routeCoordinates: coords, sportType } = props;
  const routeColor = routeColorForSport(sportType);
  const hasRoute = coords.length >= 2;

  if (hasRoute) {
    syncEventRouteDetailLayer(map, coords, routeColor);

    const start = coords[0]!;
    const end = coords[coords.length - 1]!;

    markersRef.current.push(
      new maplibregl.Marker({
        element: createEndpointMarker("Start", "#22c55e"),
        anchor: "bottom",
        offset: [0, -4],
      })
        .setLngLat([start.lng, start.lat])
        .addTo(map),
      new maplibregl.Marker({
        element: createEndpointMarker("Finish", "#ef4444"),
        anchor: "bottom",
        offset: [0, -4],
      })
        .setLngLat([end.lng, end.lat])
        .addTo(map),
    );

    const bounds = new maplibregl.LngLatBounds();
    coords.forEach((pt) => bounds.extend([pt.lng, pt.lat]));
    map.fitBounds(bounds, {
      padding: { top: 100, bottom: 280, left: 56, right: 56 },
      maxZoom: 15.5,
      duration: 900,
      pitch: 48,
    });
    return;
  }

  removeEventRouteDetailLayer(map);
  markersRef.current.push(
    new maplibregl.Marker({
      element: createEndpointMarker("Event", routeColor),
      anchor: "bottom",
      offset: [0, -4],
    })
      .setLngLat([center.lng, center.lat])
      .addTo(map),
  );
  map.flyTo({
    center: [center.lng, center.lat],
    zoom: 14.5,
    pitch: 48,
    duration: 800,
  });
}

export default function EventRouteMapView({
  center,
  routeCoordinates,
  sportType,
  isDark = true,
}: EventRouteMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const propsRef = useRef<RouteMapProps>({ center, routeCoordinates, sportType });

  useEffect(() => {
    propsRef.current = { center, routeCoordinates, sportType };
  }, [center, routeCoordinates, sportType]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const stored = readMapTileStyle();
    const tileMode = stored === "satellite" ? "satellite" : stored ?? (isDark ? "dark" : "light");
    const styleUrl = MAPTILER_KEY
      ? mapStyleUrl(tileMode)
      : "https://demotiles.maplibre.org/style.json";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [center.lng, center.lat],
      zoom: 13,
      pitch: 48,
      bearing: -12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const onReady = () => applyRouteToMap(map, markersRef, propsRef.current);
    map.on("load", onReady);

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      removeEventRouteDetailLayer(map);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const run = () => applyRouteToMap(map, markersRef, propsRef.current);
    if (map.isStyleLoaded()) run();
    else map.once("load", run);
  }, [center, routeCoordinates, sportType]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full" style={{ minHeight: "100%" }} />
  );
}
