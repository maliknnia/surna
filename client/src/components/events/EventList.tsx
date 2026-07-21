import { useEffect, useRef, useState, useMemo } from "react";
import { useEventsList } from "@/hooks/useEvents";
import EventCard from "./EventCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { mapPath } from "@/lib/mapNavigation";
import { useQuery } from "@tanstack/react-query";
import StreamViewer from "@/components/StreamViewer";
import type { StreamSession } from "@shared/schema";
import { flags } from "@/config/flags";
import FilterBottomSheet from "@/components/FilterBottomSheet";
import { useTheme } from "@/contexts/ThemeContext";
import { mergeWithDemoEvents } from "@/lib/demoEvents";
import { DiscoverySectionHeading } from "@/components/cards/DiscoverySectionHeading";

type DateGroup = "live" | "today" | "tomorrow" | "this-week" | "later";

const GROUP_META: Record<DateGroup, { label: string }> = {
  live: { label: "Happening now" },
  today: { label: "Today" },
  tomorrow: { label: "Tomorrow" },
  "this-week": { label: "This week" },
  later: { label: "Coming up" },
};

function getDateGroup(dateStr: string): DateGroup {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();

  if (diff < 0 && diff > -1000 * 60 * 60 * 3) return "live";

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const d = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  if (d.getTime() === today.getTime()) return "today";
  if (d.getTime() === tomorrow.getTime()) return "tomorrow";
  if (d <= weekEnd) return "this-week";
  return "later";
}

