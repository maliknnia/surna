import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { getMapOverlayTheme } from "@/lib/panelTheme";
import { ArrowLeft, Navigation, Search, X, SlidersHorizontal, UserPlus, Settings, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import InteractiveMap from "@/components/map/InteractiveMap";
import type { MapPin, MapRoute } from "@/components/map/InteractiveMap";
import PinSheet from "@/components/map/PinSheet";
import { MapSettingsSheet } from "@/components/map/MapSettingsSheet";
import type { Coordinates } from "@/lib/geo";
import { calculateDistance } from "@/lib/geo";
import {
  buildFocusPin,
  matchPinToFocus,
  parseMapFocusFromSearch,
} from "@/lib/mapNavigation";
import { enrichMapPinPhotos, generateDemoPins } from "@/lib/demoMapPins";
import { generateDemoRoutes } from "@/lib/demoMapRoutes";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { useMapSettings } from "@/hooks/useMapSettings";
import {
  blurCoordinates,
  layersToViewportParam,
  pinMatchesLayer,
  pinMatchesSport,
} from "@/lib/mapSettings";
import { toggleMapTileStyleMenu } from "@/lib/mapTileStyle";
import { eventDetailPath, isRouteSport, consumeMapRouteFocus } from "@/lib/eventRoutes";
import "leaflet/dist/leaflet.css";

type FilterType = 'all' | 'events' | 'places' | 'teams' | 'coaches' | 'players' | 'challenges';
type TimeFilter = string;
type MapMode = 'mixed' | 'friends' | 'teams' | 'events' | 'places';

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

const categoryOptions: { value: FilterType; label: string; emoji: string }[] = [
  { value: 'all', label: 'All', emoji: '📍' },
  { value: 'events', label: 'Events', emoji: '📅' },
  { value: 'places', label: 'Places', emoji: '🏟️' },
  { value: 'teams', label: 'Teams', emoji: '👥' },
  { value: 'coaches', label: 'Coaches', emoji: '🏅' },
  { value: 'players', label: 'People', emoji: '🏃' },
  { value: 'challenges', label: 'Challenges', emoji: '🏆' },
];

const timeOptions = [
  { value: 'all', label: 'Anytime' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'weekend', label: 'Weekend' },
];

const sportOptions = [
  { value: 'all', label: 'All Sports', emoji: '⚡' },
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'soccer', label: 'Soccer', emoji: '⚽' },
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
  { value: 'mma', label: 'MMA', emoji: '🥊' },
  { value: 'running', label: 'Running', emoji: '🏃' },
  { value: 'yoga', label: 'Yoga', emoji: '🧘' },
  { value: 'swimming', label: 'Swimming', emoji: '🏊' },
  { value: 'crossfit', label: 'CrossFit', emoji: '🏋️' },
  { value: 'volleyball', label: 'Volleyball', emoji: '🏐' },
];

