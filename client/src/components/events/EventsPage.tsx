import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import EventList from "./EventList";
import { YourEventsStrip, EventDiscoveryCircles } from "./YourEventsStrip";
import { useEventsList } from "@/hooks/useEvents";
import { createHubPath } from "@/lib/createHub";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Video, MapPin, Users, Clock, CalendarDays, Map } from "lucide-react";
import { mapPath } from "@/lib/mapNavigation";
import { markNavReturn, mobilePanelReturnPath, useSmartBack } from "@/lib/navigation";
import { PanelBackButton } from "@/components/panels/PanelBackButton";
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
import { flags } from "@/config/flags";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

const TIME_FILTERS: { key: "all" | "today" | "week"; label: string; emoji: string }[] = [
  { key: "all", label: "All", emoji: "📅" },
  { key: "today", label: "Today", emoji: "⚡" },
  { key: "week", label: "This Week", emoji: "🗓️" },
];

const SPORT_CATS = [
  { key: "all", label: "All", emoji: "🏆" },
  { key: "sport", label: "Sport", emoji: "⚽" },
  { key: "rugby", label: "Rugby", emoji: "🏉" },
  { key: "cricket", label: "Cricket", emoji: "🏏" },
  { key: "gaa", label: "GAA", emoji: "🏐" },
  { key: "hurling", label: "Hurling", emoji: "🥎" },
  { key: "social", label: "Social", emoji: "🤝" },
  { key: "community", label: "Community", emoji: "🌟" },
];

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const evDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = evDay.getTime() - today.getTime();
  const days = diff / (1000 * 60 * 60 * 24);

  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  if (days === 0) return `Today · ${time}`;
  if (days === 1) return `Tomorrow · ${time}`;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · " + time;
}

