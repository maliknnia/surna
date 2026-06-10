import { useState } from "react";
import { useLocation } from "wouter";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useInView } from "react-intersection-observer";
import { Plus, MapPin } from "lucide-react";
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
import type { Place } from "@shared/schema";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

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

  const places = data?.pages.flatMap((page) => page.items) || [];
  if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  const handleRefresh = async () => {
    await refetch();
  };
  const { isRefreshing, pullDistance, touchHandlers } = usePullToRefresh(handleRefresh);

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
  const skeletonBg = t.chipBg;



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
  const hasActiveFilter = selectedCategory !== "All";
  const hasActiveSearch = searchQuery.length > 0;

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
            {user && (
              <button
                onClick={() => setLocation("/places/create")}
                className="h-8 px-4 rounded-full text-[12px] font-semibold flex items-center gap-1.5 active:scale-[0.96] transition-transform"
                style={{ background: chipActiveBg, color: chipActiveText }}
              >
                <Plus size={14} />
                Add
              </button>
            )}
            {panelActive && (
              <PanelHeaderToolButtons
                style={toolsStyle}
                searchOpen={searchOpen || hasActiveSearch}
                filterOpen={filterOpen}
                filterActive={hasActiveFilter}
                onToggleSearch={onToggleSearch}
                onToggleFilter={onToggleFilter}
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

      <div className="px-4 pt-3 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: skeletonBg }}>
              <Skeleton className="h-40 w-full" style={{ background: skeletonBg }} />
            </div>
          ))
        ) : places.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">
              {CATEGORIES.find(c => c.key === selectedCategory)?.emoji || "📍"}
            </div>
            <h3 className="text-[16px] font-semibold mb-1" style={{ color: textPrimary }}>
              {selectedCategory !== "All" ? `No ${selectedCategory}s found` : "No places found"}
            </h3>
            <p className="text-[13px] mb-4" style={{ color: textSecondary }}>Try adjusting your search or filters</p>
            {user && (
              <button
                type="button"
                onClick={() => setLocation("/places/create")}
                className="px-5 py-2.5 rounded-full text-[13px] font-bold"
                style={{ background: chipActiveBg, color: chipActiveText }}
              >
                Add a venue
              </button>
            )}
          </div>
        ) : (
          places.map((place) => (
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
            />
          ))
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
