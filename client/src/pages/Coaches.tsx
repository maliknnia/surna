import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, RefreshCw, GraduationCap } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import FilterBottomSheet from "@/components/FilterBottomSheet";
import CoachCircleCard from "@/components/coaches/CoachCircleCard";
import { fetchCoaches } from "@/lib/coachesApi";
import type { CoachWithProfile } from "@shared/schema";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { getPanelTheme } from "@/lib/panelTheme";
import { PanelBackButton } from "@/components/panels/PanelBackButton";
import { useSmartBack } from "@/lib/navigation";

const sportFilters = [
  "All", "Basketball", "Soccer", "Tennis", "Boxing", "MMA", "Fitness", "Swimming",
  "Running", "Volleyball", "CrossFit",
];

export default function Coaches({ embedded = false }: { embedded?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({ fallback: "/" });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data: coaches, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["coaches-discover", activeFilter],
    queryFn: () =>
      fetchCoaches({
        limit: 80,
        sport: activeFilter !== "All" ? activeFilter : undefined,
      }),
    staleTime: 30_000,
  });

  const handleRefresh = async () => {
    await refetch();
  };
  const { isRefreshing, pullDistance, touchHandlers } = usePullToRefresh(handleRefresh);

  const filteredCoaches = useMemo(() => {
    const list = coaches ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (coach) =>
        coach.user.firstName?.toLowerCase().includes(q) ||
        coach.user.lastName?.toLowerCase().includes(q) ||
        coach.user.sport?.toLowerCase().includes(q) ||
        coach.user.location?.toLowerCase().includes(q) ||
        coach.specialties?.some((s) => s.toLowerCase().includes(q)) ||
        coach.bio?.toLowerCase().includes(q) ||
        coach.profile?.tagline?.toLowerCase().includes(q),
    );
  }, [coaches, searchQuery]);

  const t = getPanelTheme();
  const pageBg = t.pageBg;
  const headerBg = t.headerBg;
  const textPrimary = t.textPrimary;
  const textSecondary = t.textSecondary;
  const chipActiveBg = t.chipActiveBg;
  const chipActiveText = t.chipActiveText;
  const chipBg = t.chipBg;
  const chipText = t.chipText;
  const borderColor = t.border;
  const inputBg = t.inputBg;

  return (
    <div
      className={embedded ? "min-h-full pb-4" : "min-h-screen pb-24"}
      style={{ background: pageBg }}
      {...touchHandlers}
    >
      {pullDistance > 0 && (
        <div className="flex justify-center pt-2">
          <span className="text-xs" style={{ color: textSecondary }}>
            {isRefreshing ? "Refreshing..." : "Pull to refresh"}
          </span>
        </div>
      )}

      <div
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{ background: headerBg, borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="px-4 pt-3 pb-2.5">
          <div className="flex items-center gap-3">
            {!embedded && <PanelBackButton onClick={goBack} background={inputBg} color={textPrimary} />}
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] font-semibold tracking-tight" style={{ color: textPrimary }}>
                Coaches
              </h1>
              {!embedded && (
                <p className="text-[12px] truncate mt-0.5" style={{ color: textSecondary }}>
                  Book near you
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform"
              style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }}
              aria-label="Refresh coaches"
            >
              <RefreshCw
                size={15}
                className={isFetching ? "animate-spin" : ""}
                style={{ color: textPrimary }}
              />
            </button>
            <FilterBottomSheet
              filters={[
                {
                  key: "specialty",
                  label: "Sport",
                  options: sportFilters.map((s) => ({ value: s, label: s })),
                  value: activeFilter,
                  onChange: setActiveFilter,
                },
              ]}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search coaches..."
            />
          </div>

          <div className="flex gap-2 mt-3 surna-h-scroll no-scrollbar pb-0.5 -mx-1 px-1">
            {sportFilters.map((sport) => {
              const active = activeFilter === sport;
              return (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setActiveFilter(sport)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 active:scale-95 transition-transform"
                  style={{
                    background: active ? chipActiveBg : chipBg,
                    color: active ? chipActiveText : chipText,
                    border: `1px solid ${active ? "transparent" : borderColor}`,
                    boxShadow: !isDark && !active ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                  }}
                >
                  {sport}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-4">
        {isLoading ? (
          <ListSkeleton chipBg={chipBg} />
        ) : isError ? (
          <div className="text-center py-20 px-6">
            <Users size={36} className="mx-auto mb-3" style={{ color: textSecondary }} />
            <h3 className="text-[15px] font-semibold mb-1" style={{ color: textPrimary }}>
              Couldn&apos;t load coaches
            </h3>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 px-5 py-2.5 rounded-full text-[13px] font-bold"
              style={{ background: chipActiveBg, color: chipActiveText }}
            >
              Retry
            </button>
          </div>
        ) : filteredCoaches.length === 0 ? (
          <EmptyCoaches
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            chipBg={chipBg}
            chipText={chipText}
            borderColor={borderColor}
            chipActiveBg={chipActiveBg}
            chipActiveText={chipActiveText}
            hasFilters={!!searchQuery || activeFilter !== "All"}
            onClear={() => {
              setSearchQuery("");
              setActiveFilter("All");
            }}
            onApply={() => setLocation("/monetization/coach-signup")}
          />
        ) : (
          <>
            {searchQuery.trim().length > 0 && (
              <p className="px-4 mb-3 text-[13px] font-semibold" style={{ color: textSecondary }}>
                {filteredCoaches.length} result{filteredCoaches.length === 1 ? "" : "s"}
              </p>
            )}
            <div className="px-4 pb-6">
              <div className="grid grid-cols-3 gap-x-2 gap-y-7 sm:grid-cols-4 sm:gap-x-4">
                {(filteredCoaches as CoachWithProfile[]).map((coach) => (
                  <CoachCircleCard key={coach.id} coach={coach} size={88} />
                ))}
              </div>
            </div>

            <div className="px-4 mt-2 mb-8 text-center">
              <button
                type="button"
                onClick={() => setLocation("/monetization/coach-signup")}
                className="text-[12px] font-medium underline underline-offset-2"
                style={{ color: textSecondary }}
              >
                Become a coach
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ListSkeleton({ chipBg }: { chipBg: string }) {
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-7 px-4 sm:grid-cols-4 sm:gap-x-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex flex-col items-center gap-2.5">
          <div className="w-[88px] h-[88px] rounded-full animate-pulse" style={{ background: chipBg }} />
          <div className="h-2.5 w-14 rounded-full animate-pulse" style={{ background: chipBg }} />
          <div className="h-2 w-10 rounded-full animate-pulse" style={{ background: chipBg }} />
        </div>
      ))}
    </div>
  );
}

function EmptyCoaches({
  textPrimary,
  textSecondary,
  chipBg,
  chipText,
  borderColor,
  chipActiveBg,
  chipActiveText,
  hasFilters,
  onClear,
  onApply,
}: {
  textPrimary: string;
  textSecondary: string;
  chipBg: string;
  chipText: string;
  borderColor: string;
  chipActiveBg: string;
  chipActiveText: string;
  hasFilters: boolean;
  onClear: () => void;
  onApply: () => void;
}) {
  return (
    <div className="text-center py-20 px-6">
      <GraduationCap size={36} className="mx-auto mb-3" style={{ color: textSecondary }} />
      <h3 className="text-[15px] font-semibold mb-1" style={{ color: textPrimary }}>
        {hasFilters ? "No coaches match" : "No coaches yet"}
      </h3>
      <p className="text-[13px] mb-4 max-w-xs mx-auto" style={{ color: textSecondary }}>
        {hasFilters ? "Try another sport or clear search." : "Demo coaches load after seeding."}
      </p>
      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="px-5 py-2.5 rounded-full text-[13px] font-bold mr-2"
          style={{ background: chipBg, color: chipText, border: `1px solid ${borderColor}` }}
        >
          Clear filters
        </button>
      ) : (
        <button
          type="button"
          onClick={onApply}
          className="px-5 py-2.5 rounded-full text-[13px] font-bold"
          style={{ background: chipActiveBg, color: chipActiveText }}
        >
          Apply to coach
        </button>
      )}
    </div>
  );
}
