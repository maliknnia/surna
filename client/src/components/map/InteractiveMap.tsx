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

const DEFAULT_MAP_ZOOM = 15;
const CLUSTER_MAX_ZOOM = 14;
const LONG_PRESS_MS = 500;

const OPENFREE_MAP_STYLES = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
} as const;

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

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);

  const useDarkTiles = mapStyle !== undefined ? mapStyle === "dark" : isDark;
  const mapCenter = isValidCoord(center.lat, center.lng)
    ? center
    : { lat: 51.8985, lng: -8.4756 };
  const youCoords = userDisplayCoords ?? mapCenter;
  const tileStyle = useDarkTiles ? OPENFREE_MAP_STYLES.dark : OPENFREE_MAP_STYLES.light;

  const clearPinMarkers = () => {
    pinMarkersRef.current.forEach((marker) => marker.remove());
    pinMarkersRef.current = [];
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

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: tileStyle,
      center: [mapCenter.lng, mapCenter.lat],
      zoom: DEFAULT_MAP_ZOOM,
      attributionControl: false,
    });

    mapRef.current = map;
    styleRef.current = tileStyle;
    prevCenterRef.current = { lat: mapCenter.lat, lng: mapCenter.lng };

    const onMapReady = () => {
      map.resize();
      syncPinMarkers();
    };

    map.on("load", onMapReady);
    map.on("zoomend", syncPinMarkers);
    map.on("moveend", syncPinMarkers);

    return () => {
      map.off("load", onMapReady);
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
    map.setStyle(tileStyle);
    map.once("style.load", () => {
      map.resize();
      syncPinMarkers();
    });
  }, [tileStyle]);

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
