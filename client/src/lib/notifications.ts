import { ROUTES } from "@/navigation";
import { entityPath, mapPath, type MapEntityKind } from "@/lib/mapNavigation";

export type NotifCategory = "all" | "unread" | "mentions" | "teams" | "events" | "messages" | "activity";
export type NotifTimeGroup = "priority" | "today" | "yesterday" | "earlier";
export type NotifAccent = "urgent" | "social" | "live";

export type NotifAction = {
  label: string;
  variant: "primary" | "secondary";
  route?: string;
};

export type SurnaNotification = {
  id: string;
  source: "api" | "demo";
  type: string;
  category: Exclude<NotifCategory, "all" | "unread">;
  timeGroup: NotifTimeGroup;
  accent: NotifAccent;
  avatar: string;
  avatarColor: string;
  avatarEmoji?: string;
  title: string;
  body: string;
  time: string;
  createdAt: string;
  read: boolean;
  grouped?: boolean;
  groupCount?: number;
  actions?: NotifAction[];
  route?: string;
  entityKind?: MapEntityKind;
  entityId?: string;
};

export type ApiNotificationRow = {
  id: string;
  userId?: string;
  actorId?: string | null;
  type: string;
  postId?: string | null;
  commentId?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
  title?: string;
  body?: string;
};

const ACTIONABLE_TYPES = new Set([
  "follow_request",
  "team_invite",
  "team_join_request",
  "message",
  "mention",
  "challenge",
]);

export const NOTIF_FILTER_TABS: { value: NotifCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "mentions", label: "Mentions" },
  { value: "teams", label: "Teams" },
  { value: "events", label: "Events" },
  { value: "messages", label: "Messages" },
  { value: "activity", label: "Activity" },
];

export const TIME_GROUP_LABELS: Record<NotifTimeGroup, string> = {
  priority: "Needs attention",
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

export const DEMO_NOTIFICATIONS: SurnaNotification[] = [
  {
    id: "demo-p1",
    source: "demo",
    type: "follow_request",
    category: "activity",
    timeGroup: "priority",
    accent: "urgent",
    avatar: "AJ",
    avatarColor: "#DC2626",
    title: "Follow request",
    body: "alex_hoops wants to follow you",
    time: "now",
    createdAt: new Date().toISOString(),
    read: false,
    actions: [
      { label: "Accept", variant: "primary", route: ROUTES.discoverPeople },
      { label: "Decline", variant: "secondary" },
    ],
    route: ROUTES.discoverPeople,
  },
  {
    id: "demo-p2",
    source: "demo",
    type: "team_invite",
    category: "teams",
    timeGroup: "priority",
    accent: "urgent",
    avatar: "EB",
    avatarColor: "#0A84FF",
    title: "Team invite",
    body: "Eastside Ballers invited you to join their squad",
    time: "3m",
    createdAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    read: false,
    actions: [
      { label: "Join", variant: "primary", route: entityPath("team", "dt1") },
      { label: "View", variant: "secondary", route: entityPath("team", "dt1") },
    ],
    route: entityPath("team", "dt1"),
  },
  {
    id: "demo-p3",
    source: "demo",
    type: "message",
    category: "messages",
    timeGroup: "priority",
    accent: "urgent",
    avatar: "CR",
    avatarColor: "#FF9F0A",
    title: "New message",
    body: "Coach Rivera: Great session today — review the tape tomorrow",
    time: "12m",
    createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    read: false,
    actions: [{ label: "Reply", variant: "primary", route: ROUTES.messages }],
    route: ROUTES.messages,
  },
  {
    id: "demo-t1",
    source: "demo",
    type: "like_grouped",
    category: "activity",
    timeGroup: "today",
    accent: "social",
    avatar: "12",
    avatarColor: "#FF2D55",
    title: "Likes",
    body: "12 people liked your basketball highlight",
    time: "1h",
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    read: false,
    grouped: true,
    groupCount: 12,
    actions: [{ label: "View post", variant: "secondary", route: ROUTES.feed }],
    route: ROUTES.feed,
  },
  {
    id: "demo-t2",
    source: "demo",
    type: "event_live",
    category: "events",
    timeGroup: "today",
    accent: "live",
    avatar: "LIVE",
    avatarColor: "#34C759",
    title: "Live now",
    body: "Pickup basketball nearby — 8 players in",
    time: "2h",
    createdAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    read: false,
    actions: [
      { label: "Join", variant: "primary", route: entityPath("event", "demo-ev-pickup-bball") },
      { label: "Map", variant: "secondary", route: mapPath({ type: "event", id: "demo-ev-pickup-bball" }) },
    ],
    route: entityPath("event", "demo-ev-pickup-bball"),
  },
  {
    id: "demo-t3",
    source: "demo",
    type: "comment",
    category: "mentions",
    timeGroup: "today",
    accent: "social",
    avatar: "CA",
    avatarColor: "#636366",
    title: "Comment",
    body: "Coach Alex: Best footwork I've seen all season",
    time: "3h",
    createdAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    read: true,
    route: ROUTES.feed,
  },
  {
    id: "demo-y1",
    source: "demo",
    type: "team_update",
    category: "teams",
    timeGroup: "yesterday",
    accent: "social",
    avatar: "FC",
    avatarColor: "#0A84FF",
    title: "Team update",
    body: "FC Thunder posted a new training schedule",
    time: "Yesterday",
    createdAt: new Date(Date.now() - 26 * 60 * 60_000).toISOString(),
    read: true,
    route: ROUTES.teams,
  },
  {
    id: "demo-w1",
    source: "demo",
    type: "achievement",
    category: "activity",
    timeGroup: "earlier",
    accent: "social",
    avatar: "★",
    avatarColor: "#FFD700",
    title: "Achievement",
    body: "You earned Social Butterfly — 50 interactions this week",
    time: "3d",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString(),
    read: true,
    route: ROUTES.rewards,
  },
];

export function normalizeNotificationFeed(data: unknown): ApiNotificationRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as ApiNotificationRow[];
  const row = data as { items?: ApiNotificationRow[]; notifications?: ApiNotificationRow[] };
  if (Array.isArray(row.items)) return row.items;
  if (Array.isArray(row.notifications)) return row.notifications;
  return [];
}