function FeaturedEventBanner({ isDark }: { isDark: boolean }) {
  const { data } = useQuery<any>({
    queryKey: ["/api/events/featured"],
    queryFn: async () => {
      const from = new Date().toISOString();
      const res = await fetch(`/api/events?from=${from}&limit=1`, { credentials: "include" });
      if (!res.ok) return null;
      const json = await res.json();
      const items = json.items || json;
      return Array.isArray(items) && items.length > 0 ? items[0] : null;
    },
    staleTime: 60_000,
  });
  const [, setLocation] = useLocation();

  if (!data) return null;

  const ev = data;
  const coverUrl = ev.cover_url || ev.cover_medium_url || ev.imageUrl;
  const dateStr = ev.starts_at || ev.startDate;
  const goingCount = ev.going_count || 0;
  const location = ev.location || ev.venueName || "";

  return (
    <div
      className="relative overflow-hidden cursor-pointer active:scale-[0.99] transition-transform duration-200"
      style={{
        borderRadius: 20,
        minHeight: 180,
        marginBottom: 4,
        background: isDark
          ? "linear-gradient(135deg, var(--surna-elevated) 0%, rgba(0,0,0,0.85) 100%)"
          : "linear-gradient(135deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.12) 100%)",
        overflow: "hidden",
        position: "relative",
      }}
      onClick={() => setLocation(`/events/${ev.id}`)}
    >
      {coverUrl && (
        <>
          <img
            src={coverUrl}
            alt={ev.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "blur(1px) saturate(1.2)", transform: "scale(1.05)", opacity: 0.4 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.7) 100%)" }} />
        </>
      )}

      <div className="absolute top-3 left-3">
        <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full"
          style={{ background: "rgba(255,59,48,0.9)", color: "#fff" }}>
          ⚡ Featured
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h2 className="text-foreground text-[16px] font-black leading-tight mb-2 line-clamp-2 drop-shadow-sm">{ev.title}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {dateStr && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-foreground/90">
              <Clock size={12} />
              {formatEventDate(dateStr)}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-foreground/90">
              <MapPin size={12} />
              {location}
            </span>
          )}
          {goingCount > 0 && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-foreground/90">
              <Users size={12} />
              {goingCount} going
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventsPage({
  compact = false,
  maxEvents,
  onPanelBack,
  panelActive = true,
}: {
  compact?: boolean;
  maxEvents?: number;
  onPanelBack?: () => void;
  panelActive?: boolean;
}) {
  const [, setLocation] = useLocation();
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [streamDescription, setStreamDescription] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const goBack = useSmartBack({
    onPanelBack: compact ? onPanelBack : undefined,
    fallback: "/",
  });
  const handleRefresh = async () => {
    setEventsRefreshKey((k) => k + 1);
  };
  const { isRefreshing, pullDistance, touchHandlers } = usePullToRefresh(handleRefresh);

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: discoverData } = useEventsList({ limit: 12 });
  const discoverEvents = discoverData?.pages?.flatMap((p) => p.items) ?? [];
  const userSport = (user as { sport?: string; primarySport?: string })?.sport
    ?? (user as { primarySport?: string })?.primarySport
    ?? null;

  const createStreamMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; streamUrl: string }) => {
      const res = await apiRequest("POST", "/api/streams/create", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Stream Created', description: 'Your live stream is now active!' });
      setShowGoLiveModal(false);
      setStreamTitle(""); setStreamDescription(""); setStreamUrl("");
      queryClient.invalidateQueries({ queryKey: ['/api/streams/active'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create stream. Please try again.', variant: 'destructive' });
    },
  });

  const handleGoLive = () => {
    if (!streamTitle.trim() || !streamUrl.trim()) {
      toast({ title: 'Missing Information', description: 'Please provide a title and stream URL.', variant: 'destructive' });
      return;
    }
    createStreamMutation.mutate({ title: streamTitle.trim(), description: streamDescription.trim(), streamUrl: streamUrl.trim() });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("live") === "1") {
      setShowGoLiveModal(true);
      params.delete("live");
      const next = params.toString();
      window.history.replaceState({}, "", next ? `${window.location.pathname}?${next}` : window.location.pathname);
    }
  }, []);

  const tEarly = getPanelTheme();
  const chipActiveBgEarly = tEarly.chipActiveBg;
  const chipActiveTextEarly = tEarly.chipActiveText;
  const chipBgEarly = tEarly.chipBg;
  const chipTextEarly = tEarly.chipText;
  const inputBgEarly = tEarly.inputBg;
  const textPrimaryEarly = tEarly.textPrimary;

  const toolsStyle = panelToolsStyle(isDark);
  const { onToggleSearch, onToggleFilter } = usePanelToolToggles(
    setSearchOpen,
    setFilterOpen,
    searchOpen,
    filterOpen,
  );
  usePanelToolsLifecycle(panelActive, setSearchOpen, setFilterOpen);
  const hasActiveFilter = timeFilter !== "all" || categoryFilter !== "all";
  const hasActiveSearch = searchQuery.length > 0;

  if (compact) {
    return (
      <div className="max-w-full mx-auto min-h-full pb-4" style={{ background: "var(--surna-base)" }} {...touchHandlers}>
        {panelActive && (
          <PanelFilterSheet
            style={toolsStyle}
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            title="Filters"
          >
            <FeatureFilterChips
              isDark={isDark}
              chipGroups={[
                {
                  id: "when",
                  label: "When",
                  chips: TIME_FILTERS.map((tf) => ({ key: tf.key, label: tf.label, emoji: tf.emoji })),
                  value: timeFilter,
                  onChange: (key) => setTimeFilter(key as typeof timeFilter),
                },
                {
                  id: "category",
                  label: "Category",
                  chips: SPORT_CATS.map((cat) => ({ key: cat.key, label: cat.label, emoji: cat.emoji })),
                  value: categoryFilter,
                  onChange: setCategoryFilter,
                },
              ]}
            />
          </PanelFilterSheet>
        )}
        <div
          className={compact ? undefined : "sticky top-0 z-50 backdrop-blur-xl"}
          style={
            compact
              ? { background: "var(--surna-base)" }
              : { background: "var(--surna-base)", borderBottom: "1px solid var(--surna-border, rgba(255,255,255,0.06))" }
          }
        >
          <div className={`flex items-center gap-3 px-4 ${compact ? "pt-2 pb-2" : "pt-3 pb-2"}`}>
            {onPanelBack ? (
              <PanelBackButton onClick={goBack} background={inputBgEarly} color={textPrimaryEarly} />
            ) : null}
            <h1 className="text-[18px] font-bold flex-1" style={{ color: "var(--surna-text)" }}>Events</h1>
            <button
              type="button"
              onClick={() => {
                if (compact) markNavReturn(mobilePanelReturnPath("events"));
                setLocation(mapPath());
              }}
              className="h-8 w-8 rounded-full flex items-center justify-center active:scale-95"
              style={{ background: "var(--surna-elevated, rgba(255,255,255,0.08))" }}
              aria-label="Open map"
              title="Map"
            >
              <Map size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (compact) markNavReturn(mobilePanelReturnPath("events"));
                setLocation("/calendar");
              }}
              className="h-8 w-8 rounded-full flex items-center justify-center active:scale-95"
              style={{ background: "var(--surna-elevated, rgba(255,255,255,0.08))" }}
              aria-label="Open calendar"
              title="Calendar"
            >
              <CalendarDays size={16} />
            </button>
            <button
              onClick={() => {
                if (compact) markNavReturn(mobilePanelReturnPath("events"));
                setLocation(createHubPath("event"));
              }}
              className="h-8 px-4 rounded-full text-[12px] font-semibold flex items-center gap-1.5 active:scale-[0.96] transition-transform"
              style={{ background: tEarly.chipActiveBg, color: tEarly.chipActiveText }}
              data-testid="create-event-button"
            >
              <Plus className="w-3 h-3" />
              Create
            </button>
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
              placeholder="Search events…"
            />
          )}
        </div>
        <div className="px-4 pt-3">
          <YourEventsStrip onEventClick={(eventId) => setLocation(`/events/${eventId}`)} />
          <EventList
            key={`events-compact-${eventsRefreshKey}`}
            maxItems={maxEvents}
            externalTimeWindow={timeFilter}
            externalCategory={categoryFilter}
            externalSearch={searchQuery}
            hideFilterBar
          />
        </div>
      </div>
    );
  }

  const t = getPanelTheme();
  const pageBg = t.pageBg;
  const headerBg = t.headerBg;
  const textPrimary = t.textPrimary;
  const inputBg = t.inputBg;
  const borderColor = t.border;
  const chipActiveBg = t.chipActiveBg;
  const chipActiveText = t.chipActiveText;
  const chipBg = t.chipBg;
  const chipText = t.chipText;

  return (
    <div className="min-h-screen pb-24" style={{ background: pageBg }} {...touchHandlers}>
      {pullDistance > 0 && (
        <div className="flex justify-center pt-2">
          <span className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }}>
            {isRefreshing ? "Refreshing..." : "Pull to refresh"}
          </span>
        </div>
      )}
      <div className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-3">
            <PanelBackButton onClick={goBack} background={inputBg} color={textPrimary} />
            <h1 className="text-[18px] font-bold flex-1" style={{ color: textPrimary }}>Events</h1>
            <button
              type="button"
              onClick={() => setLocation(mapPath())}
              className="h-8 w-8 rounded-full flex items-center justify-center active:scale-95"
              style={{ background: inputBg }}
              aria-label="Open map"
            >
              <Map size={16} style={{ color: textPrimary }} />
            </button>
            <button
              type="button"
              onClick={() => setLocation("/calendar")}
              className="h-8 w-8 rounded-full flex items-center justify-center active:scale-95"
              style={{ background: inputBg }}
              aria-label="Open schedule"
            >
              <CalendarDays size={16} style={{ color: textPrimary }} />
            </button>
            {flags.liveStreaming && user && (
              <Dialog open={showGoLiveModal} onOpenChange={setShowGoLiveModal}>
                <DialogTrigger asChild>
                  <button
                    className="h-8 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
                    style={{ background: "color-mix(in srgb, var(--surna-ios-red) 15%, transparent)", color: "var(--surna-ios-red)" }}
                    data-testid="button-go-live"
                  >
                    <Video size={14} />
                    Live
                  </button>
                </DialogTrigger>
                <DialogContent style={{ background: isDark ? "var(--surna-elevated)" : "var(--surna-bg-elevated)", borderColor }} className="border rounded-2xl">
                  <DialogHeader>
                    <DialogTitle style={{ color: textPrimary }}>Start Live Stream</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="stream-title" style={{ color: textPrimary }}>Stream Title *</Label>
                      <Input id="stream-title" value={streamTitle} onChange={(e) => setStreamTitle(e.target.value)} placeholder="Enter stream title" className="mt-1 border" style={{ background: inputBg, borderColor, color: textPrimary }} data-testid="input-stream-title" />
                    </div>
                    <div>
                      <Label htmlFor="stream-description" style={{ color: textPrimary }}>Description</Label>
                      <Textarea id="stream-description" value={streamDescription} onChange={(e) => setStreamDescription(e.target.value)} placeholder="Describe your stream" className="mt-1 border" style={{ background: inputBg, borderColor, color: textPrimary }} rows={3} data-testid="input-stream-description" />
                    </div>
                    <div>
                      <Label htmlFor="stream-url" style={{ color: textPrimary }}>Stream URL *</Label>
                      <Input id="stream-url" value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder="https://youtube.com/embed/..." className="mt-1 border" style={{ background: inputBg, borderColor, color: textPrimary }} data-testid="input-stream-url" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowGoLiveModal(false)} className="px-4 py-2 rounded-full text-[13px] font-medium" style={{ color: textPrimary }} data-testid="button-cancel-stream">Cancel</button>
                      <button onClick={handleGoLive} disabled={createStreamMutation.isPending} className="px-5 py-2 rounded-full text-[13px] font-bold active:scale-95" style={{ background: chipActiveBg, color: chipActiveText }} data-testid="button-start-stream">
                        {createStreamMutation.isPending ? 'Creating...' : 'Start Stream'}
                      </button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <button
              onClick={() => setLocation(createHubPath("event"))}
              className="h-8 px-4 rounded-full text-[12px] font-semibold flex items-center gap-1.5 active:scale-[0.96] transition-transform"
              style={{ background: chipActiveBg, color: chipActiveText }}
              data-testid="create-event-button"
            >
              <Plus size={14} />
              Create
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TIME_FILTERS.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeFilter(tf.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all active:scale-95"
              style={{
                background: timeFilter === tf.key ? chipActiveBg : chipBg,
                color: timeFilter === tf.key ? chipActiveText : chipText,
              }}
            >
              <span>{tf.emoji}</span>
              <span>{tf.label}</span>
            </button>
          ))}
          <div className="w-px self-stretch mx-1" style={{ background: borderColor }} />
          {SPORT_CATS.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all active:scale-95"
              style={{
                background: categoryFilter === cat.key ? chipActiveBg : chipBg,
                color: categoryFilter === cat.key ? chipActiveText : chipText,
              }}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <YourEventsStrip onEventClick={(eventId) => setLocation(`/events/${eventId}`)} />
        <EventDiscoveryCircles
          events={discoverEvents}
          userSport={userSport}
          onEventClick={(eventId) => setLocation(`/events/${eventId}`)}
          onBrowse={() => setSearchOpen(true)}
        />
        <FeaturedEventBanner isDark={isDark} />
        <EventList
          key={`events-list-${eventsRefreshKey}`}
          externalTimeWindow={timeFilter}
          externalCategory={categoryFilter}
          hideFilterBar={true}
        />
      </div>
    </div>
  );
}
