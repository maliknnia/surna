import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { getMapOverlayTheme } from "@/lib/panelTheme";
import { ArrowLeft, Navigation, Search, SlidersHorizontal, UserPlus, Settings, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import InteractiveMap from "@/components/map/InteractiveMap";
import type { MapPin, MapRoute } from "@/components/map/InteractiveMap";
import PinSheet from "@/components/map/PinSheet";
import { MapSettingsSheet } from "@/components/map/MapSettingsSheet";
import { MapFilterSheet } from "@/components/map/MapFilterSheet";
import { MapSearchSheet } from "@/components/map/MapSearchSheet";
import type { Coordinates } from "@/lib/geo";
import {
  activeMapFilterCount,
  MAP_SPORT_CHIP_OPTIONS,
  pinMatchesCategory,
  pinMatchesDistanceChip,
  pinMatchesSportChip,
  type MapCategoryFilter,
} from "@/lib/mapFilters";
import { mobilePanelReturnPath } from "@/lib/navigation";
import { ROUTES } from "@/navigation";
import { pushMapRecent, type MapRecentEntry } from "@/lib/mapSearchRecents";
import {
  buildFocusPin,
  matchPinToFocus,
  parseMapFocusFromSearch,
} from "@/lib/mapNavigation";
import { enrichMapPinPhotos, generateDemoPins, generateDemoPersonPins, shouldUseDemoMapPins } from "@/lib/demoMapPins";
import { generateDemoRoutes } from "@/lib/demoMapRoutes";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { useMapSettings } from "@/hooks/useMapSettings";
import {
  blurCoordinates,
  layersToViewportParam,
  pinMatchesLayer,
} from "@/lib/mapSettings";
import { toggleMapTileStyleMenu } from "@/lib/mapTileStyle";
import { applyPageChromeColor, applySystemChromeTheme } from "@/lib/systemChromeTheme";
import { eventDetailPath, isRouteSport, consumeMapRouteFocus } from "@/lib/eventRoutes";
import "leaflet/dist/leaflet.css";

type TimeFilter = string;

interface ViewportItem {
  type: string;
  id: string;
  lat: number;
  lng: number;
  label: string;
  iconUrl: string;
  hasStory: boolean;
  storyState: 'new' | 'seen' | 'live' | 'none';
  presence: 'active' | 'idle' | 'offline';
  priority: number;
  meta: any;
}

interface ViewportResponse {
  serverTime: string;
  items: ViewportItem[];
  routes?: MapRoute[];
  stats: Record<string, number>;
  clusters: any[];
}

export default function MapPage({
  embedded = false,
  mapActive = true,
  onPinSheetToggle,
  onOpenProfile,
}: {
  embedded?: boolean;
  /** Home carousel: only mount Leaflet when the map panel is visible */
  mapActive?: boolean;
  onPinSheetToggle?: (open: boolean) => void;
  /** Snapchat-style: avatar opens profile / drawer */
  onOpenProfile?: () => void;
}) {
  const [location, navigate] = useLocation();
  const mapReturnPath = embedded ? mobilePanelReturnPath("map") : ROUTES.map;
  const { user } = useAuth();
  const { theme, isDark: isDarkTheme } = useTheme();
  const isDark = isDarkTheme ?? theme === "dark";
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [filterType, setFilterType] = useState<MapCategoryFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [sportFilter, setSportFilter] = useState('all');
  const [distanceFilter, setDistanceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapFlyTo, setMapFlyTo] = useState<Coordinates | null>(null);
  const [focusExtraPin, setFocusExtraPin] = useState<MapPin | null>(null);
  const [focusedPinId, setFocusedPinId] = useState<string | null>(null);
  const [focusHintTitle, setFocusHintTitle] = useState<string | null>(null);
  const focusHandledRef = useRef<string | null>(null);
  const focusDismissedRef = useRef<string | null>(null);
  const viewportDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportBbox, setViewportBbox] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(15);

  useEffect(() => {
    return () => {
      if (viewportDebounceRef.current) clearTimeout(viewportDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
      );
    }
  }, []);

  useEffect(() => {
    if (!user || sportFilter !== 'all') return;
    const prefSport = (user.sport || user.primarySport || '').toLowerCase();
    if (!prefSport) return;
    const match = MAP_SPORT_CHIP_OPTIONS.find(
      (o) => o.value !== "all" && (prefSport.includes(o.value) || o.value.includes(prefSport)),
    );
    if (match) setSportFilter(match.value);
  }, [user?.id, user?.sport, user?.primarySport]);

  const effectiveLocation = userLocation || { lat: 51.8985, lng: -8.4756 };

  const defaultBbox = useMemo(() => {
    const { lat, lng } = effectiveLocation;
    return `${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}`;
  }, [effectiveLocation.lat, effectiveLocation.lng]);

  const activeBbox = viewportBbox ?? defaultBbox;

  const handleViewportChange = useCallback((bbox: string, zoom: number) => {
    if (viewportDebounceRef.current) clearTimeout(viewportDebounceRef.current);
    viewportDebounceRef.current = setTimeout(() => {
      setViewportBbox(bbox);
      setMapZoom(zoom);
    }, 400);
  }, []);

  const { settings: mapSettings, applySettings, resetToDefaults } = useMapSettings(!!user);
  const { updatePreferences } = useLocationSharing(userLocation, !!user);

  const userDisplayCoords = useMemo(() => {
    if (!mapSettings.blurLocation || !user?.id) return effectiveLocation;
    return blurCoordinates(effectiveLocation, user.id, 500);
  }, [effectiveLocation, mapSettings.blurLocation, user?.id]);

  const layersParam = useMemo(
    () => layersToViewportParam(mapSettings.layers),
    [mapSettings.layers],
  );

  const { data: teammateData } = useQuery<{ ids: string[] }>({
    queryKey: ["/api/map/teammate-ids"],
    enabled: mapSettings.findTeammates && !!user,
    staleTime: 120_000,
    queryFn: async () => {
      const res = await fetch("/api/map/teammate-ids", { credentials: "include" });
      if (!res.ok) return { ids: [] };
      return res.json();
    },
  });
  const teammateIds = useMemo(
    () => new Set(teammateData?.ids ?? []),
    [teammateData?.ids],
  );

  const demoPins = useMemo(() => generateDemoPins(effectiveLocation), [effectiveLocation.lat, effectiveLocation.lng]);

  useEffect(() => {
    if (!userLocation) return;
    const shareOn = !mapSettings.ghostMode && mapSettings.locationAudience !== "nobody";
    void updatePreferences({
      shareLocation: shareOn,
      locationAudience: mapSettings.ghostMode || mapSettings.locationAudience === "nobody"
        ? "ghost"
        : mapSettings.locationAudience === "everyone"
          ? "public"
          : "friends",
    });
  }, [
    mapSettings.ghostMode,
    mapSettings.locationAudience,
    mapSettings.blurLocation,
    mapSettings.showActiveStatus,
    userLocation,
    updatePreferences,
  ]);

  const handleSaveLocation = useCallback(
    (coords: Coordinates) => {
      const label = `Saved place ${mapSettings.savedPlaces.length + 1}`;
      applySettings({
        savedPlaces: [
          ...mapSettings.savedPlaces,
          {
            id: `saved-${Date.now()}`,
            label,
            lat: coords.lat,
            lng: coords.lng,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    },
    [applySettings, mapSettings.savedPlaces],
  );

  const { data: viewportData, isLoading, isError: viewportError } = useQuery<ViewportResponse | null>({
    queryKey: ['/api/map/viewport', activeBbox, mapZoom, layersParam],
    refetchInterval: 30000,
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/map/viewport?bbox=${encodeURIComponent(activeBbox)}&zoom=${mapZoom}&layers=${layersParam}`,
          { credentials: 'include' },
        );
        if (!response.ok) return null;
        return response.json();
      } catch { return null; }
    }
  });

  const { data: instantTeamsData } = useQuery<any[]>({
    queryKey: ['/api/instant-teams'],
    refetchInterval: 10000,
    queryFn: async () => {
      try {
        const res = await fetch('/api/instant-teams', { credentials: 'include' });
        if (!res.ok) return [];
        return res.json();
      } catch { return []; }
    },
  });

  const pins = useMemo(() => {
    let allPins: MapPin[] = [];

    if (viewportData?.items && viewportData.items.length > 0) {
      allPins = viewportData.items.map((item) => {
        const fallbackTitle =
          item.type === "event" ? "Nearby event" :
          item.type === "place" ? "Nearby venue" :
          item.type === "team" ? "Nearby team" :
          item.type === "coach" ? "Nearby coach" :
          item.type === "person" ? "Nearby player" :
          item.type === "challenge" ? "Nearby challenge" :
          "Nearby";
        const meta = item.meta || { kind: item.type };
        return {
          id: item.id,
          type: item.type as MapPin['type'],
          title: (item.label && item.label.trim()) || fallbackTitle,
          subtitle: item.meta?.sport || item.meta?.kind || item.meta?.category || item.type,
          coords: { lat: item.lat, lng: item.lng },
          data: meta,
          iconUrl: item.iconUrl || '',
          coverUrl:
            meta.coverImageUrl ||
            meta.coverUrl ||
            meta.coverImage ||
            meta.imageUrl ||
            (item.type === 'place' || item.type === 'team' ? item.iconUrl : undefined) ||
            '',
          hasStory: item.hasStory,
          storyState: item.storyState,
          presence: item.presence,
        };
      });
    }

    if (instantTeamsData && instantTeamsData.length > 0 && mapSettings.layers.instant) {
      const instantPins: MapPin[] = instantTeamsData.flatMap((t: any) => {
        const lat = parseFloat(t.lat);
        const lng = parseFloat(t.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
        return [{
          id: t.id,
          type: 'instant' as const,
          title: t.name,
          subtitle: `${t.sport} · ${Math.max(0, t.playersNeeded - (t.playersJoined || 1))} spots left`,
          coords: { lat, lng },
          data: {
            sport: t.sport,
            description: t.description || `Pick-up ${t.sport} — join before it fills`,
            playersNeeded: t.playersNeeded,
            playersJoined: t.playersJoined,
            startTime: t.startTime,
            skillLevel: t.skillLevel,
            locationName: t.locationName,
          },
          presence: 'active' as const,
        }];
      });
      allPins = [...allPins, ...instantPins];
    }

    if (shouldUseDemoMapPins() && !viewportData?.items?.length) {
      const pinIds = new Set(allPins.map((p) => p.id));
      const demoSupplement = demoPins.filter((p) => !pinIds.has(p.id));
      allPins = [...allPins, ...demoSupplement];
    } else if (shouldUseDemoMapPins()) {
      // Always show showcase people even when live venues/events exist
      const pinIds = new Set(allPins.map((p) => p.id));
      const people = generateDemoPersonPins(effectiveLocation);
      const missing = people.filter((p) => !pinIds.has(p.id));
      allPins = [...allPins, ...missing];
    }

    const savedPins: MapPin[] = mapSettings.savedPlaces.map((place) => ({
      id: place.id,
      type: "saved" as const,
      title: place.label,
      subtitle: "Saved place",
      coords: { lat: place.lat, lng: place.lng },
      data: { kind: "saved" },
      iconUrl: "",
    }));
    allPins = [...allPins, ...savedPins];

    allPins = allPins.map((pin) => {
      const enriched = enrichMapPinPhotos(pin);
      if (
        mapSettings.findTeammates &&
        (pin.type === "person" || pin.type === "player") &&
        teammateIds.has(pin.id)
      ) {
        return { ...enriched, highlightTeammate: true };
      }
      return enriched;
    });

    const matchesSearch = (pin: MapPin) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return pin.title.toLowerCase().includes(q) || (pin.subtitle || '').toLowerCase().includes(q) || (pin.data?.sport || '').toLowerCase().includes(q);
    };
    const matchesFilter = (pin: MapPin) => pinMatchesCategory(pin, filterType);
    const matchesSport = (pin: MapPin) =>
      pinMatchesSportChip(pin, sportFilter, mapSettings.selectedSports);
    const matchesDistance = (pin: MapPin) =>
      pinMatchesDistanceChip(pin, distanceFilter, effectiveLocation, mapSettings.radiusKm);
    const matchesLayer = (pin: MapPin) => pinMatchesLayer(pin.type, mapSettings.layers);
    const matchesTeammates = (pin: MapPin) => {
      if (!mapSettings.findTeammates) return true;
      if (pin.type === "saved") return true;
      return pin.type === "person" || pin.type === "player"
        ? teammateIds.has(pin.id)
        : false;
    };
    const matchesTime = (pin: MapPin) => {
      if (timeFilter === 'all') return true;
      if (pin.type !== 'event' && pin.type !== 'instant') return true;
      const raw =
        pin.data?.startTime || pin.data?.starts_at || pin.data?.startsAt || pin.data?.date;
      if (!raw) return true;
      const start = new Date(raw);
      if (Number.isNaN(start.getTime())) return true;
      const now = new Date();
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      if (timeFilter === 'today') {
        return start >= now && start <= todayEnd;
      }
      if (timeFilter === 'week' || timeFilter === 'weekend') {
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + 7);
        return start >= now && start <= weekEnd;
      }
      return true;
    };

    return allPins.filter((p) => {
      if (focusedPinId && p.id === focusedPinId) return true;
      return (
        matchesSearch(p) &&
        matchesFilter(p) &&
        matchesLayer(p) &&
        matchesSport(p) &&
        matchesDistance(p) &&
        matchesTime(p) &&
        matchesTeammates(p)
      );
    });
  }, [
    viewportData,
    instantTeamsData,
    demoPins,
    filterType,
    timeFilter,
    sportFilter,
    distanceFilter,
    searchQuery,
    effectiveLocation,
    isLoading,
    focusedPinId,
    mapSettings,
    teammateIds,
  ]);

  const displayPins = useMemo(() => {
    if (!focusExtraPin) return pins;
    if (pins.some((p) => p.id === focusExtraPin.id)) return pins;
    return [...pins, focusExtraPin];
  }, [pins, focusExtraPin]);

  const [routeFocus] = useState<MapRoute | null>(() => consumeMapRouteFocus());

  const demoRoutes = useMemo(
    () => generateDemoRoutes(effectiveLocation),
    [effectiveLocation.lat, effectiveLocation.lng],
  );

  const mapRoutes = useMemo(() => {
    if (routeFocus) return [routeFocus];
    const fromApi = viewportData?.routes ?? [];
    if (fromApi.length > 0) return fromApi;
    return demoRoutes;
  }, [routeFocus, viewportData?.routes, demoRoutes]);

  useEffect(() => {
    const applyFocus = () => {
      const focus = parseMapFocusFromSearch(
        typeof window !== "undefined" ? window.location.search : "",
      );
      if (!focus) {
        setFocusedPinId(null);
        setFocusHintTitle(null);
        focusHandledRef.current = null;
        focusDismissedRef.current = null;
        return;
      }

      const key = `${focus.type}:${focus.id}`;
      if (focusDismissedRef.current === key) return;
      if (focusHandledRef.current === key) return;

      const matchedId = matchPinToFocus(pins, focus);
      let pin: MapPin | null = matchedId ? pins.find((p) => p.id === matchedId) ?? null : null;

      if (!pin) {
        const built = buildFocusPin(focus, effectiveLocation);
        if (built) {
          pin = {
            id: built.id,
            type: built.type as MapPin["type"],
            title: built.title,
            subtitle: built.subtitle,
            coords: built.coords,
            data: built.data,
            coverUrl:
              typeof built.data?.coverImageUrl === "string"
                ? built.data.coverImageUrl
                : typeof built.data?.imageUrl === "string"
                  ? built.data.imageUrl
                  : "",
          };
          setFocusExtraPin(pin);
        }
      } else {
        setFocusExtraPin(null);
      }

      if (pin) {
        setFocusedPinId(pin.id);
        setFocusHintTitle(pin.title);
        setMapFlyTo(pin.coords);
        setSelectedPin(null);
        focusHandledRef.current = key;
        if (focus.type === "event") setFilterType("events");
        else if (focus.type === "place") setFilterType("places");
        else if (focus.type === "team") setFilterType("teams");
        else if (focus.type === "person" || focus.type === "player") setFilterType("players");
        else if (focus.type === "coach") setFilterType("coaches");
        else if (focus.type === "challenge") setFilterType("challenges");
      }
    };

    applyFocus();
  }, [location, pins, effectiveLocation]);

  const mapChromeHidden = Boolean(selectedPin) || showFilterSheet || showSearchSheet || showSettingsSheet;

  useEffect(() => {
    onPinSheetToggle?.(mapChromeHidden);
  }, [mapChromeHidden, onPinSheetToggle]);

  const recordMapRecent = useCallback((pin: MapPin) => {
    pushMapRecent({
      id: pin.id,
      type: pin.type,
      title: pin.title,
      subtitle: pin.subtitle,
      lat: pin.coords.lat,
      lng: pin.coords.lng,
    });
  }, []);

  const handlePinClick = useCallback(
    (pin: MapPin) => {
      if (pin.type === "event") {
        const sport = String(pin.data?.sport ?? pin.subtitle ?? "");
        if (isRouteSport(sport)) {
          navigate(eventDetailPath(pin.id, sport));
          return;
        }
      }

      recordMapRecent(pin);
      const focus = parseMapFocusFromSearch(
        typeof window !== "undefined" ? window.location.search : "",
      );
      focusDismissedRef.current = focus ? `${focus.type}:${focus.id}` : pin.id;
      setFocusedPinId(null);
      setFocusHintTitle(null);
      setSelectedPin(pin);
    },
    [navigate, recordMapRecent],
  );

  const handleRecentSelect = useCallback(
    (entry: MapRecentEntry) => {
      const match = displayPins.find((p) => p.id === entry.id && p.type === entry.type)
        ?? displayPins.find((p) => p.id === entry.id);
      if (match) {
        handlePinClick(match);
        return;
      }
      if (entry.lat != null && entry.lng != null) {
        setMapFlyTo({ lat: entry.lat, lng: entry.lng });
      }
      pushMapRecent(entry);
    },
    [displayPins, handlePinClick],
  );
  const handleRouteClick = useCallback(
    (route: MapRoute) => {
      navigate(eventDetailPath(route.id, route.sportType));
    },
    [navigate],
  );
  const handleCloseSheet = useCallback(() => {
    setSelectedPin(null);
  }, []);
  const handleRecenter = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      });
    }
  }, []);

  const emphasisPinId = selectedPin?.id ?? focusedPinId;

  const activeFilterCount = activeMapFilterCount({
    filterType,
    timeFilter,
    sportFilter,
    distanceFilter,
  });

  const handleResetFilters = () => {
    setFilterType('all');
    setTimeFilter('all');
    setSportFilter('all');
    setDistanceFilter('all');
    setSearchQuery('');
  };

  const mt = getMapOverlayTheme(isDark);
  const pageBg = mt.pageBg;
  const textPrimary = mt.textPrimary;
  const surfaceBg = mt.surfaceBg;
  const surfaceBgStrong = mt.surfaceBgStrong;
  const surfaceBorder = mt.surfaceBorder;
  const surfaceShadow = mt.surfaceShadow;
  const iconColor = mt.iconColor;
  const iconMuted = mt.iconMuted;
  const iconFaint = mt.iconFaint;
  const chipBg = mt.overlayChipBg;
  const sheetBg = mt.sheetBg;
  const sheetHandle = mt.sheetHandle;
  const sheetBackdrop = mt.sheetBackdrop;
  const sheetLabel = mt.sheetLabel;
  const sheetReset = mt.sheetReset;
  const tileActiveBg = mt.tileActiveBg;
  const tileBg = mt.tileBg;
  const tileActiveBorder = mt.tileActiveBorder;
  const tileBorder = mt.tileBorder;
  const tileActiveText = mt.tileActiveText;
  const tileText = mt.tileText;
  const tileTextFaint = mt.tileTextFaint;
  const ctaBg = mt.ctaBg;
  const ctaText = mt.ctaText;

  /** Map tiles follow app theme — light app = light map, dark app = dark map. */
  const effectiveMapStyle = isDark ? "dark" : "standard";
  const mapCtrlIconColor = isDark ? "#ffffff" : "#111111";

  useEffect(() => {
    if (embedded) return;
    applyPageChromeColor(pageBg, { immersive: true });
    return () => {
      applySystemChromeTheme(isDark ? "dark" : "light");
    };
  }, [embedded, pageBg, isDark]);

  return (
    <div
      className={`relative overflow-hidden ${embedded ? "h-full w-full" : "fixed inset-0 z-0"}`}
      style={{ background: pageBg }}
    >
      <div className="absolute inset-0">
        <>
            <InteractiveMap
              center={effectiveLocation}
              pins={displayPins}
              routes={mapRoutes}
              routeFocus={routeFocus}
              onPinClick={handlePinClick}
              onRouteClick={handleRouteClick}
              className="h-full"
              isDark={isDark}
              mapStyle={effectiveMapStyle}
              mapActive={mapActive}
              externalStyleControl
              externalStyleControlOffsetTop={embedded ? 132 : 68}
              flyTo={mapFlyTo}
              flyToZoom={focusedPinId ? 16 : 15}
              highlightedPinId={emphasisPinId}
              userDisplayCoords={userDisplayCoords}
              userMarker={{
                ghostMode: mapSettings.ghostMode,
                showActiveStatus: mapSettings.showActiveStatus,
                avatarUrl: user?.profileImageUrl,
                initials: user?.firstName
                  ? `${user.firstName[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "ME"
                  : "ME",
              }}
              onLongPress={handleSaveLocation}
              onViewportChange={handleViewportChange}
            />

            {focusedPinId && !selectedPin && !showFilterSheet && (
              <div
                className="absolute z-[998] left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[12px] font-semibold pointer-events-none"
                style={{
                  top: embedded ? 56 : 72,
                  background: "rgba(255, 214, 10, 0.92)",
                  color: "#1a1400",
                  boxShadow: "0 4px 20px rgba(255, 214, 10, 0.45)",
                  maxWidth: "min(92vw, 320px)",
                  textAlign: "center",
                }}
              >
                Tap the gold pin{focusHintTitle ? ` · ${focusHintTitle}` : ""}
              </div>
            )}

            {!isLoading && pins.length === 0 && (
              <div
                className="absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-1/2 px-5 py-4 rounded-2xl text-center max-w-[260px]"
                style={{ background: surfaceBgStrong, border: `1px solid ${surfaceBorder}`, boxShadow: surfaceShadow }}
              >
                <p className="text-[14px] font-semibold mb-1" style={{ color: textPrimary }}>No locations here</p>
                <p className="text-[12px]" style={{ color: iconFaint }}>
                  {viewportError ? "Couldn&apos;t load map data. Showing offline preview." : "Try resetting filters or zooming out."}
                </p>
              </div>
            )}


            {isLoading && displayPins.length === 0 && (
              <div
                className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none"
                style={{ background: `${pageBg}88` }}
              >
                <div className="animate-spin w-7 h-7 border-2 border-transparent rounded-full" style={{ borderTopColor: iconColor }} />
              </div>
            )}

            {embedded && !mapChromeHidden && (
              <div className="absolute top-0 left-0 right-0 z-[1001] p-3 pointer-events-none flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => (onOpenProfile ? onOpenProfile() : navigate("/profile"))}
                  className="pointer-events-auto relative flex-shrink-0 active:scale-95 transition-transform"
                  aria-label="Open profile"
                  data-testid="map-profile-avatar"
                >
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-white/90 shadow-lg"
                      style={{ outline: `2px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)"}` }}
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-white/90"
                      style={{
                        background: "var(--surna-elevated)",
                        color: "var(--surna-text)",
                        outline: `2px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)"}`,
                      }}
                    >
                      {(user?.displayName || user?.firstName || "S").charAt(0)}
                    </div>
                  )}
                  {!mapSettings.ghostMode && mapSettings.locationAudience !== "nobody" && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
                      style={{ background: "#30D158" }}
                    />
                  )}
                </button>
              </div>
            )}

            {showSearchSheet && (
              <MapSearchSheet
                open={showSearchSheet}
                onClose={() => {
                  setShowSearchSheet(false);
                  setSearchQuery("");
                }}
                pins={displayPins}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectPin={handlePinClick}
                onSelectRecent={handleRecentSelect}
                theme={{
                  sheetBg,
                  sheetBackdrop,
                  sheetHandle,
                  textPrimary,
                  iconMuted,
                  chipBg,
                  tileBg,
                  tileBorder,
                  tileText,
                }}
              />
            )}

            {!mapChromeHidden && (
            <div className={`absolute z-[999] flex flex-col items-center gap-0.5 ${embedded ? "top-16 right-2" : "top-3 right-2"}`}>
              <button
                onClick={() => toggleMapTileStyleMenu()}
                className="map-ctrl-icon active:scale-90 transition-transform relative"
                data-testid="button-map-style-toolbar"
                data-map-style-trigger
                aria-label="Map style — dark, light, or satellite"
                title="Map style"
              >
                <Layers size={26} strokeWidth={2} color={mapCtrlIconColor} />
              </button>

              <button
                onClick={() => setShowSettingsSheet(true)}
                className="map-ctrl-icon active:scale-90 transition-transform"
                data-testid="button-map-settings"
                aria-label="Map settings"
              >
                <Settings size={26} strokeWidth={2} color={mapCtrlIconColor} />
              </button>

              <button
                onClick={() => setShowSearchSheet(true)}
                className="map-ctrl-icon active:scale-90 transition-transform"
                aria-label="Search map"
                data-testid="button-map-search"
              >
                <Search size={26} strokeWidth={2} color={mapCtrlIconColor} />
              </button>

              <button
                onClick={() => setShowFilterSheet(true)}
                className="map-ctrl-icon active:scale-90 transition-transform relative"
                data-testid="button-open-filters"
                aria-label="Filters"
              >
                <SlidersHorizontal size={26} strokeWidth={2} color={mapCtrlIconColor} />
                {activeFilterCount > 0 && (
                  <span
                    className="absolute top-0 right-0 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold px-1"
                    style={{ background: mt.chipActiveBg, color: mt.chipActiveText, filter: "none" }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => navigate('/discover/people')}
                className="map-ctrl-icon active:scale-90 transition-transform"
                data-testid="button-find-players"
                aria-label="Find Players Nearby"
              >
                <UserPlus size={26} strokeWidth={2} color={mapCtrlIconColor} />
              </button>

              <button
                className="map-ctrl-icon active:scale-90 transition-transform"
                onClick={handleRecenter}
                data-testid="button-recenter"
                aria-label="Center on my location"
                title="My location"
              >
                <Navigation size={26} strokeWidth={2} color={mapCtrlIconColor} />
              </button>
            </div>
            )}

          </>
      </div>

      {!embedded && !mapChromeHidden && (
        <div
          className="absolute top-0 left-0 z-[1001]"
          style={{ paddingTop: "max(8px, env(safe-area-inset-top))", paddingLeft: 12 }}
        >
          <button
            onClick={() => (window.history.length > 1 ? window.history.back() : navigate("/"))}
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl active:scale-90 transition-transform"
            style={{ background: surfaceBg, border: surfaceBorder, boxShadow: surfaceShadow }}
          >
            <ArrowLeft size={18} style={{ color: iconColor }} />
          </button>
        </div>
      )}

      <MapFilterSheet
        open={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        filterType={filterType}
        onFilterType={setFilterType}
        timeFilter={timeFilter}
        onTimeFilter={setTimeFilter}
        sportFilter={sportFilter}
        onSportFilter={setSportFilter}
        distanceFilter={distanceFilter}
        onDistanceFilter={setDistanceFilter}
        resultCount={pins.length}
        onReset={handleResetFilters}
        activeCount={activeFilterCount}
        theme={{
          sheetBg,
          sheetBackdrop,
          sheetHandle,
          sheetLabel,
          sheetReset,
          chipBg,
          tileActiveBg,
          tileBg,
          tileActiveBorder,
          tileBorder,
          tileActiveText,
          tileText,
          textPrimary,
          iconMuted,
          ctaBg,
          ctaText,
        }}
      />

      <MapSettingsSheet
        open={showSettingsSheet}
        onClose={() => setShowSettingsSheet(false)}
        settings={mapSettings}
        onChange={applySettings}
        onReset={resetToDefaults}
        isDark={isDark}
      />

      <PinSheet
        pin={selectedPin}
        userLocation={userLocation || undefined}
        onClose={handleCloseSheet}
        returnPath={mapReturnPath}
      />
    </div>
  );
}