export default function EventList({
  maxItems,
  externalTimeWindow,
  externalCategory,
  externalSearch,
  hideFilterBar = false,
}: {
  maxItems?: number;
  externalTimeWindow?: "today" | "week" | "all";
  externalCategory?: string;
  externalSearch?: string;
  hideFilterBar?: boolean;
} = {}) {
  const [, setLocation] = useLocation();
  const [q, setQ] = useState(externalSearch ?? "");
  const [category, setCategory] = useState(externalCategory ?? "all");
  const [timeWindow, setTimeWindow] = useState<"today" | "week" | "all">(externalTimeWindow ?? "all");
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [selectedStream, setSelectedStream] = useState<StreamSession | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (externalTimeWindow !== undefined) setTimeWindow(externalTimeWindow);
  }, [externalTimeWindow]);

  useEffect(() => {
    if (externalCategory !== undefined) setCategory(externalCategory);
  }, [externalCategory]);

  useEffect(() => {
    if (externalSearch !== undefined) setQ(externalSearch);
  }, [externalSearch]);

  const { data: activeStreams } = useQuery<{ stream: StreamSession; streamer: any }[]>({
    queryKey: ['/api/streams/active'],
    enabled: flags.liveStreaming,
    refetchInterval: 10000,
  });
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => {}
      );
    }
  }, []);
  
  const dateFilter = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (timeWindow) {
      case "today":
        return { from: today.toISOString() };
      case "week":
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        return { from: today.toISOString(), to: weekEnd.toISOString() };
      default:
        return { from: new Date().toISOString() };
    }
  }, [timeWindow]);
  
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useEventsList({
    ...dateFilter,
    q,
    category: category === "all" ? undefined : category,
    lat: userLocation?.lat,
    lng: userLocation?.lng,
    limit: 12,
  });
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sentinel.current || maxItems) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }
      },
      { rootMargin: "400px" }
    );
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, maxItems]);

  const apiItems = data?.pages.flatMap((p: any) => p.items) ?? [];
  const hasActiveFilters =
    Boolean(q.trim()) || category !== "all" || timeWindow !== "all";
  const allItems = mergeWithDemoEvents(apiItems, {
    skipDemo: hasActiveFilters,
    fallback: !hasActiveFilters,
  });
  const items = maxItems ? allItems.slice(0, maxItems) : allItems;

  const filterOptions = [
    {
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All" },
        { value: "sport", label: "Sport" },
        { value: "social", label: "Social" },
        { value: "community", label: "Community" },
      ],
      value: category,
      onChange: setCategory,
    },
    {
      key: "timeWindow",
      label: "Time",
      options: [
        { value: "all", label: "All Time" },
        { value: "today", label: "Today" },
        { value: "week", label: "This Week" },
      ],
      value: timeWindow,
      onChange: (v: string) => setTimeWindow(v as "today" | "week" | "all"),
    },
  ];

  const textSecondary = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";

  const groupedItems = useMemo(() => {
    if (items.length === 0) return [];
    const ORDER: DateGroup[] = ["live", "today", "tomorrow", "this-week", "later"];
    const groups: Record<DateGroup, any[]> = { live: [], today: [], tomorrow: [], "this-week": [], later: [] };
    items.forEach((ev) => {
      const dateStr = ev.starts_at || ev.startDate;
      if (!dateStr) {
        groups.later.push(ev);
        return;
      }
      const group = getDateGroup(dateStr);
      groups[group].push(ev);
    });
    return ORDER.filter((g) => groups[g].length > 0).map((g) => ({ group: g, items: groups[g] }));
  }, [items]);

  return (
    <div>
      {selectedStream && (
        <StreamViewer stream={selectedStream} onClose={() => setSelectedStream(null)} />
      )}

      {flags.liveStreaming && activeStreams && activeStreams.length > 0 && (
        <div className="mb-4 space-y-2">
          {activeStreams.map(({ stream, streamer }) => (
            <Card
              key={stream.id}
              className="bg-transparent border-none cursor-pointer transition-all duration-200 rounded-lg"
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surna-surface)'}
              onMouseLeave={(e) => e.currentTarget.style.background = ''}
              onClick={() => setSelectedStream(stream)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-red-500 text-foreground text-xs">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></span>
                          LIVE
                        </span>
                      </Badge>
                      <span className="text-xs text-token-text-muted">{stream.title}</span>
                    </div>
                    {stream.description && (
                      <p className="text-xs text-token-text-secondary line-clamp-1">{stream.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-token-text-muted">
                      <span>{streamer.displayName || streamer.username || 'Unknown'}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{stream.viewerCount || 0} viewers</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!hideFilterBar && (
        <div className="sticky top-0 z-20 pb-3 mb-3 flex items-center justify-between" style={{ background: 'var(--surna-base)' }}>
          <h3 className="section-label" style={{ margin: 0 }}>Events</h3>
          <FilterBottomSheet
            filters={filterOptions}
            searchValue={q}
            onSearchChange={setQ}
            searchPlaceholder="Search events..."
          />
        </div>
      )}

      {status === "pending" ? (
        <div className="discovery-card-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse playlist-card rounded-[28px]" style={{ background: isDark ? '#282828' : '#f0f0f0', height: 140 }} />
          ))}
        </div>
      ) : null}

      {status === "error" && items.length === 0 ? (
        <div className="p-6 text-center rounded-lg bg-transparent border" style={{ borderColor: 'var(--surna-border)' }}>
          <h3 className="text-lg font-semibold mb-1 text-token-text">Couldn't load events</h3>
          <p className="text-sm text-token-text-secondary">Please try refreshing the page.</p>
        </div>
      ) : null}

      {status === "success" && groupedItems.length === 0 ? (
        <div className="py-12 px-6 text-center rounded-2xl border" style={{ borderColor: 'var(--surna-border)' }}>
          <p className="text-4xl mb-3" aria-hidden>📅</p>
          <h3 className="text-lg font-semibold mb-1 text-token-text">No events match</h3>
          <p className="text-sm text-token-text-secondary mb-4">
            {hasActiveFilters
              ? "Try clearing search or filters, or check back later."
              : "Nothing scheduled nearby yet. Explore the map or create an event."}
          </p>
          <button
            type="button"
            onClick={() => setLocation(mapPath())}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold active:scale-95"
            style={{ background: 'var(--surna-elevated)', color: 'var(--surna-text)' }}
          >
            <MapPin size={14} />
            Explore on map
          </button>
        </div>
      ) : null}

      {groupedItems.length > 0 && (
        <div>
          {groupedItems.map(({ group, items: groupEvs }, groupIndex) => {
            const meta = GROUP_META[group as DateGroup];
            const sectionTitle =
              groupIndex === 0
                ? "For you"
                : groupIndex === 1
                  ? "Near you"
                  : meta.label;
            return (
              <div key={group}>
                <DiscoverySectionHeading>
                  {sectionTitle}
                </DiscoverySectionHeading>
                <div className="discovery-card-list">
                  {groupEvs.map((ev) => (
                    <EventCard key={ev.id} ev={ev} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div ref={sentinel} />
      
      {isFetchingNextPage && status === "success" ? (
        <div className="py-4 text-center">
          <div className="inline-flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-full animate-spin"></div>
            <span className="text-token-text-secondary">Loading more...</span>
          </div>
        </div>
      ) : null}

      {!hasNextPage && items.length > 0 ? (
        <div className="py-4 text-center text-sm text-token-text-muted">
          <p>You've seen all events.</p>
        </div>
      ) : null}
    </div>
  );
}
