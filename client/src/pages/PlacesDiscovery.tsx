import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useInView } from "react-intersection-observer";
import { MapPin, Building2 } from "lucide-react";
import { FeatureFilterChips } from "@/components/panels/FeatureFilterBar";
import {
  PanelFilterSheet,
  PanelHeaderToolButtons,
  PanelInlineSearch,
  panelToolsStyle,
  usePanelToolToggles,
  usePanelToolsLifecycle,
} from "@/components/panels/PanelSideTools";
import { getPanelTheme } from "@/lib/panelTheme";
import { PanelBackButton } from "@/components/panels/PanelBackButton";
import { markNavReturn, mobilePanelReturnPath, useSmartBack } from "@/lib/navigation";
import VenueCard from "@/components/VenueCard";
import DiscoveryCircleStrip from "@/components/cards/DiscoveryCircleStrip";
import { DiscoverySectionHeading, DISCOVERY_SECTION_LABELS } from "@/components/cards/DiscoverySectionHeading";
import type { Place } from "@shared/schema";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { mergeWithDemoPlaces } from "@/lib/demoPlaces";
import { mapPath } from "@/lib/mapNavigation";
import { EntityEmptyState, EntityListSkeleton } from "@/components/entity";
import { ROUTES } from "@/navigation";

const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: "All", label: "All", emoji: "📍" },
  { key: "gym", label: "Gym", emoji: "🏋️" },
  { key: "court", label: "Court", emoji: "🎾" },
  { key: "field", label: "Field", emoji: "⚽" },
  { key: "gaa-pitch", label: "GAA Pitch", emoji: "🏐" },
  { key: "rugby-pitch", label: "Rugby Pitch", emoji: "🏉" },
  { key: "cricket-pitch", label: "Cricket Pitch", emoji: "🏏" },
  { key: "studio", label: "Studio", emoji: "🧘" },
  { key: "pool", label: "Pool", emoji: "🏊" },
  { key: "track", label: "Track", emoji: "🏃" },
  { key: "club", label: "Club", emoji: "🏟️" },
  { key: "nightlife", label: "Nightlife", emoji: "🌙" },
  { key: "cafe", label: "Café", emoji: "☕" },
];

interface PlacesResponse {
  items: Place[];
  nextCursor: number | null;
}