function categoryFromType(type: string): Exclude<NotifCategory, "all" | "unread"> {
  const t = type.toLowerCase();
  if (t.includes("message") || t === "dm") return "messages";
  if (t.includes("team")) return "teams";
  if (t.includes("event") || t.includes("coach") || t.includes("book")) return "events";
  if (t.includes("mention") || t.includes("comment")) return "mentions";
  if (t.includes("follow") || t.includes("like") || t.includes("challenge") || t.includes("achievement")) {
    return "activity";
  }
  return "activity";
}

function accentFromType(type: string): NotifAccent {
  const t = type.toLowerCase();
  if (ACTIONABLE_TYPES.has(t) || t.includes("invite") || t.includes("request")) return "urgent";
  if (t.includes("live") || t.includes("nearby")) return "live";
  return "social";
}

function timeGroupFromDate(iso: string, unread: boolean, type: string): NotifTimeGroup {
  if (unread && (ACTIONABLE_TYPES.has(type) || type.includes("invite"))) return "priority";
  const age = Date.now() - new Date(iso).getTime();
  if (age < 24 * 60 * 60_000) return "today";
  if (age < 48 * 60 * 60_000) return "yesterday";
  return "earlier";
}

export function formatNotifTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function titleFromType(type: string): string {
  const map: Record<string, string> = {
    like: "New like",
    comment: "Comment",
    follow: "New follower",
    follow_request: "Follow request",
    message: "Message",
    team_invite: "Team invite",
    team_join_request: "Join request",
    team_join_approved: "Request approved",
    team_join_rejected: "Request declined",
    team_member_joined: "New member",
    team_schedule_reminder: "Training reminder",
    team_schedule_update: "Schedule update",
    team_update: "Team update",
    event_live: "Live event",
    event_reminder: "Event reminder",
    challenge: "Challenge",
    mention: "Mention",
    system: "SURNA",
  };
  return map[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function entityFromMetadata(meta: Record<string, unknown>): { kind: MapEntityKind; id: string } | null {
  const kind = (
    meta.relatedEntityType ||
    meta.entityType ||
    meta.entityKind ||
    ""
  ) as string;
  const id = String(
    meta.relatedEntityId ||
      meta.entityId ||
      meta.eventId ||
      meta.placeId ||
      meta.teamId ||
      meta.coachId ||
      meta.challengeId ||
      "",
  );
  if (!kind || !id) return null;
  const normalized = kind.toLowerCase();
  if (normalized.includes("event")) return { kind: "event", id };
  if (normalized.includes("place") || normalized.includes("venue")) return { kind: "place", id };
  if (normalized.includes("team")) return { kind: "team", id };
  if (normalized.includes("coach")) return { kind: "coach", id };
  if (normalized.includes("challenge")) return { kind: "challenge", id };
  if (normalized.includes("person") || normalized.includes("player") || normalized.includes("user")) {
    return { kind: "person", id };
  }
  return { kind: normalized as MapEntityKind, id };
}

function routeFromApiRow(row: ApiNotificationRow): string | undefined {
  const meta = row.metadata ?? {};
  if (typeof meta.route === "string") return meta.route;

  const entity = entityFromMetadata(meta);
  if (entity) return entityPath(entity.kind, entity.id);

  if (row.postId) return ROUTES.feed;
  if (row.type === "message") return ROUTES.messages;
  const teamId = row.metadata?.teamId;
  if (typeof teamId === "string" && row.type.includes("team")) return `/teams/${teamId}`;
  if (row.type.includes("team")) return ROUTES.teams;
  if (row.type.includes("event")) return ROUTES.events;
  if (row.type.includes("challenge")) return ROUTES.challenges;
  if (row.type.includes("follow")) return ROUTES.discoverPeople;
  return undefined;
}

export function apiRowToNotification(row: ApiNotificationRow): SurnaNotification {
  const read = Boolean(row.readAt);
  const type = row.type || "system";
  const body = row.message || row.body || "";
  const createdAt = row.createdAt || new Date().toISOString();
  const entity = entityFromMetadata(row.metadata ?? {});
  const route = routeFromApiRow(row);

  return {
    id: row.id,
    source: "api",
    type,
    category: categoryFromType(type),
    timeGroup: timeGroupFromDate(createdAt, !read, type),
    accent: accentFromType(type),
    avatar: (row.actorId?.slice(0, 2) || type.slice(0, 2)).toUpperCase(),
    avatarColor: accentFromType(type) === "urgent" ? "#DC2626" : accentFromType(type) === "live" ? "#34C759" : "#636366",
    title: row.title || titleFromType(type),
    body,
    time: formatNotifTime(createdAt),
    createdAt,
    read,
    route,
    entityKind: entity?.kind,
    entityId: entity?.id,
    actions: buildActionsForType(type, route),
  };
}

function buildActionsForType(type: string, route?: string): NotifAction[] | undefined {
  const t = type.toLowerCase();
  if (t === "follow_request") {
    return [
      { label: "Accept", variant: "primary", route: ROUTES.discoverPeople },
      { label: "Decline", variant: "secondary" },
    ];
  }
  if (t === "team_invite" || t === "team_join_request") {
    return [
      { label: t === "team_join_request" ? "Review" : "Join", variant: "primary", route: route ?? ROUTES.teams },
      { label: "View team", variant: "secondary", route: route ?? ROUTES.teams },
    ];
  }
  if (t === "team_join_approved") {
    return [{ label: "View team", variant: "primary", route: route ?? ROUTES.teams }];
  }
  if (t === "team_schedule_reminder" || t === "team_schedule_update") {
    return [{ label: "View schedule", variant: "primary", route: route ?? ROUTES.teams }];
  }
  if (t === "message") {
    return [{ label: "Reply", variant: "primary", route: ROUTES.messages }];
  }
  if (t === "challenge") {
    return [
      { label: "Accept", variant: "primary", route: ROUTES.challenges },
      { label: "Decline", variant: "secondary" },
    ];
  }
  if (t.includes("event") && t.includes("live")) {
    const mapRoute =
      route?.startsWith("/events/")
        ? mapPath({ type: "event", id: route.split("/").pop()! })
        : mapPath({ type: "event", id: "demo-ev-pickup-bball" });
    return [
      { label: "Join", variant: "primary", route: route ?? ROUTES.events },
      { label: "Map", variant: "secondary", route: mapRoute },
    ];
  }
  if (route && (t === "comment" || t === "mention" || t === "like")) {
    return [{ label: "View", variant: "secondary", route }];
  }
  return undefined;
}

export function mergeNotificationFeed(apiRows: ApiNotificationRow[]): SurnaNotification[] {
  return apiRows.map(apiRowToNotification);
}

export function filterNotifications(
  items: SurnaNotification[],
  filter: NotifCategory,
  search: string,
): SurnaNotification[] {
  const q = search.trim().toLowerCase();
  return items.filter((n) => {
    if (filter === "unread" && n.read) return false;
    if (filter !== "all" && filter !== "unread" && n.category !== filter) return false;
    if (q && !`${n.title} ${n.body}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function groupByTimeGroup(items: SurnaNotification[]): { key: NotifTimeGroup; label: string; items: SurnaNotification[] }[] {
  const order: NotifTimeGroup[] = ["priority", "today", "yesterday", "earlier"];
  return order
    .map((key) => ({
      key,
      label: TIME_GROUP_LABELS[key],
      items: items.filter((n) => n.timeGroup === key),
    }))
    .filter((g) => g.items.length > 0);
}

export function resolveNotificationRoute(
  notif: SurnaNotification,
  preferMap = false,
): string | undefined {
  if (preferMap && notif.entityKind && notif.entityId) {
    return mapPath({ type: notif.entityKind, id: notif.entityId });
  }

  if (notif.route) return notif.route;

  const primaryAction = notif.actions?.find((a) => a.variant === "primary" && a.route);
  if (primaryAction?.route) return primaryAction.route;

  const anyAction = notif.actions?.find((a) => a.route)?.route;
  if (anyAction && !preferMap) return anyAction;

  switch (notif.type) {
    case "message":
      return ROUTES.messages;
    case "challenge":
    case "challenge_result":
      return ROUTES.challenges;
    case "event_live":
      return entityPath("event", "demo-ev-pickup-bball");
    case "event_reminder":
      return entityPath("event", "demo-ev-5v5-soccer");
    case "team_invite":
    case "team_update":
      if (notif.entityKind === "team" && notif.entityId) {
        return `${entityPath("team", notif.entityId)}?join=1`;
      }
      return entityPath("team", "dt1");
    case "nearby":
      return mapPath();
    case "follow":
    case "follow_request":
      return ROUTES.discoverPeople;
    case "comment":
    case "mention":
    case "like":
    case "like_grouped":
      return ROUTES.feed;
    default:
      return undefined;
  }
}

/** Map button on a notification should open the main map focused on that item. */
export function resolveNotificationMapRoute(notif: SurnaNotification): string {
  if (notif.entityKind && notif.entityId) {
    return mapPath({ type: notif.entityKind, id: notif.entityId });
  }
  if (notif.type === "event_live" || notif.type === "event_reminder") {
    const id =
      notif.type === "event_live" ? "demo-ev-pickup-bball" : "demo-ev-5v5-soccer";
    return mapPath({ type: "event", id });
  }
  if (notif.type === "team_invite" || notif.type === "team_update") {
    return mapPath({ type: "team", id: "dt1" });
  }
  if (notif.type === "nearby") return mapPath();
  const detail = resolveNotificationRoute(notif);
  if (detail?.startsWith("/events/")) return mapPath({ type: "event", id: detail.split("/").pop()! });
  if (detail?.startsWith("/places/")) return mapPath({ type: "place", id: detail.split("/").pop()! });
  if (detail?.startsWith("/teams/")) return mapPath({ type: "team", id: detail.split("/").pop()! });
  return mapPath();
}

export function accentColor(accent: NotifAccent): string {
  if (accent === "urgent") return "var(--surna-story-ring, #DC2626)";
  if (accent === "live") return "#34C759";
  return "var(--surna-text-muted)";
}
