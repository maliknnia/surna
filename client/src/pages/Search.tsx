import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search as SearchIcon,
  X,
  MoreHorizontal,
  MapPin,
  Calendar,
  Users,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useDebounce } from "@/lib/performance";
import { ROUTES } from "@/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { getPanelTheme } from "@/lib/panelTheme";
import { FeatureFilterChips } from "@/components/panels/FeatureFilterBar";
import { HomePortraitCard } from "@/features/home/components/HomeCardSurface";
import {
  SEARCH_CATEGORIES,
  loadRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  type SearchCategoryId,
} from "@/features/search/searchCategories";
import type {
  UnifiedSearchResults,
  SearchAd,
  UndiscoveredItem,
} from "@/features/search/searchTypes";

const SPORT_CATEGORY_IDS: SearchCategoryId[] = [
  "football",
  "gaa",
  "rugby",
  "basketball",
  "cricket",
  "cycling",
  "running",
];

const DISCOVER_CATEGORY_IDS: SearchCategoryId[] = [
  "coaches",
  "teams",
  "events",
  "instant-join",
  "marketplace",
];

const ALL_CATEGORY_IDS: SearchCategoryId[] = [
  ...SPORT_CATEGORY_IDS,
  ...DISCOVER_CATEGORY_IDS,
];

const EMPTY_RESULTS: UnifiedSearchResults = {
  users: [],
  teams: [],
  events: [],
  coaches: [],
  places: [],
  products: [],
  routes: [],
};

async function fetchSearch(params: URLSearchParams): Promise<UnifiedSearchResults> {
  const res = await fetch(`/api/search?${params}`, { credentials: "include" });
  if (!res.ok) return EMPTY_RESULTS;
  const data = await res.json();
  return {
    ...EMPTY_RESULTS,
    ...data,
    users: data.players ?? data.users ?? [],
    places: data.venues ?? data.places ?? [],
    routes: data.routes ?? [],
  };
}

function displayName(user: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}) {
  return (
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Player"
  );
}

function formatEventTime(dateStr?: string | Date | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatPrice(value?: string | number | null) {
  if (value == null || value === "") return "";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return String(value);
  return `€${n.toFixed(2)}`;
}

function categoryToChip(id: SearchCategoryId) {
  const cat = SEARCH_CATEGORIES.find((c) => c.id === id)!;
  return { key: cat.id, label: cat.label, emoji: cat.emoji };
}

function SectionHeader({
  title,
  onSeeAll,
  showSeeAll,
  textPrimary,
  textSecondary,
}: {
  title: string;
  onSeeAll?: () => void;
  showSeeAll?: boolean;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[17px] font-bold tracking-tight" style={{ color: textPrimary }}>
        {title}
      </h2>
      {showSeeAll && onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          className="text-[12px] font-semibold active:opacity-70"
          style={{ color: textSecondary }}
        >
          See all
        </button>
      )}
    </div>
  );
}