const distanceOptions = [
  { value: 'all', label: 'Any' },
  { value: '1', label: '1 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
];

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
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { theme, isDark: isDarkTheme } = useTheme();
  const isDark = isDarkTheme ?? theme === "dark";
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    if (!user || sportFilter !== 'all') return;
    const prefSport = (user.sport || user.primarySport || '').toLowerCase();
    if (!prefSport) return;
    const match = sportOptions.find(
      (o) => o.value !== 'all' && prefSport.includes(o.value) || o.value.includes(prefSport),
    );
    if (match) setSportFilter(match.value);
  }, [user?.id, user?.sport, user?.primarySport]);

  const effectiveLocation = userLocation || { lat: 51.8985, lng: -8.4756 };

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
    queryKey: ['/api/map/viewport', effectiveLocation.lat, effectiveLocation.lng, layersParam],
    refetchInterval: 30000,
    queryFn: async () => {
      try {
        const lat = effectiveLocation.lat;
        const lng = effectiveLocation.lng;
        const bbox = `${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}`;
        const response = await fetch(`/api/map/viewport?bbox=${bbox}&zoom=15&layers=${layersParam}`, { credentials: 'include' });
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

    if (!isLoading && !viewportData?.items?.length) {
      const pinIds = new Set(allPins.map((p) => p.id));
      const demoSupplement = demoPins.filter((p) => !pinIds.has(p.id));
      allPins = [...allPins, ...demoSupplement];
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
    const matchesFilter = (pin: MapPin) => {
      if (filterType === 'all') return true;
      if (filterType === 'players') return pin.type === 'person' || pin.type === 'player';
      const singular = filterType.replace(/s$/, '');
      return pin.type === singular || (pin.type as string) === filterType;
    };
    const matchesSport = (pin: MapPin) => {
      const sportRaw = pin.data?.sport || pin.subtitle;
      return pinMatchesSport(sportRaw, mapSettings.selectedSports);
    };
    const matchesDistance = (pin: MapPin) => {
      if (pin.type === "saved") return true;
      return calculateDistance(effectiveLocation, pin.coords) <= mapSettings.radiusKm;
    };
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

  const mapChromeHidden = Boolean(selectedPin) || showFilterSheet || showSearch || showSettingsSheet;

  useEffect(() => {
    onPinSheetToggle?.(mapChromeHidden);
  }, [mapChromeHidden, onPinSheetToggle]);

  const handlePinClick = useCallback(
    (pin: MapPin) => {
      if (pin.type === "event") {
        const sport = String(pin.data?.sport ?? pin.subtitle ?? "");
        if (isRouteSport(sport)) {
          navigate(eventDetailPath(pin.id, sport));
          return;
        }
      }

      const focus = parseMapFocusFromSearch(
        typeof window !== "undefined" ? window.location.search : "",
      );
      focusDismissedRef.current = focus ? `${focus.type}:${focus.id}` : pin.id;
      setFocusedPinId(null);
      setFocusHintTitle(null);
      setSelectedPin(pin);
    },
    [navigate],
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

  const activeFilterCount = [
    filterType !== 'all' ? 1 : 0,
    timeFilter !== 'all' ? 1 : 0,
    sportFilter !== 'all' ? 1 : 0,
    distanceFilter !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

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

  return (
    <div className={`relative overflow-hidden ${embedded ? 'h-full w-full' : 'h-screen w-screen'}`} style={{ background: pageBg }}>
      <div className="absolute inset-0">
        {isLoading && pins.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: pageBg }}>
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-border rounded-full mx-auto mb-3" style={{ borderTopColor: iconColor }} />
              <p className="text-[13px] font-medium" style={{ color: iconFaint }}>Loading map...</p>
            </div>
          </div>
        ) : (
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
              externalStyleControlOffsetTop={embedded ? 120 : 68}
              flyTo={mapFlyTo}
              flyToZoom={focusedPinId ? 16 : 15}
              highlightedPinId={focusedPinId}
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

            {embedded && (
              <div
                className="absolute top-0 left-0 right-0 z-50 pointer-events-none"
                style={{ height: 120, background: mt.mapOverlayGradient }}
                aria-hidden
              />
            )}

            {embedded && !mapChromeHidden && (
              <div className="absolute top-0 left-0 z-[1001] p-3 pointer-events-none">
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
                      className="w-10 h-10 rounded-xl object-cover ring-2 shadow-lg"
                      style={{ outline: `2px solid ${isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"}` }}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg"
                      style={{ background: "var(--surna-elevated)", color: "var(--surna-text)", outline: `2px solid ${isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"}` }}
                    >
                      {(user?.displayName || user?.firstName || "S").charAt(0)}
                    </div>
                  )}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
                    style={{ background: "hsl(var(--primary))" }}
                  />
                </button>
              </div>
            )}

            {showSearch && !embedded && (
              <div className="absolute top-3 left-3 right-3 z-[1000]">
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: surfaceBgStrong, backdropFilter: 'blur(20px)', border: surfaceBorder }}>
                  <Search size={16} style={{ color: iconFaint, flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Search nearby..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: chipBg }}>
                    <X size={14} style={{ color: iconColor }} />
                  </button>
                </div>
              </div>
            )}

            {!mapChromeHidden && (
            <div className={`absolute z-[999] flex flex-col gap-2 ${embedded ? "top-16 right-3" : "top-3 right-3"}`}>
              <button
                onClick={() => toggleMapTileStyleMenu()}
                className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: surfaceBg, backdropFilter: 'blur(20px)', border: surfaceBorder, boxShadow: surfaceShadow }}
                data-testid="button-map-style-toolbar"
                data-map-style-trigger
                aria-label="Map style — dark, light, or satellite"
                title="Map style"
              >
                <Layers size={18} style={{ color: iconColor }} />
              </button>

              <button
                onClick={() => setShowSettingsSheet(true)}
                className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: surfaceBg, backdropFilter: 'blur(20px)', border: surfaceBorder, boxShadow: surfaceShadow }}
                data-testid="button-map-settings"
                aria-label="Map settings"
              >
                <Settings size={18} style={{ color: iconColor }} />
              </button>

              {!embedded && (
                <button
                  onClick={() => setShowSearch(true)}
                  className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: surfaceBg, backdropFilter: 'blur(20px)', border: surfaceBorder, boxShadow: surfaceShadow }}
                  aria-label="Search map"
                >
                  <Search size={18} style={{ color: iconColor }} />
                </button>
              )}

              <button
                onClick={() => setShowFilterSheet(true)}
                className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform relative"
                style={{ background: surfaceBg, backdropFilter: 'blur(20px)', border: surfaceBorder, boxShadow: surfaceShadow }}
                data-testid="button-open-filters"
              >
                <SlidersHorizontal size={18} style={{ color: iconColor }} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1" style={{ background: mt.chipActiveBg, color: mt.chipActiveText }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Find Players Nearby — vertical, under filters */}
              <button
                onClick={() => navigate('/discover/people')}
                className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: surfaceBg, backdropFilter: 'blur(20px)', border: surfaceBorder, boxShadow: surfaceShadow }}
                data-testid="button-find-players"
                aria-label="Find Players Nearby"
              >
                <UserPlus size={18} style={{ color: iconColor }} />
              </button>

              {/* Recenter */}
              <button
                className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                onClick={handleRecenter}
                style={{ background: surfaceBg, backdropFilter: 'blur(20px)', border: surfaceBorder, boxShadow: surfaceShadow }}
                data-testid="button-recenter"
                aria-label="Recenter"
              >
                <Navigation size={18} style={{ color: iconColor }} />
              </button>
            </div>
            )}

          </>
        )}
      </div>

      {!embedded && !mapChromeHidden && (
        <div className="absolute top-0 left-0 z-[1001] p-3">
          <button
            onClick={() => (window.history.length > 1 ? window.history.back() : navigate("/"))}
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl active:scale-90 transition-transform"
            style={{ background: surfaceBg, border: surfaceBorder, boxShadow: surfaceShadow }}
          >
            <ArrowLeft size={18} style={{ color: iconColor }} />
          </button>
        </div>
      )}

      {showFilterSheet && (
        <div className="absolute inset-0 z-[1002]" onClick={() => setShowFilterSheet(false)} style={{ position: 'absolute' }}>
          <div className="absolute inset-0" style={{ background: sheetBackdrop, backdropFilter: 'blur(4px)' }} />
          <div
            className="absolute bottom-0 left-0 right-0 overflow-hidden"
            style={{ borderRadius: '24px 24px 0 0', background: sheetBg, maxHeight: '70vh', animation: 'mapSheetUp 0.4s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-[5px] rounded-full" style={{ background: sheetHandle }} />
            </div>

            <div className="px-5 pb-3 flex items-center justify-between">
              <h3 className="text-[18px] font-bold" style={{ color: textPrimary }}>Filters</h3>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button onClick={handleResetFilters} className="text-[13px] font-semibold" style={{ color: sheetReset }}>
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setShowFilterSheet(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: chipBg }}
                >
                  <X size={16} style={{ color: iconMuted }} />
                </button>
              </div>
            </div>

            <div className="px-5 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 70px)' }}>
              <div className="mb-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3" style={{ color: sheetLabel }}>Show me</p>
                <div className="grid grid-cols-4 gap-2">
                  {categoryOptions.map((opt) => {
                    const isActive = filterType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setFilterType(opt.value)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
                        style={{
                          background: isActive ? tileActiveBg : tileBg,
                          border: isActive ? tileActiveBorder : tileBorder,
                        }}
                      >
                        <span className="text-[18px]">{opt.emoji}</span>
                        <span className="text-[10px] font-semibold" style={{ color: isActive ? tileActiveText : tileText }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3" style={{ color: sheetLabel }}>When</p>
                <div className="flex gap-2">
                  {timeOptions.map((opt) => {
                    const isActive = timeFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setTimeFilter(opt.value)}
                        className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
                        style={{
                          background: isActive ? tileActiveBg : tileBg,
                          border: isActive ? tileActiveBorder : tileBorder,
                          color: isActive ? tileActiveText : tileText,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3" style={{ color: sheetLabel }}>Sport</p>
                <div className="flex flex-wrap gap-1.5">
                  {sportOptions.slice(0, 3).map((opt) => {
                    const isActive = sportFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setSportFilter(opt.value)}
                        className="px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
                        style={{
                          background: isActive ? tileActiveBg : tileBg,
                          border: isActive ? tileActiveBorder : tileBorder,
                          color: isActive ? tileActiveText : tileText,
                        }}
                      >
                        {opt.emoji} {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {sportOptions.slice(3).map((opt) => {
                    const isActive = sportFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setSportFilter(opt.value)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all active:scale-95"
                        style={{
                          background: isActive ? tileActiveBg : tileBg,
                          border: isActive ? tileActiveBorder : tileBorder,
                          color: isActive ? tileActiveText : tileTextFaint,
                        }}
                      >
                        {opt.emoji} {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3" style={{ color: sheetLabel }}>Distance</p>
                <div className="flex gap-2">
                  {distanceOptions.map((opt) => {
                    const isActive = distanceFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setDistanceFilter(opt.value)}
                        className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
                        style={{
                          background: isActive ? tileActiveBg : tileBg,
                          border: isActive ? tileActiveBorder : tileBorder,
                          color: isActive ? tileActiveText : tileText,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setShowFilterSheet(false)}
                className="w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.97] mt-2"
                style={{ background: ctaBg, color: ctaText }}
              >
                Show {pins.length} {pins.length === 1 ? 'Result' : 'Results'}
              </button>
            </div>
          </div>
        </div>
      )}

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
      />
    </div>
  );
}

function typeEmoji(type: string): string {
  const map: Record<string, string> = {
    person: "👤",
    event: "📅",
    team: "👥",
    place: "🏟️",
    coach: "🏅",
    challenge: "🏆",
  };
  return map[type] || "📍";
}


