import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Coordinates } from "@/lib/geo";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { createMarkerClusterGroup } from "./leafletCluster";
import {
  createSurnaClusterIcon,
  createSurnaMarker,
  createSurnaUserMarker,
} from "./surnaMapMarkers";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const DEFAULT_MAP_ZOOM = 15;

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const CARTO_TILES = {
  dark: {
    base: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    labels: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
  },
  light: {
    base: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    labels: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
  },
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

function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function MapInvalidateSize({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const run = () => map.invalidateSize({ animate: false });
    const raf = requestAnimationFrame(run);
    const t = window.setTimeout(run, 150);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [active, map]);
  return null;
}

function MapUpdater({ center }: { center: Coordinates }) {
  const map = useMap();
  const prevCenter = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!prevCenter.current) {
      map.setView([center.lat, center.lng], DEFAULT_MAP_ZOOM);
    } else if (prevCenter.current.lat !== center.lat || prevCenter.current.lng !== center.lng) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
    prevCenter.current = { lat: center.lat, lng: center.lng };
  }, [center.lat, center.lng, map]);
  return null;
}

function MapFlyTo({
  target,
  zoom = 15,
}: {
  target?: Coordinates | null;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], zoom, { duration: 0.55 });
  }, [target?.lat, target?.lng, zoom, map]);
  return null;
}

function MapLongPress({ onLongPress }: { onLongPress?: (coords: Coordinates) => void }) {
  useMapEvents({
    contextmenu: (e) => {
      if (!onLongPress) return;
      e.originalEvent.preventDefault();
      onLongPress({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function ClusterLayer({
  pins,
  onPinClick,
  highlightedPinId,
}: {
  pins: MapPin[];
  onPinClick: (pin: MapPin) => void;
  highlightedPinId?: string | null;
}) {
  const map = useMap();
  const clusterGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }

    const clusterGroup = createMarkerClusterGroup({
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      animate: true,
      animateAddingMarkers: false,
      disableClusteringAtZoom: 17,
      iconCreateFunction: (cluster: {
        getChildCount: () => number;
        getAllChildMarkers: () => { options: { _hasStory?: boolean } }[];
      }) => {
        const count = cluster.getChildCount();
        const childMarkers = cluster.getAllChildMarkers();
        const hasStory = childMarkers.some((m) => m.options._hasStory);
        return createSurnaClusterIcon(count, hasStory);
      },
    });

    const pinByMarker = new WeakMap<L.Marker, MapPin>();

    const addMarkers = (zoom: number) => {
      clusterGroup.clearLayers();
      pins.forEach((pin) => {
        const { lat, lng } = pin.coords;
        if (!isValidCoord(lat, lng)) return;
        const isFocused = highlightedPinId != null && pin.id === highlightedPinId;
        const marker = new L.Marker([lat, lng], {
          icon: createSurnaMarker(pin, isFocused, zoom),
          _pinType: pin.type,
          _hasStory: pin.hasStory || false,
          zIndexOffset: isFocused ? 1000 : 0,
        } as L.MarkerOptions);

        pinByMarker.set(marker, pin);
        marker.on("click", () => onPinClick(pin));
        clusterGroup.addLayer(marker);
      });
    };

    const refreshMarkerIcons = () => {
      const zoom = map.getZoom();
      clusterGroup.eachLayer((layer) => {
        const marker = layer as L.Marker;
        const pin = pinByMarker.get(marker);
        if (!pin) return;
        const isFocused = highlightedPinId != null && pin.id === highlightedPinId;
        marker.setIcon(createSurnaMarker(pin, isFocused, zoom));
      });
    };

    addMarkers(map.getZoom());
    map.on("zoomend", refreshMarkerIcons);

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    return () => {
      map.off("zoomend", refreshMarkerIcons);
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
    };
  }, [map, pins, onPinClick, highlightedPinId]);

  return null;
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
  useEffect(() => setMounted(true), []);

  const useDarkTiles = mapStyle !== undefined ? mapStyle === "dark" : isDark;
  const tiles = useDarkTiles ? CARTO_TILES.dark : CARTO_TILES.light;
  const mapCenter = isValidCoord(center.lat, center.lng)
    ? center
    : { lat: 51.8985, lng: -8.4756 };
  const youCoords = userDisplayCoords ?? mapCenter;

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
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={DEFAULT_MAP_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full z-0 surna-leaflet"
        style={{ minHeight: "400px" }}
      >
        <MapUpdater center={mapCenter} />
        <MapFlyTo target={flyTo} zoom={flyToZoom} />
        <MapInvalidateSize active={mapActive} />

        <MapLongPress onLongPress={onLongPress} />

        <TileLayer
          key={`base-${useDarkTiles ? "dark" : "light"}`}
          attribution={CARTO_ATTRIBUTION}
          url={tiles.base}
          maxZoom={20}
        />
        <TileLayer
          key={`labels-${useDarkTiles ? "dark" : "light"}`}
          url={tiles.labels}
          maxZoom={20}
        />

        <Marker
          position={[youCoords.lat, youCoords.lng]}
          icon={createSurnaUserMarker(userMarker)}
        >
          <Popup className="surna-map-popup">
            <p className="surna-map-popup-title">
              {userMarker?.ghostMode ? "Ghost mode — only you see this" : "You are here"}
            </p>
          </Popup>
        </Marker>

        <ClusterLayer pins={pins} onPinClick={onPinClick} highlightedPinId={highlightedPinId} />
      </MapContainer>

      <div className="surna-map-vignette" aria-hidden />
      <div className="surna-map-grain" aria-hidden />
    </div>
  );
}