function SearchAdCard({
  ad,
  textPrimary,
  textSecondary,
  textMuted,
  cardBg,
  border,
  ctaBg,
}: {
  ad: SearchAd;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  border: string;
  ctaBg: string;
}) {
  const [, navigate] = useLocation();
  return (
    <div
      className="relative p-3.5 mb-6 rounded-2xl"
      style={{ background: cardBg, border: `1px solid ${border}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: textMuted }}>
            Sponsored
          </span>
          <span className="text-[11px] font-bold" style={{ color: textPrimary }}>
            {ad.brandName}
          </span>
        </div>
        <button type="button" aria-label="Ad options" className="p-1 -mr-1">
          <MoreHorizontal size={16} style={{ color: textSecondary }} />
        </button>
      </div>
      <div className="flex gap-3">
        <img
          src={ad.imageUrl}
          alt=""
          className="shrink-0 object-cover rounded-xl"
          style={{ width: 96, height: 96 }}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <p className="line-clamp-2 flex-1 text-[15px] font-bold" style={{ color: textPrimary }}>
            {ad.title}
          </p>
          <div className="flex items-end justify-between gap-2 mt-2">
            <span className="text-[12px]" style={{ color: textSecondary }}>
              {ad.brandName}
            </span>
            <button
              type="button"
              onClick={() => navigate(ad.ctaUrl)}
              className="px-4 py-1.5 rounded-full shrink-0 text-[12px] font-bold active:scale-95 transition-transform"
              style={{ background: ctaBg, color: textPrimary }}
            >
              {ad.ctaLabel || "Learn more"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  onClick,
  children,
  cardBg,
  border,
}: {
  onClick: () => void;
  children: React.ReactNode;
  cardBg: string;
  border: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl text-left active:scale-[0.99] transition-transform"
      style={{ background: cardBg, border: `1px solid ${border}` }}
    >
      {children}
    </button>
  );
}

export default function Search() {
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const t = getPanelTheme(isDark);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SearchCategoryId | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [results, setResults] = useState<UnifiedSearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());

  const debouncedQuery = useDebounce(query, 300);
  const showResults = debouncedQuery.length >= 2 || Boolean(activeCategory);

  const { data: trendingData } = useQuery<{ terms: string[] }>({
    queryKey: ["/api/search/trending"],
    queryFn: async () => {
      const res = await fetch("/api/search/trending");
      if (!res.ok) return { terms: [] };
      return res.json();
    },
    staleTime: 120_000,
  });

  const { data: adData } = useQuery<{ ad: SearchAd | null }>({
    queryKey: ["/api/ads/search-placement"],
    queryFn: async () => {
      const res = await fetch("/api/ads/search-placement");
      if (!res.ok) return { ad: null };
      return res.json();
    },
    staleTime: 300_000,
  });

  const { data: discoverData } = useQuery<{ items: UndiscoveredItem[] }>({
    queryKey: ["/api/recommendations/undiscovered"],
    queryFn: async () => {
      const res = await fetch("/api/recommendations/undiscovered", { credentials: "include" });
      if (!res.ok) return { items: [] };
      return res.json();
    },
    staleTime: 300_000,
  });

  const performSearch = useCallback(async () => {
    if (debouncedQuery.length < 2 && !activeCategory) {
      setResults(EMPTY_RESULTS);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery.length >= 2) params.set("q", debouncedQuery);
      if (activeCategory) params.set("category", activeCategory);
      params.set("limit", "20");
      const data = await fetchSearch(params);
      setResults(data);
      if (debouncedQuery.length >= 2) {
        saveRecentSearch(debouncedQuery);
        setRecentSearches(loadRecentSearches());
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, activeCategory]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const totalResults = useMemo(
    () =>
      results.users.length +
      results.teams.length +
      results.events.length +
      results.coaches.length +
      results.places.length +
      results.products.length +
      (results.routes?.length ?? 0),
    [results],
  );

  const handleCategoryTap = (id: SearchCategoryId) => {
    setActiveCategory((prev) => (prev === id ? null : id));
    setQuery("");
    setExpandedSection(null);
    inputRef.current?.blur();
    setFocused(false);
  };

  const handleRecentTap = (term: string) => {
    setActiveCategory(null);
    setQuery(term);
    setFocused(false);
  };

  const handleClear = () => {
    setQuery("");
    setActiveCategory(null);
    setExpandedSection(null);
  };

  const navigateTo = (path: string) => navigate(path);

  const renderLimit = (section: string, count: number) =>
    expandedSection === section ? count : Math.min(3, count);

  const suggestions = ["Try a sport name", "Search for a team", "Find coaches near you"];

  const avatarFallbackBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const iconTileBg = avatarFallbackBg;

  return (
    <div className="min-h-screen pb-24" style={{ background: t.pageBg }}>
      <div
        className="sticky top-0 z-50 px-4 pt-3 pb-3 backdrop-blur-xl"
        style={{ background: t.headerBg, borderBottom: `1px solid ${t.border}` }}
      >
        <div className="relative mb-3">
          <SearchIcon
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: t.textSecondary }}
          />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search players, teams, events…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.length >= 2) setActiveCategory(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            className="w-full h-11 pl-10 pr-10 rounded-xl text-[14px] focus:outline-none"
            style={{
              background: t.inputBg,
              color: t.textPrimary,
              border: `1px solid ${t.border}`,
              boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.04)",
            }}
          />
          {(query || activeCategory) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: t.chipBg }}
              aria-label="Clear search"
            >
              <X size={14} style={{ color: t.textSecondary }} />
            </button>
          )}
        </div>

        {focused && !showResults && (
          <div
            className="mt-3 rounded-2xl overflow-hidden"
            style={{ background: t.sheetBg, border: `1px solid ${t.border}` }}
          >
            {recentSearches.length > 0 && (
              <div className="p-3" style={{ borderBottom: `1px solid ${t.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: t.textMuted }}
                  >
                    Recent
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearRecentSearches();
                      setRecentSearches([]);
                    }}
                    className="text-[11px] font-semibold active:opacity-70"
                    style={{ color: t.textSecondary }}
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleRecentTap(term)}
                    className="w-full flex items-center gap-3 py-2.5 text-left rounded-xl active:opacity-80"
                  >
                    <Clock size={15} style={{ color: t.textSecondary }} />
                    <span className="text-[14px]" style={{ color: t.textPrimary }}>
                      {term}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {(trendingData?.terms?.length ?? 0) > 0 && (
              <div className="p-3">
                <span
                  className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: t.textMuted }}
                >
                  <TrendingUp size={12} style={{ color: "var(--surna-ios-orange)" }} />
                  Trending
                </span>
                {trendingData!.terms.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleRecentTap(term)}
                    className="w-full flex items-center gap-3 py-2.5 text-left rounded-xl active:opacity-80"
                  >
                    <TrendingUp size={15} style={{ color: "var(--surna-ios-orange)" }} />
                    <span className="text-[14px]" style={{ color: t.textPrimary }}>
                      {term}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pt-3">
        {!showResults && (
          <>
            <FeatureFilterChips
              isDark={isDark}
              layout="scroll"
              chips={ALL_CATEGORY_IDS.map(categoryToChip)}
              chipValue={activeCategory ?? ""}
              onChipChange={(key) => handleCategoryTap(key as SearchCategoryId)}
            />

            {adData?.ad && (
              <div className="mt-5">
                <SearchAdCard
                  ad={adData.ad}
                  textPrimary={t.textPrimary}
                  textSecondary={t.textSecondary}
                  textMuted={t.textMuted}
                  cardBg={t.inputBg}
                  border={t.border}
                  ctaBg={t.chipBg}
                />
              </div>
            )}

            {(discoverData?.items?.length ?? 0) > 0 && (
              <section className="mt-5">
                <h2
                  className="text-[13px] font-semibold mb-2.5"
                  style={{ color: t.textSecondary }}
                >
                  Discover
                </h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
                  {discoverData!.items.map((item) => (
                    <HomePortraitCard
                      key={`${item.type}-${item.id}`}
                      title={item.title}
                      subtitle={item.subtitle}
                      imageUrl={item.imageUrl}
                      sport={item.sport}
                      cardKind={item.type === "coach" ? "coach" : item.type === "team" ? "team" : "event"}
                      onClick={() => {
                        if (item.type === "event") navigateTo(ROUTES.event(item.id));
                        else if (item.type === "team") navigateTo(ROUTES.team(item.id));
                        else navigateTo(ROUTES.coach(item.id));
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {showResults && (
          <div className="pb-8">
            {activeCategory && !debouncedQuery && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[13px]" style={{ color: t.textSecondary }}>
                  Showing
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                  style={{ background: t.chipActiveBg, color: t.chipActiveText }}
                >
                  {SEARCH_CATEGORIES.find((c) => c.id === activeCategory)?.emoji}{" "}
                  {SEARCH_CATEGORIES.find((c) => c.id === activeCategory)?.label}
                </span>
              </div>
            )}

            {loading && (
              <p className="text-center py-8 text-[14px]" style={{ color: t.textSecondary }}>
                Searching…
              </p>
            )}

            {!loading && totalResults === 0 && (
              <div className="flex flex-col items-center text-center py-12 px-4">
                <SearchIcon
                  size={56}
                  strokeWidth={1.2}
                  className="mb-4 opacity-30"
                  style={{ color: t.textMuted }}
                />
                <p className="text-[17px] font-bold" style={{ color: t.textPrimary }}>
                  No results for &ldquo;
                  {debouncedQuery || SEARCH_CATEGORIES.find((c) => c.id === activeCategory)?.label}
                  &rdquo;
                </p>
                <ul className="mt-4 space-y-2">
                  {suggestions.map((s) => (
                    <li key={s} className="text-[14px]" style={{ color: t.textSecondary }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!loading && results.users.length > 0 && (
              <section className="mb-6">
                <SectionHeader
                  title="Players"
                  showSeeAll={results.users.length > 3}
                  onSeeAll={() => setExpandedSection(expandedSection === "users" ? null : "users")}
                  textPrimary={t.textPrimary}
                  textSecondary={t.textSecondary}
                />
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
                  {results.users.slice(0, renderLimit("users", results.users.length)).map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => navigateTo(ROUTES.person(user.id))}
                      className="flex flex-col items-center shrink-0 w-[72px] active:scale-95 transition-transform"
                    >
                      <div
                        className="w-16 h-16 rounded-full overflow-hidden mb-2"
                        style={{ background: avatarFallbackBg, border: `2px solid ${t.border}` }}
                      >
                        {user.profileImageUrl ? (
                          <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-[18px] font-bold"
                            style={{ color: t.textPrimary }}
                          >
                            {displayName(user).charAt(0)}
                          </div>
                        )}
                      </div>
                      <span
                        className="line-clamp-2 text-center w-full text-[12px] font-semibold"
                        style={{ color: t.textPrimary }}
                      >
                        {displayName(user)}
                      </span>
                      {user.sport && (
                        <span className="text-[11px]" style={{ color: t.textSecondary }}>
                          {user.sport}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {!loading && results.teams.length > 0 && (
              <section className="mb-6">
                <SectionHeader
                  title="Teams"
                  showSeeAll={results.teams.length > 3}
                  onSeeAll={() => setExpandedSection(expandedSection === "teams" ? null : "teams")}
                  textPrimary={t.textPrimary}
                  textSecondary={t.textSecondary}
                />
                <div className="space-y-2">
                  {results.teams.slice(0, renderLimit("teams", results.teams.length)).map((team) => (
                    <ResultRow
                      key={team.id}
                      cardBg={t.inputBg}
                      border={t.border}
                      onClick={() =>
                        navigateTo(team.isInstant ? ROUTES.instantJoin : ROUTES.team(team.id))
                      }
                    >
                      <div
                        className="w-12 h-12 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                        style={{ background: iconTileBg }}
                      >
                        {team.logo ? (
                          <img src={team.logo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users size={20} style={{ color: t.textSecondary }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold truncate" style={{ color: t.textPrimary }}>
                          {team.name}
                        </p>
                        <p className="text-[12px] truncate" style={{ color: t.textSecondary }}>
                          {team.memberCount != null ? `${team.memberCount} members` : team.sport || "Team"}
                          {team.isInstant ? " · Instant" : ""}
                        </p>
                      </div>
                    </ResultRow>
                  ))}
                </div>
              </section>
            )}

            {!loading && results.events.length > 0 && (
              <section className="mb-6">
                <SectionHeader
                  title="Events"
                  showSeeAll={results.events.length > 3}
                  onSeeAll={() => setExpandedSection(expandedSection === "events" ? null : "events")}
                  textPrimary={t.textPrimary}
                  textSecondary={t.textSecondary}
                />
                <div className="space-y-2">
                  {results.events.slice(0, renderLimit("events", results.events.length)).map((event) => (
                    <ResultRow
                      key={event.id}
                      cardBg={t.inputBg}
                      border={t.border}
                      onClick={() => navigateTo(ROUTES.event(event.id))}
                    >
                      <div
                        className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                        style={{ background: iconTileBg }}
                      >
                        <Calendar size={20} style={{ color: t.textSecondary }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold truncate" style={{ color: t.textPrimary }}>
                          {event.title}
                        </p>
                        <p className="text-[12px] truncate" style={{ color: t.textSecondary }}>
                          {[event.sport, event.location, formatEventTime(event.startDate)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </ResultRow>
                  ))}
                </div>
              </section>
            )}

            {!loading && results.coaches.length > 0 && (
              <section className="mb-6">
                <SectionHeader
                  title="Coaches"
                  showSeeAll={results.coaches.length > 3}
                  onSeeAll={() => setExpandedSection(expandedSection === "coaches" ? null : "coaches")}
                  textPrimary={t.textPrimary}
                  textSecondary={t.textSecondary}
                />
                <div className="space-y-2">
                  {results.coaches.slice(0, renderLimit("coaches", results.coaches.length)).map((coach) => {
                    const name =
                      coach.displayName ||
                      [coach.firstName, coach.lastName].filter(Boolean).join(" ") ||
                      "Coach";
                    return (
                      <ResultRow
                        key={coach.id}
                        cardBg={t.inputBg}
                        border={t.border}
                        onClick={() => navigateTo(ROUTES.coach(coach.id))}
                      >
                        <div
                          className="w-12 h-12 rounded-full shrink-0 overflow-hidden"
                          style={{ background: avatarFallbackBg }}
                        >
                          {coach.profileImageUrl ? (
                            <img src={coach.profileImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-[16px] font-bold"
                              style={{ color: t.textPrimary }}
                            >
                              {name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold truncate" style={{ color: t.textPrimary }}>
                            {name}
                          </p>
                          <p className="text-[12px] truncate" style={{ color: t.textSecondary }}>
                            {[coach.sport, formatPrice(coach.hourlyRate) && `${formatPrice(coach.hourlyRate)}/hr`]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </ResultRow>
                    );
                  })}
                </div>
              </section>
            )}

            {!loading && (results.routes?.length ?? 0) > 0 && (
              <section className="mb-6">
                <SectionHeader
                  title="Routes"
                  showSeeAll={(results.routes?.length ?? 0) > 3}
                  onSeeAll={() => setExpandedSection(expandedSection === "routes" ? null : "routes")}
                  textPrimary={t.textPrimary}
                  textSecondary={t.textSecondary}
                />
                <div className="space-y-2">
                  {results.routes!.slice(0, renderLimit("routes", results.routes!.length)).map((route) => (
                    <ResultRow
                      key={route.id}
                      cardBg={t.inputBg}
                      border={t.border}
                      onClick={() => navigateTo(ROUTES.event(route.id))}
                    >
                      <div
                        className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                        style={{ background: iconTileBg }}
                      >
                        <MapPin size={20} style={{ color: t.textSecondary }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold truncate" style={{ color: t.textPrimary }}>
                          {route.title}
                        </p>
                        <p className="text-[12px] truncate" style={{ color: t.textSecondary }}>
                          {[route.sport, route.location, formatEventTime(route.startsAt)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </ResultRow>
                  ))}
                </div>
              </section>
            )}

            {!loading && results.places.length > 0 && (
              <section className="mb-6">
                <SectionHeader
                  title="Venues"
                  showSeeAll={results.places.length > 3}
                  onSeeAll={() => setExpandedSection(expandedSection === "places" ? null : "places")}
                  textPrimary={t.textPrimary}
                  textSecondary={t.textSecondary}
                />
                <div className="space-y-2">
                  {results.places.slice(0, renderLimit("places", results.places.length)).map((place) => (
                    <ResultRow
                      key={place.id}
                      cardBg={t.inputBg}
                      border={t.border}
                      onClick={() => navigateTo(ROUTES.place(place.id))}
                    >
                      <div
                        className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                        style={{ background: iconTileBg }}
                      >
                        <MapPin size={20} style={{ color: t.textSecondary }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold truncate" style={{ color: t.textPrimary }}>
                          {place.name}
                        </p>
                        <p className="text-[12px] truncate" style={{ color: t.textSecondary }}>
                          {[place.city, place.sports?.[0]].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </ResultRow>
                  ))}
                </div>
              </section>
            )}

            {!loading && results.products.length > 0 && (
              <section className="mb-6">
                <SectionHeader
                  title="Marketplace"
                  showSeeAll={results.products.length > 3}
                  onSeeAll={() => setExpandedSection(expandedSection === "products" ? null : "products")}
                  textPrimary={t.textPrimary}
                  textSecondary={t.textSecondary}
                />
                <div className="grid grid-cols-2 gap-3">
                  {results.products.slice(0, renderLimit("products", results.products.length)).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => navigateTo(ROUTES.product(product.id))}
                      className="rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform"
                      style={{ background: t.inputBg, border: `1px solid ${t.border}` }}
                    >
                      <div className="aspect-square" style={{ background: iconTileBg }}>
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 text-[13px] font-semibold" style={{ color: t.textPrimary }}>
                          {product.name}
                        </p>
                        <p className="text-[14px] font-bold mt-1" style={{ color: t.textPrimary }}>
                          {formatPrice(product.price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