export default function PlacesDiscovery({
  embedded = false,
  onPanelBack,
  panelActive = true,
}: {
  embedded?: boolean;
  onPanelBack?: () => void;
  panelActive?: boolean;
}) {
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({
    onPanelBack: embedded ? onPanelBack : undefined,
    fallback: "/",
  });
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const { ref, inView } = useInView();

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedCategory !== "All") params.append("category", selectedCategory);
    return params.toString();
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useInfiniteQuery<PlacesResponse>({
    queryKey: ["/api/places", buildQueryString()],
    queryFn: async ({ pageParam = 0 }) => {
      const queryString = buildQueryString();
      const url = `/api/places?${queryString}&limit=20&offset=${pageParam}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch places");
      const places = await response.json();
      return { items: places, nextCursor: places.length === 20 ? (pageParam as number) + 20 : null };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  });

  const apiPlaces = data?.pages.flatMap((page) => page.items) || [];
  const hasActiveFilter = selectedCategory !== "All";
  const hasActiveSearch = searchQuery.length > 0;
  const hasActiveFilters = hasActiveFilter || hasActiveSearch;

  const places = useMemo(() => {
    let list = mergeWithDemoPlaces(apiPlaces, {
      skipDemo: hasActiveFilters,
      fallback: !hasActiveFilters,
    });
    if (selectedCategory !== "All") {
      const cat = selectedCategory.toLowerCase();
      list = list.filter((p) => (p.category || "").toLowerCase() === cat);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q) ||
          (p.sports || []).some((s: string) => s.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [apiPlaces, hasActiveFilters, selectedCategory, searchQuery]);

  if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  const handleRefresh = async () => {
    await refetch();
  };
  const { isRefreshing, pullDistance, touchHandlers } = usePullToRefresh(handleRefresh, {
    enabled: !embedded,
  });

  const t = getPanelTheme();
  const pageBg = t.pageBg;
  const headerBg = t.headerBg;
  const textPrimary = t.textPrimary;
  const textSecondary = t.textSecondary;
  const inputBg = t.inputBg;
  const chipActiveBg = t.chipActiveBg;
  const chipActiveText = t.chipActiveText;
  const chipBg = t.chipBg;
  const chipText = t.chipText;
  const borderColor = t.border;

  const venueCategoryChips = CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    emoji: c.emoji,
  }));

  const toolsStyle = panelToolsStyle(isDark);
  const { onToggleSearch, onToggleFilter } = usePanelToolToggles(
    setSearchOpen,
    setFilterOpen,
    searchOpen,
    filterOpen,
  );
  usePanelToolsLifecycle(panelActive, setSearchOpen, setFilterOpen);

  const venueCircleItems = places.slice(0, 18).map((place) => {
    const cat = (place.category || "other").toLowerCase();
    const emoji = CATEGORIES.find((c) => c.key === cat)?.emoji || "📍";
    return {
      id: place.id,
      name: place.name,
      imageUrl: place.profileImageUrl || place.coverImageUrl || null,
      emoji,
      sport: place.sports?.[0] ?? null,
    };
  });

  return (
    <div className={embedded ? "min-h-full pb-4" : "min-h-screen pb-24"} style={{ background: pageBg }} {...touchHandlers}>
      {panelActive && (
        <PanelFilterSheet
          style={toolsStyle}
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="Venue type"
        >
          <FeatureFilterChips
            isDark={isDark}
            chips={venueCategoryChips}
            chipValue={selectedCategory}
            onChipChange={setSelectedCategory}
          />
        </PanelFilterSheet>
      )}
      {pullDistance > 0 && (
        <div className="flex justify-center pt-2">
          <span className="text-xs" style={{ color: textSecondary }}>{isRefreshing ? "Refreshing..." : "Pull to refresh"}</span>
        </div>
      )}
      <div
        className={embedded ? undefined : "sticky top-0 z-50 backdrop-blur-xl"}
        style={
          embedded
            ? { background: pageBg }
            : { background: headerBg, borderBottom: `1px solid ${borderColor}` }
        }
      >
        <div className={embedded ? "px-4 pt-1 pb-1" : "px-4 pt-3 pb-2.5"}>
          <div className={`flex items-center gap-3 ${embedded ? "justify-end mb-0" : "mb-3"}`}>
            {!embedded ? (
              <PanelBackButton onClick={goBack} background={inputBg} color={textPrimary} />
            ) : null}
            {!embedded ? (
              <h1 className="text-[18px] font-bold flex-1" style={{ color: textPrimary }}>Venues</h1>
            ) : null}
            {panelActive && (
              <PanelHeaderToolButtons
                style={toolsStyle}
                searchOpen={searchOpen || hasActiveSearch}
                filterOpen={filterOpen}
                filterActive={hasActiveFilter}
                showSearch
                showCreate={!!user}
                onToggleSearch={onToggleSearch}
                onToggleFilter={onToggleFilter}
                onCreate={() => setLocation("/places/create")}
                createLabel="Add venue"
              />
            )}
          </div>
        {panelActive && searchOpen && (
          <PanelInlineSearch
            style={toolsStyle}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search gyms, courts, fields…"
          />
        )}
        </div>
      </div>

      <div className="px-4 pt-3">
        {isLoading ? (
          <EntityListSkeleton rows={4} rowHeight={140} />
        ) : places.length === 0 ? (
          <EntityEmptyState
            icon={Building2}
            title={selectedCategory !== "All" ? `No ${selectedCategory.replace(/-/g, " ")}s found` : "No venues yet"}
            description="Try adjusting your search or filters, or add the first venue in your area."
            actionLabel={user ? "Add a venue" : undefined}
            actionHref={user ? ROUTES.createPlace : undefined}
          />
        ) : (
          (() => {
            const labels = DISCOVERY_SECTION_LABELS.venues;
            const elements: React.ReactNode[] = [];
            let labelIdx = 0;
            let circlesInserted = false;
            places.forEach((place, i) => {
              if (i === 0 || (i > 0 && i % 3 === 0 && labelIdx < labels.length)) {
                elements.push(
                  <DiscoverySectionHeading key={`venue-label-${labelIdx}`}>
                    {labels[labelIdx] || labels[labels.length - 1]}
                  </DiscoverySectionHeading>,
                );
                labelIdx++;
              }
              elements.push(
                <VenueCard
                  key={place.id}
                  place={{
                    id: place.id,
                    name: place.name,
                    category: place.category,
                    sports: place.sports || [],
                    rating: place.averageRating ? parseFloat(place.averageRating) : undefined,
                    reviewsCount: place.reviewsCount || 0,
                    city: place.city || undefined,
                    state: place.state || undefined,
                    address: place.address || undefined,
                    phone: place.phone || undefined,
                    coverImageUrl: place.coverImageUrl || undefined,
                    profileImageUrl: place.profileImageUrl || undefined,
                    followersCount: place.followersCount || 0,
                    amenities: place.amenities || [],
                    hours: place.hours as Record<string, string> | undefined,
                    bio: place.bio || undefined,
                    pricing: place.pricing as Record<string, string> | null | undefined,
                  }}
                  onPreview={() => {
                    markNavReturn(embedded ? mobilePanelReturnPath("venues") : "/places");
                    setLocation(`/places/${place.id}`);
                  }}
                  onNavigate={() => setLocation(mapPath({ type: "place", id: place.id }))}
                />,
              );
              if (i === 1 && !circlesInserted && venueCircleItems.length > 0) {
                elements.push(
                  <DiscoveryCircleStrip
                    key="venue-circles"
                    items={venueCircleItems}
                    onItemClick={(id) => {
                      markNavReturn(embedded ? mobilePanelReturnPath("venues") : "/places");
                      setLocation(`/places/${id}`);
                    }}
                    onCreate={user ? () => setLocation("/places/create") : undefined}
                    createLabel="Add venue"
                  />,
                );
                circlesInserted = true;
              }
            });
            return <div className="discovery-card-list">{elements}</div>;
          })()
        )}

        {hasNextPage && (
          <div ref={ref} className="flex justify-center py-4">
            {isFetchingNextPage && (
              <div className="w-6 h-6 rounded-full border-2 animate-spin"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', borderTopColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
