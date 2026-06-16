import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Navigation, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import VenueCard from "@/components/VenueCard";
import InteractiveMap from "@/components/map/InteractiveMap";
import PinSheet from "@/components/map/PinSheet";
import { MapModeBar } from "@/components/map/MapModeBar";
import { MapFilterSheet } from "@/components/map/MapFilterSheet";
import { MapSearchSheet } from "@/components/map/MapSearchSheet";
import { calculateDistance, type Coordinates } from "@/lib/geo";
import { getMapOverlayTheme } from "@/lib/panelTheme";
import {
  activeMapFilterCount,
  type MapCategoryFilter,
} from "@/lib/mapFilters";
import { ROUTES } from "@/navigation";

interface MapData {
  events: any[];
  places: any[];
  teams: any[];
  coaches: any[];
  players: any[];
  challenges: any[];
  center: Coordinates | null;
  meta: {
    eventsCount: number;
    placesCount: number;
    generatedAt: string;
  };
}

interface Place {
  id: string;
  name: string;
  kind: "gym" | "field" | "court" | string;
  coords: { lat: number; lng: number };
  sports?: string[];
  rating?: number;
  priceRange?: string;
  address?: string;
  openNow?: boolean;
  distanceKm?: number;
}

type FilterType = MapCategoryFilter;
type TimeFilter = 'all' | 'today' | 'week' | 'weekend';
type ViewMode = 'map' | 'list';

type EnabledLayers = {
  events: boolean;
  places: boolean;
  teams: boolean;
  coaches: boolean;
  players: boolean;
  challenges: boolean;
};

interface MapPlacesHubProps {
  viewMode?: ViewMode;
  title?: string;
}

