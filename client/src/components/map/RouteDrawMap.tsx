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

function styleUrl(mode: "dark" | "light" | "satellite"): string {
  return {
    dark: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`,
    light: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
    satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
  }[mode];
}

function pointMarker(label: string, color: string, index?: number): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = "display:flex;flex-direction:column;align-items:center;pointer-events:none;";
  const text = index != null && index > 0 && label !== "A" && label !== "B" ? String(index + 1) : label;
  el.innerHTML = `
    <div style="
      min-width:22px;height:22px;padding:0 6px;border-radius:999px;
      background:${color};color:#fff;border:2px solid #fff;
      font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);font-family:system-ui,sans-serif;
    ">${text}</div>
  `;
  return el;
}

type RouteDrawMapProps = {
  center: Coordinates;
  points: Coordinates[];
  sportType?: string;
  onAddPoint: (coord: Coordinates) => void;
  isDark?: boolean;
};

/**
 * Tap-to-draw route map — solid A→B line, no glow.
 * First tap = Start (A), last = Finish (B), middle = waypoints.
 */
export default function RouteDrawMap({
  center,
  points,
  sportType = "run",
  onAddPoint,
  isDark = true,
}: RouteDrawMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onAddRef = useRef(onAddPoint);
  const pointsRef = useRef(points);

  useEffect(() => {
    onAddRef.current = onAddPoint;
  }, [onAddPoint]);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const tile = readMapTileStyle();
    const mode = tile === "satellite" ? "satellite" : isDark ? "dark" : "light";
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl(mode),
      center: [center.lng, center.lat],
      zoom: 14,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("click", (e) => {
      onAddRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    map.on("load", () => {
      map.getCanvas().style.cursor = "crosshair";
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      removeEventRouteDetailLayer(map);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const paint = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const color = routeColorForSport(sportType);
      if (points.length >= 2) {
        syncEventRouteDetailLayer(map, points, color);
      } else {
        removeEventRouteDetailLayer(map);
      }

      points.forEach((pt, i) => {
        const isStart = i === 0;
        const isEnd = i === points.length - 1 && points.length > 1;
        const label = isStart ? "A" : isEnd ? "B" : "·";
        const pinColor = isStart ? "#16A34A" : isEnd ? "#DC2626" : color;
        markersRef.current.push(
          new maplibregl.Marker({
            element: pointMarker(label, pinColor, i),
            anchor: "center",
          })
            .setLngLat([pt.lng, pt.lat])
            .addTo(map),
        );
      });

      if (points.length >= 2) {
        const bounds = new maplibregl.LngLatBounds();
        points.forEach((p) => bounds.extend([p.lng, p.lat]));
        map.fitBounds(bounds, { padding: 72, maxZoom: 16, duration: 400 });
      } else if (points.length === 1) {
        map.easeTo({ center: [points[0].lng, points[0].lat], zoom: 15, duration: 300 });
      }
    };

    if (map.isStyleLoaded()) paint();
    else map.once("load", paint);
  }, [points, sportType]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
