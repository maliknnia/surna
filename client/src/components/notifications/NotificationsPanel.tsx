import { useCallback, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  filterNotifications,
  groupByTimeGroup,
  mergeNotificationFeed,
  normalizeNotificationFeed,
  NOTIF_FILTER_TABS,
  resolveNotificationRoute,
  resolveNotificationMapRoute,
  type NotifAction,
  type NotifCategory,
  type NotifTimeGroup,
  type SurnaNotification,
} from "@/lib/notifications";
import { ROUTES } from "@/navigation";
import { mapPath } from "@/lib/mapNavigation";
import { NotificationRow } from "./NotificationRow";

type NotificationsPanelProps = {
  compact?: boolean;
  onSeeAll?: () => void;
  peekCount?: number;
};

export default function NotificationsPanel({
  compact = false,
  onSeeAll,
  peekCount,
}: NotificationsPanelProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<NotifCategory>("all");
  const [search, setSearch] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [localRead, setLocalRead] = useState<Set<string>>(() => new Set());
  const [expandedSections, setExpandedSections] = useState<Set<NotifTimeGroup>>(
    () => new Set<NotifTimeGroup>(["priority", "today", "yesterday", "earlier"]),
  );

  const { data: feedRaw, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=40", { credentials: "include" });
      if (!res.ok) return { items: [] };
      return res.json();
    },
    staleTime: 30_000,
  });

  const baseNotifs = useMemo(
    () => mergeNotificationFeed(normalizeNotificationFeed(feedRaw)),
    [feedRaw],
  );

  const notifs = useMemo(() => {
    return baseNotifs
      .filter((n) => !dismissed.has(n.id))
      .map((n) => ({
        ...n,
        read: n.read || localRead.has(n.id),
      }));
  }, [baseNotifs, dismissed, localRead]);

  const filtered = useMemo(
    () => filterNotifications(notifs, activeFilter, search),
    [notifs, activeFilter, search],
  );

  const displayed = useMemo(() => {
    if (peekCount === undefined) return filtered;
    return [...filtered]
      .sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        const order = { priority: 0, today: 1, yesterday: 2, earlier: 3 };
        return order[a.timeGroup] - order[b.timeGroup];
      })
      .slice(0, peekCount);
  }, [filtered, peekCount]);
  const unreadCount = notifs.filter((n) => !n.read).length;
  const priorityCount = notifs.filter((n) => !n.read && n.timeGroup === "priority").length;
  const usingDemo = baseNotifs.every((n) => n.source === "demo");

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markRead = useCallback(
    (id: string) => {
      setLocalRead((prev) => new Set(prev).add(id));
      const item = notifs.find((n) => n.id === id);
      if (item?.source === "api") markReadMutation.mutate(id);
    },
    [notifs, markReadMutation],
  );

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    markRead(id);
  }, [markRead]);

  const markAllRead = useCallback(() => {
    setLocalRead(new Set(notifs.map((n) => n.id)));
    if (!usingDemo) markAllMutation.mutate();
  }, [notifs, usingDemo, markAllMutation]);

  const handleAction = useCallback(
    (notif: SurnaNotification, action: NotifAction) => {
      markRead(notif.id);
      const label = action.label.toLowerCase();
      if (label === "decline") return;
      if (label === "map" || label.includes("on map")) {
        navigate(resolveNotificationMapRoute(notif));
        return;
      }
      if (action.route) {
        navigate(action.route);
        return;
      }
      const route = resolveNotificationRoute(notif);
      if (route) navigate(route);
    },
    [markRead, navigate],
  );

  const handleOpen = useCallback(
    (notif: SurnaNotification) => {
      markRead(notif.id);
      const route = resolveNotificationRoute(notif);
      if (route) navigate(route);
    },
    [markRead, navigate],
  );

  const toggleSection = (section: NotifTimeGroup) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const grouped = groupByTimeGroup(displayed);

  if (!isLoading && displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--surna-bg-highlight)" }}
        >
          <Sparkles size={28} style={{ color: "var(--surna-text-muted)" }} />
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: "var(--surna-text)" }}>
            {search ? "No matches" : "You're all caught up"}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--surna-text-secondary)" }}>
            {search
              ? "Try a different search or clear filters."
              : "New activity from your crew will show up here."}
          </p>
        </div>
        {!search && (
          <button
            type="button"
            onClick={() => navigate(mapPath())}
            className="rounded-full px-5 py-2.5 text-sm font-bold active:scale-95 transition-transform"
            style={{ background: "var(--surna-text)", color: "var(--surna-base)" }}
          >
            Explore nearby
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "var(--surna-bg)" }}>
      {!compact && (
        <>
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Bell size={18} style={{ color: "var(--surna-text)" }} />
              <span className="text-base font-bold truncate" style={{ color: "var(--surna-text)" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: "var(--surna-story-ring, #DC2626)" }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold active:scale-95"
                  style={{ color: "var(--surna-accent)" }}
                >
                  <CheckCheck size={14} />
                  Read all
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(ROUTES.settings)}
                aria-label="Notification settings"
                className="flex h-8 w-8 items-center justify-center rounded-full active:scale-95"
                style={{ background: "var(--surna-bg-highlight)" }}
              >
                <Settings size={15} style={{ color: "var(--surna-text-secondary)" }} />
              </button>
            </div>
          </div>

          {priorityCount > 0 && (
            <div
              className="mx-4 mb-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold"
              style={{
                background: "var(--surna-accent-soft)",
                color: "var(--surna-text)",
                border: "1px solid var(--surna-border)",
              }}
            >
              {priorityCount} need{priorityCount === 1 ? "s" : ""} your attention
            </div>
          )}

          <div className="relative mx-4 mb-3">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--surna-text-muted)" }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications…"
              className="w-full rounded-xl py-2.5 pl-9 pr-9 text-sm outline-none"
              style={{
                background: "var(--surna-bg-highlight)",
                color: "var(--surna-text)",
                border: "1px solid var(--surna-border)",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: "var(--surna-bg-press)" }}
              >
                <X size={12} style={{ color: "var(--surna-text-muted)" }} />
              </button>
            )}
          </div>

          <div
            className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {NOTIF_FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.value;
              const count =
                tab.value === "all"
                  ? unreadCount
                  : tab.value === "unread"
                    ? unreadCount
                    : notifs.filter((n) => !n.read && n.category === tab.value).length;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveFilter(tab.value)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors active:scale-95"
                  style={{
                    background: isActive ? "var(--surna-text)" : "var(--surna-bg-highlight)",
                    color: isActive ? "var(--surna-base)" : "var(--surna-text-secondary)",
                  }}
                >
                  {tab.label}
                  {count > 0 && tab.value !== "unread" && (
                    <span
                      className="min-w-[16px] rounded-full px-1 text-[9px] font-bold text-white text-center"
                      style={{
                        background: isActive ? "rgba(255,255,255,0.25)" : "var(--surna-story-ring, #DC2626)",
                      }}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {usingDemo && (
            <p className="px-4 pb-2 text-[11px]" style={{ color: "var(--surna-text-muted)" }}>
              Showing sample alerts — your live feed will appear here.
            </p>
          )}
        </>
      )}

      <div className={compact ? "px-3 pb-2" : "px-3 pb-4"}>
        {isLoading && (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[72px] rounded-2xl animate-pulse"
                style={{ background: "var(--surna-bg-highlight)" }}
              />
            ))}
          </div>
        )}

        {!isLoading &&
          grouped.map((group) => {
            const isExpanded = expandedSections.has(group.key) || compact;
            const isPriority = group.key === "priority";
            return (
              <div key={group.key} className="mb-3">
                {!compact && (
                  <button
                    type="button"
                    onClick={() => toggleSection(group.key)}
                    className="mb-1 flex w-full items-center justify-between px-1 py-1"
                  >
                    <span
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{
                        color: isPriority ? "var(--surna-story-ring, #DC2626)" : "var(--surna-text-muted)",
                      }}
                    >
                      {group.label}
                    </span>
                    <div className="flex items-center gap-1.5" style={{ color: "var(--surna-text-muted)" }}>
                      <span className="text-[10px]">{group.items.length}</span>
                      <ChevronDown
                        size={13}
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : undefined,
                          transition: "transform 0.2s",
                        }}
                      />
                    </div>
                  </button>
                )}

                {isExpanded &&
                  group.items.map((notif) => (
                    <NotificationRow
                      key={notif.id}
                      notif={notif}
                      onRead={markRead}
                      onDismiss={dismiss}
                      onAction={handleAction}
                      onOpen={handleOpen}
                    />
                  ))}
              </div>
            );
          })}

        {compact && onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-[13px] font-bold active:scale-[0.98]"
            style={{
              background: "var(--surna-bg-highlight)",
              color: "var(--surna-text)",
              border: "1px solid var(--surna-border)",
            }}
          >
            See all
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Badge for nav icons */
export function NotifDotBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
      style={{ background: "var(--surna-story-ring, #DC2626)" }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