export default function MapPlacesHub({ viewMode = 'map', title }: MapPlacesHubProps) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const currentViewMode = viewMode;
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [distanceFilter, setDistanceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSearchSheet, setShowSearchSheet] = useState(false);

  const mt = getMapOverlayTheme(true);

  const [enabledLayers] = useState<EnabledLayers>({
    events: true,
    places: true,
    teams: true,
    coaches: true,
    players: false,
    challenges: true,
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const effectiveLocation = userLocation || { lat: 51.8985, lng: -8.4756 };

  const { data: mapData, isLoading, error } = useQuery<MapData>({
    queryKey: ['/api/map/summary', effectiveLocation.lat, effectiveLocation.lng, timeFilter, enabledLayers],
    enabled: true,
    refetchInterval: 30000,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('lat', effectiveLocation.lat.toString());
      params.set('lng', effectiveLocation.lng.toString());

      const activeLayers = Object.entries(enabledLayers)
        .filter(([_, enabled]) => enabled)
        .map(([layer]) => layer)
        .join(',');
      if (activeLayers) params.set('layers', activeLayers);

      if (timeFilter !== 'all') {
        const now = new Date();
        params.set('from', now.toISOString());
        if (timeFilter === 'today') {
          const end = new Date(now); end.setHours(23, 59, 59, 999);
          params.set('to', end.toISOString());
        } else if (timeFilter === 'week') {
          const end = new Date(now); end.setDate(now.getDate() + 7);
          params.set('to', end.toISOString());
        } else if (timeFilter === 'weekend') {
          const end = new Date(now);
          const day = end.getDay();
          const daysUntilSunday = day === 0 ? 0 : 7 - day;
          end.setDate(end.getDate() + daysUntilSunday);
          end.setHours(23, 59, 59, 999);
          params.set('to', end.toISOString());
        }
      }

      const response = await fetch(`/api/map/summary?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch map data');
      return response.json();
    }
  });

  const pins = useMemo(() => {
    if (!mapData) return [];
    const allPins: any[] = [];

    const matchesSearch = (item: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (item.title || item.name || '').toLowerCase().includes(q) ||
             (item.sport || '').toLowerCase().includes(q) ||
             (item.description || '').toLowerCase().includes(q);
    };

    const matchesSport = (item: any) => {
      if (sportFilter === 'all') return true;
      const sf = sportFilter.toLowerCase();
      if (item.sport && item.sport.toLowerCase().includes(sf)) return true;
      if (item.sports && item.sports.some((s: string) => s.toLowerCase().includes(sf))) return true;
      return false;
    };

    const matchesDistance = (coords: any) => {
      if (distanceFilter === 'all') return true;
      return calculateDistance(effectiveLocation, coords) <= parseFloat(distanceFilter);
    };

    const validCoords = (c: any) => c && !Number.isNaN(c.lat) && !Number.isNaN(c.lng) && c.lat !== undefined && c.lng !== undefined;

    if (filterType === 'all' || filterType === 'events') {
      (mapData.events || []).forEach((e: any) => {
        if (!validCoords(e.coords) || !matchesSearch(e) || !matchesSport(e) || !matchesDistance(e.coords)) return;
        allPins.push({
          id: e.id, type: 'event', title: e.title || e.name || 'Event',
          subtitle: e.sport || 'Sports Event', coords: e.coords,
          data: { id: e.id, title: e.title || e.name, description: e.description, date: e.starts_at || e.date || e.startDate, time: e.time || e.startTime, location: e.location || e.venue, coords: e.coords, organizer: e.organizer?.name || e.organizerName, participants: e.participantCount || 0, maxParticipants: e.maxParticipants, sport: e.sport, isParticipating: e.isParticipating || false }
        });
      });
    }

    if (filterType === 'all' || filterType === 'places') {
      (mapData.places || []).forEach((p: any) => {
        if (!validCoords(p.coords) || !matchesSearch(p) || !matchesSport(p) || !matchesDistance(p.coords)) return;
        allPins.push({
          id: p.id, type: 'place', title: p.name || 'Venue',
          subtitle: p.kind || 'Sports Facility', coords: p.coords,
          data: { id: p.id, name: p.name, kind: p.kind || p.type, address: p.address, coords: p.coords, sports: p.sports || [], rating: p.rating, priceRange: p.priceRange, openNow: p.openNow }
        });
      });
    }

    if ((filterType === 'all' || filterType === 'teams') && enabledLayers.teams) {
      (mapData.teams || []).forEach((t: any) => {
        if (!validCoords(t.coords) || !matchesSearch(t) || !matchesSport(t) || !matchesDistance(t.coords)) return;
        allPins.push({
          id: t.id, type: 'team', title: t.name || 'Team',
          subtitle: t.sport || 'Sports Team', coords: t.coords, data: { ...t }
        });
      });
    }

    if ((filterType === 'all' || filterType === 'coaches') && enabledLayers.coaches) {
      (mapData.coaches || []).forEach((c: any) => {
        if (!validCoords(c.coords) || !matchesSearch(c) || !matchesSport(c) || !matchesDistance(c.coords)) return;
        allPins.push({
          id: c.id, type: 'coach', title: c.name || 'Coach',
          subtitle: c.sports?.[0] || 'Coach', coords: c.coords, data: { ...c }
        });
      });
    }

    if ((filterType === 'all' || filterType === 'players') && enabledLayers.players) {
      (mapData.players || []).forEach((p: any) => {
        if (!validCoords(p.coords) || !matchesSearch(p) || !matchesDistance(p.coords)) return;
        allPins.push({
          id: p.id, type: 'player', title: p.username || 'Player',
          subtitle: p.currentActivity || 'Live', coords: p.coords, data: { ...p }
        });
      });
    }

    if ((filterType === 'all' || filterType === 'challenges') && enabledLayers.challenges) {
      (mapData.challenges || []).forEach((c: any) => {
        if (!validCoords(c.coords) || !matchesSearch(c) || !matchesSport(c) || !matchesDistance(c.coords)) return;
        allPins.push({
          id: c.id, type: 'challenge', title: c.title || 'Challenge',
          subtitle: `${c.sport || 'Sport'} • ${c.status}`, coords: c.coords, data: { ...c }
        });
      });
    }

    return allPins;
  }, [mapData, filterType, sportFilter, distanceFilter, searchQuery, enabledLayers, effectiveLocation]);

  const activeFilterCount = activeMapFilterCount({
    filterType,
    timeFilter,
    sportFilter,
    distanceFilter,
  });

  const handleResetFilters = () => {
    setFilterType("all");
    setTimeFilter("all");
    setSportFilter("all");
    setDistanceFilter("all");
    setSearchQuery("");
  };

  const filteredPlaces = useMemo(() => {
    if (currentViewMode !== 'list') return [];
    return pins
      .filter(pin => pin.type === 'place')
      .map(pin => ({ ...pin.data, distanceKm: calculateDistance(effectiveLocation, pin.coords) }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }, [pins, currentViewMode, effectiveLocation]);

  const handlePinClick = useCallback((pin: any) => setSelectedPin(pin), []);
  const handleCloseSheet = useCallback(() => setSelectedPin(null), []);

  const handleRecenter = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      });
    }
  }, []);

  return (
    <div className="h-full w-full bg-background text-token-text relative overflow-hidden">
      {currentViewMode === 'map' ? (
        <div className="h-full relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin w-6 h-6 border-2 border-border border-t-white rounded-full mx-auto mb-2" />
                <p className="text-token-text-secondary text-sm">Loading map...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-token-text mb-2">Failed to load map data</p>
                <Button onClick={() => window.location.reload()} size="sm">Retry</Button>
              </div>
            </div>
          ) : (
            <>
              <InteractiveMap center={effectiveLocation} pins={pins} onPinClick={handlePinClick} className="h-full" />

              {pins.length === 0 && (
                <div className="absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-1/2 px-5 py-4 rounded-2xl text-center max-w-[260px] bg-card border border-border shadow-lg">
                  <p className="text-sm font-semibold text-token-text mb-1">No locations on map</p>
                  <p className="text-xs text-token-text-muted">Adjust filters or try list view.</p>
                </div>
              )}

              {!selectedPin && (
                <>
                  <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none flex flex-col items-end gap-2">
                    <MapModeBar
                      value={filterType}
                      onChange={setFilterType}
                      surfaceBg={mt.surfaceBg}
                      surfaceBorder={mt.surfaceBorder}
                      activeBg={mt.chipActiveBg}
                      activeText={mt.chipActiveText}
                      mutedText={mt.iconMuted}
                    />
                    <div className="pointer-events-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSearchSheet(true)}
                        className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl"
                        style={{ background: mt.surfaceBg, border: mt.surfaceBorder }}
                        aria-label="Search"
                      >
                        <Search size={17} style={{ color: mt.iconColor }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFilterSheet(true)}
                        className="relative w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl"
                        style={{ background: mt.surfaceBg, border: mt.surfaceBorder }}
                        aria-label="Filters"
                      >
                        <SlidersHorizontal size={17} style={{ color: mt.iconColor }} />
                        {activeFilterCount > 0 && (
                          <span
                            className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1"
                            style={{ background: mt.chipActiveBg, color: mt.chipActiveText }}
                          >
                            {activeFilterCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div
                    className="absolute bottom-24 right-3 z-[999] pointer-events-auto"
                  >
                    <button
                      type="button"
                      className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg backdrop-blur-xl"
                      style={{ background: mt.surfaceBg, border: mt.surfaceBorder }}
                      onClick={handleRecenter}
                      aria-label="Center on my location"
                    >
                      <Navigation size={18} style={{ color: mt.iconColor }} />
                    </button>
                  </div>

                  <div
                    className="absolute bottom-24 left-3 z-[999] px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-xl pointer-events-none"
                    style={{ background: mt.surfaceBg, border: mt.surfaceBorder, color: mt.textPrimary }}
                  >
                    {pins.length} {pins.length === 1 ? "location" : "locations"}
                  </div>
                </>
              )}

              <MapSearchSheet
                open={showSearchSheet}
                onClose={() => {
                  setShowSearchSheet(false);
                  setSearchQuery("");
                }}
                pins={pins}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectPin={handlePinClick}
                onSelectRecent={(entry) => {
                  const match = pins.find((p) => p.id === entry.id);
                  if (match) handlePinClick(match);
                }}
                theme={{
                  sheetBg: mt.sheetBg,
                  sheetBackdrop: mt.sheetBackdrop,
                  sheetHandle: mt.sheetHandle,
                  textPrimary: mt.textPrimary,
                  iconMuted: mt.iconMuted,
                  chipBg: mt.overlayChipBg,
                  tileBg: mt.tileBg,
                  tileBorder: mt.tileBorder,
                  tileText: mt.tileText,
                }}
              />

              <MapFilterSheet
                open={showFilterSheet}
                onClose={() => setShowFilterSheet(false)}
                filterType={filterType}
                onFilterType={setFilterType}
                timeFilter={timeFilter}
                onTimeFilter={(v) => setTimeFilter(v as TimeFilter)}
                sportFilter={sportFilter}
                onSportFilter={setSportFilter}
                distanceFilter={distanceFilter}
                onDistanceFilter={setDistanceFilter}
                resultCount={pins.length}
                onReset={handleResetFilters}
                activeCount={activeFilterCount}
                theme={{
                  sheetBg: mt.sheetBg,
                  sheetBackdrop: mt.sheetBackdrop,
                  sheetHandle: mt.sheetHandle,
                  sheetLabel: mt.sheetLabel,
                  sheetReset: mt.sheetReset,
                  chipBg: mt.overlayChipBg,
                  tileActiveBg: mt.tileActiveBg,
                  tileBg: mt.tileBg,
                  tileActiveBorder: mt.tileActiveBorder,
                  tileBorder: mt.tileBorder,
                  tileActiveText: mt.tileActiveText,
                  tileText: mt.tileText,
                  textPrimary: mt.textPrimary,
                  iconMuted: mt.iconMuted,
                  ctaBg: mt.ctaBg,
                  ctaText: mt.ctaText,
                }}
              />
            </>
          )}
        </div>
      ) : (
        <div className="h-full overflow-y-auto pb-24">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin w-6 h-6 border-2 border-border border-t-white rounded-full mx-auto mb-2" />
                <p className="text-token-text-secondary text-sm">Loading places...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-token-text mb-2">Failed to load places</p>
              <Button onClick={() => window.location.reload()} size="sm">Retry</Button>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MapPin size={40} className="text-token-text-muted mb-3" />
              <p className="text-token-text-secondary text-sm">No places found nearby</p>
            </div>
          ) : (
            <div className="p-4">
              {(() => {
                const labels = ["Near you", "Worth the drive", "Explore further", "Recommended"];
                const elements: React.ReactNode[] = [];
                let labelIdx = 0;
                filteredPlaces.forEach((place: any, i: number) => {
                  if (i === 0 || (i > 0 && i % 3 === 0 && labelIdx < labels.length)) {
                    elements.push(
                      <h3 key={`label-${labelIdx}`} className="section-label">{labels[labelIdx] || labels[labels.length - 1]}</h3>
                    );
                    labelIdx++;
                  }
                  elements.push(
                    <VenueCard
                      key={place.id}
                      place={place}
                      onPreview={() => handlePinClick({ id: place.id, type: 'place', title: place.name, coords: place.coords, data: place })}
                    />
                  );
                });
                return <div className="space-y-3">{elements}</div>;
              })()}
            </div>
          )}
        </div>
      )}

      <PinSheet
        pin={selectedPin}
        userLocation={userLocation || undefined}
        onClose={handleCloseSheet}
        returnPath={ROUTES.discover}
      />
    </div>
  );
}
