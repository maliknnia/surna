import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Navigation,
  MessageSquare,
  UserPlus,
  Trophy,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  MapPin,
  Share2,
  Star,
  DollarSign,
  Ticket,
  CheckCircle,
  Zap,
  Flag,
  Sparkles,
} from "lucide-react";
import { formatDistance, getNavigationUrl, type Coordinates } from "@/lib/geo";
import { entityPath } from "@/lib/mapNavigation";
import { markNavReturn } from "@/lib/navigation";
import { pushMapRecent } from "@/lib/mapSearchRecents";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LazyImage } from "@/components/ui/lazy-image";
import { deriveModernSources, deriveLqipPlaceholder } from "@/lib/imageSources";
import { useTheme } from "@/contexts/ThemeContext";
import { getPinSheetTheme } from "@/lib/panelTheme";
import { cn } from "@/lib/utils";

type EntityType = "event" | "place" | "person" | "player" | "team" | "coach" | "challenge" | "instant";

const TYPE_LABEL: Record<string, string> = {
  event: "Event",
  place: "Venue",
  team: "Team",
  coach: "Coach",
  person: "Player",
  player: "Player",
  challenge: "Challenge",
  instant: "Pick-up game",
};

export interface MapPinSheetData {
  id: string;
  type: EntityType;
  title: string;
  coords: Coordinates;
  data: Record<string, unknown>;
  iconUrl?: string;
  coverUrl?: string;
  hasStory?: boolean;
  storyState?: string;
  presence?: string;
  subtitle?: string;
}

interface PinSheetProps {
  pin: MapPinSheetData | null;
  userLocation?: Coordinates;
  onClose: () => void;
  onNavigate?: (coords: Coordinates) => void;
  onViewStory?: (pin: MapPinSheetData) => void;
  /** Session return path after opening entity detail (map panel or /map). */
  returnPath?: string;
}


/** Prefer wide cover art; fall back to avatar/logo when it reads as a photo. */
export function resolvePinCover(pin: MapPinSheetData): string | undefined {
  const d = pin.data || {};
  const candidates = [
    pin.coverUrl,
    d.coverImage as string,
    d.coverUrl as string,
    d.coverImageUrl as string,
    d.bannerUrl as string,
    d.imageUrl as string,
    d.photoUrl as string,
    pin.type === "place" || pin.type === "event" || pin.type === "team" ? pin.iconUrl : undefined,
  ];
  return candidates.find((u) => typeof u === "string" && u.trim().length > 0);
}

function resolvePinAvatar(pin: MapPinSheetData): string | undefined {
  if (pin.iconUrl?.trim()) return pin.iconUrl;
  const d = pin.data || {};
  const u = (d.profileImageUrl || d.avatarUrl || d.logo) as string | undefined;
  return u?.trim() ? u : undefined;
}

function formatEventWhenLine(startRaw: unknown, endRaw?: unknown): string | null {
  if (!startRaw) return null;
  const start = new Date(String(startRaw));
  if (Number.isNaN(start.getTime())) return null;
  const date = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  let line = `${date} · ${time}`;
  if (endRaw) {
    const end = new Date(String(endRaw));
    if (!Number.isNaN(end.getTime())) {
      line += ` – ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
    }
  }
  return line;
}

function getEventCountdown(startRaw: unknown): string | null {
  if (!startRaw) return null;
  const target = new Date(String(startRaw));
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  if (diff < -1000 * 60 * 60 * 3) return null;
  if (diff < 0) return "Happening now";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `In ${days}d ${hours}h`;
  if (hours > 0) return `In ${hours}h ${mins}m`;
  return `In ${mins}m`;
}

function getEventPriceLabel(d: Record<string, unknown>): string | null {
  const fee = d.entryFee || d.price || d.cost;
  if (fee != null && typeof fee === "object" && "amount" in fee) {
    const amount = (fee as { amount: unknown }).amount;
    const currency = (fee as { currency?: string }).currency || "EUR";
    return `${amount} ${currency}`;
  }
  if (fee != null && fee !== "") return String(fee);
  const desc = String(d.description || "").toLowerCase();
  const euroMatch = desc.match(/€(\d+)/);
  if (euroMatch) return `€${euroMatch[1]}`;
  if (desc.includes("free entry") || desc.includes("free event") || desc.includes("no fee") || desc.includes("free to join")) {
    return "Free";
  }
  return null;
}

function buildChips(pin: MapPinSheetData): string[] {
  const d = pin.data || {};
  const chips: string[] = [];
  if (pin.type !== "event") {
    if (d.sport) chips.push(String(d.sport));
  } else if (d.eventType) {
    chips.push(String(d.eventType));
  }
  if (d.liveNow) chips.push("Live now");
  if (pin.type !== "event" && (d.kind || d.category)) chips.push(String(d.kind || d.category));
  if (d.memberCount) chips.push(`${d.memberCount} members`);
  if (d.verified) chips.push("Verified");
  if (d.currentActivity) chips.push(String(d.currentActivity));
  if (pin.type !== "event") {
    const going = d.going_count ?? d.goingCount;
    if (going) chips.push(`${going} going`);
  }
  if (pin.type === "instant" && d.skillLevel) chips.push(String(d.skillLevel));
  return chips;
}

type InfoRow = { icon: typeof MapPin; label: string; value: string; highlight?: boolean };

function buildInfoRows(pin: MapPinSheetData): InfoRow[] {
  const d = pin.data || {};
  const rows: InfoRow[] = [];

  if (pin.type === "event") {
    return [];
  }

  if (pin.type === "place") {
    if (d.kind || d.category) rows.push({ icon: MapPin, label: "Type", value: String(d.kind || d.category) });
    if (d.rating) rows.push({ icon: Star, label: "Rating", value: `${parseFloat(String(d.rating)).toFixed(1)} / 5`, highlight: true });
    if (d.sports && Array.isArray(d.sports)) rows.push({ icon: Trophy, label: "Sports", value: (d.sports as string[]).join(", ") });
    if (d.hourlyRate) rows.push({ icon: DollarSign, label: "Rate", value: `${d.hourlyRate}/hr`, highlight: true });
    if (d.address) rows.push({ icon: MapPin, label: "Address", value: String(d.address) });
    if (d.city) rows.push({ icon: MapPin, label: "City", value: String(d.city) });
    if (d.phone) rows.push({ icon: MessageSquare, label: "Phone", value: String(d.phone) });
  }

  if (pin.type === "team") {
    if (d.sport) rows.push({ icon: Trophy, label: "Sport", value: String(d.sport) });
    if (d.memberCount) rows.push({ icon: Users, label: "Members", value: `${d.memberCount}`, highlight: true });
  }

  if (pin.type === "coach") {
    if (d.specialty || d.sport) rows.push({ icon: Trophy, label: "Focus", value: String(d.specialty || d.sport) });
    if (d.rating) rows.push({ icon: Star, label: "Rating", value: `${d.rating}`, highlight: true });
    if (d.hourlyRate) rows.push({ icon: DollarSign, label: "Rate", value: `${d.hourlyRate}/session`, highlight: true });
  }

  if ((pin.type === "person" || pin.type === "player") && d.currentActivity) {
    rows.push({ icon: Sparkles, label: "Now", value: String(d.currentActivity), highlight: true });
  }
  if ((pin.type === "person" || pin.type === "player") && d.sport) {
    rows.push({ icon: Trophy, label: "Sport", value: String(d.sport) });
  }
  if ((pin.type === "person" || pin.type === "player") && d.username) {
    rows.push({ icon: Users, label: "Username", value: `@${d.username}` });
  }

  if (pin.type === "challenge") {
    if (d.sport) rows.push({ icon: Trophy, label: "Sport", value: String(d.sport) });
    if (d.participants) rows.push({ icon: Users, label: "Players", value: `${d.participants}` });
    if (d.status) rows.push({ icon: Flag, label: "Status", value: String(d.status), highlight: true });
  }

  if (pin.type === "instant") {
    if (d.locationName) rows.push({ icon: MapPin, label: "Meet at", value: String(d.locationName) });
    if (d.startTime) {
      const t = new Date(String(d.startTime));
      if (!Number.isNaN(t.getTime())) {
        rows.push({
          icon: Clock,
          label: "Starts",
          value: t.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }),
          highlight: true,
        });
      }
    }
    if (d.playersNeeded != null) {
      const joined = Number(d.playersJoined) || 0;
      const need = Number(d.playersNeeded);
      rows.push({
        icon: Users,
        label: "Spots",
        value: `${Math.max(0, need - joined)} of ${need} open`,
        highlight: true,
      });
    }
    if (d.skillLevel) rows.push({ icon: Zap, label: "Level", value: String(d.skillLevel) });
  }

  return rows;
}

function EventPinDetails({
  pin,
  sheet,
  distance,
}: {
  pin: MapPinSheetData;
  sheet: ReturnType<typeof getPinSheetTheme>;
  distance: string | null;
}) {
  const d = pin.data || {};
  const whenLine = formatEventWhenLine(d.starts_at || d.startAt || d.startDate, d.endDate || d.ends_at);
  const countdown = getEventCountdown(d.starts_at || d.startAt || d.startDate);
  const priceLabel = getEventPriceLabel(d);
  const going = Number(d.going_count ?? d.goingCount) || 0;
  const capacity = Number(d.maxParticipants || d.capacity) || 0;
  const fillPercent = capacity > 0 ? Math.min((going / capacity) * 100, 100) : 0;
  const spotsLeft = capacity > 0 ? Math.max(0, capacity - going) : null;
  const locationText = (() => {
    const loc = d.location ?? d.address;
    if (loc == null || loc === "") return null;
    return String(loc);
  })();
  const sport = d.sport ? String(d.sport) : null;

  return (
    <div className="space-y-4 mb-4">
      {(sport || priceLabel || countdown) && (
        <div className="flex flex-wrap gap-1.5">
          {sport && (
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide"
              style={{ background: sheet.inset, color: "var(--surna-text-secondary)", border: "1px solid var(--surna-border)" }}
            >
              {sport}
            </span>
          )}
          {priceLabel && (
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: sheet.inset, color: "var(--surna-text)", border: "1px solid var(--surna-border)" }}
            >
              {priceLabel}
            </span>
          )}
          {countdown && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--surna-text)] text-[var(--surna-bg)]">
              {countdown}
            </span>
          )}
        </div>
      )}

      <div
        className="rounded-2xl border border-[var(--surna-border)] overflow-hidden divide-y divide-[var(--surna-border)]"
        style={{ background: sheet.inset }}
      >
        {whenLine && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: sheet.surface }}
            >
              <Calendar size={16} style={{ color: "var(--surna-text)" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-[var(--surna-text-muted)]">When</p>
              <p className="text-sm font-semibold text-[var(--surna-text)] mt-0.5">{whenLine}</p>
            </div>
          </div>
        )}

        {locationText && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: sheet.surface }}
            >
              <MapPin size={16} style={{ color: "var(--surna-text)" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-[var(--surna-text-muted)]">Where</p>
              <p className="text-sm font-medium text-[var(--surna-text)] mt-0.5 line-clamp-2">{locationText}</p>
              {distance && (
                <p className="text-xs text-[var(--surna-text-muted)] mt-0.5">{distance} away</p>
              )}
            </div>
          </div>
        )}

        {(going > 0 || capacity > 0) && (
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-[var(--surna-text-muted)]" />
                <span className="text-sm font-semibold text-[var(--surna-text)]">
                  {going} going
                  {capacity > 0 && (
                    <span className="font-normal text-[var(--surna-text-muted)]"> · {capacity} max</span>
                  )}
                </span>
              </div>
              {spotsLeft !== null && spotsLeft <= 8 && (
                <span className="text-[11px] font-semibold text-[var(--surna-text-secondary)]">
                  {spotsLeft === 0 ? "Full" : `${spotsLeft} left`}
                </span>
              )}
            </div>
            {capacity > 0 && (
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--surna-border)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${fillPercent}%`,
                    background: "var(--surna-text)",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PinSheet({ pin, userLocation, onClose, onNavigate, onViewStory, returnPath = "/?panel=map" }: PinSheetProps) {
  const [isActing, setIsActing] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { isDark: isDarkTheme, theme } = useTheme();
  const isDark = isDarkTheme ?? theme === "dark";
  const sheet = useMemo(() => getPinSheetTheme(isDark), [isDark]);

  useEffect(() => {
    setActionDone(null);
    setExpanded(false);
  }, [pin?.id]);

  const { data: preview } = useQuery<{
    coverUrl?: string;
    imageUrl?: string;
    images?: string[];
    description?: string;
  } | null>({
    queryKey: ["/api/map/preview", pin?.type, pin?.id],
    enabled: expanded && !!pin && !String(pin.id).startsWith("demo"),
    queryFn: async () => {
      const res = await fetch(`/api/map/preview/${pin!.type}/${pin!.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  const coverUrl = pin ? resolvePinCover(pin) : undefined;
  const avatarUrl = pin ? resolvePinAvatar(pin) : undefined;
  const galleryUrls = useMemo(() => {
    const urls: string[] = [];
    const push = (u?: string | null) => {
      if (u && typeof u === "string" && u.trim() && !urls.includes(u)) urls.push(u);
    };
    push(coverUrl);
    push(preview?.coverUrl);
    push(preview?.imageUrl);
    if (preview?.images) preview.images.forEach((u) => push(u));
    push(avatarUrl);
    return urls;
  }, [coverUrl, avatarUrl, preview]);
  const chips = pin ? buildChips(pin) : [];
  const infoRows = pin ? buildInfoRows(pin) : [];
  const description = pin?.data?.description
    ? String(pin.data.description)
    : preview?.description
      ? String(preview.description)
      : "";
  const isEvent = pin?.type === "event";
  const eventCountdown = useMemo(() => {
    if (!pin || pin.type !== "event") return null;
    const d = pin.data || {};
    return getEventCountdown(d.starts_at || d.startAt || d.startDate);
  }, [pin]);
  const feeAmount =
    !isEvent && pin?.data ? pin.data.entryFee || pin.data.price || pin.data.cost : null;

  const distance = useMemo(() => {
    if (!pin || !userLocation) return null;
    const km =
      Math.sqrt(
        Math.pow(pin.coords.lat - userLocation.lat, 2) +
          Math.pow(pin.coords.lng - userLocation.lng, 2),
      ) * 111.32;
    return formatDistance(km);
  }, [pin, userLocation]);

  if (!pin) return null;

  const typeLabel = TYPE_LABEL[pin.type] || pin.type;
  const isPerson = pin.type === "person" || pin.type === "player";
  const heroUrl = galleryUrls[0];
  const hasHero = Boolean(heroUrl);

  const handleNavigateMap = () => {
    window.open(getNavigationUrl(pin.coords, userLocation), "_blank");
    onNavigate?.(pin.coords);
  };

  const handleViewPage = () => {
    if (!pin) return;
    pushMapRecent({
      id: pin.id,
      type: pin.type,
      title: pin.title,
      subtitle: pin.subtitle,
      lat: pin.coords.lat,
      lng: pin.coords.lng,
    });
    markNavReturn(returnPath);
    onClose();
    navigate(entityPath(pin.type, pin.id));
  };

  const handleQuickAction = async (action: string) => {
    setIsActing(true);
    try {
      switch (action) {
        case "rsvp": {
          const isDemoEvent =
            pin.type === "event" &&
            (pin.id.startsWith("demo-") || pin.id.startsWith("de") || pin.id === "focus-coords");
          if (!isDemoEvent) {
            await apiRequest("POST", `/api/events/${pin.id}/rsvp`);
            queryClient.invalidateQueries({ queryKey: ["/api/map/viewport"] });
          }
          setActionDone("rsvp");
          toast({ title: "You're going!", description: pin.title });
          break;
        }
        case "join":
          await apiRequest("POST", `/api/teams/${pin.id}/join`);
          queryClient.invalidateQueries({ queryKey: ["/api/map/viewport"] });
          setActionDone("join");
          toast({ title: "Joined!", description: pin.title });
          break;
        case "message": {
          onClose();
          const dmUserId =
            pin.data?.userId ||
            pin.data?.user_id ||
            (pin.type === "person" || pin.type === "player" ? pin.id : null);
          navigate(dmUserId ? `/messages?userId=${dmUserId}` : "/messages");
          break;
        }
        case "challenge":
          onClose();
          navigate(
            pin.type === "person" || pin.type === "player"
              ? `/challenges/create?opponentId=${encodeURIComponent(pin.id)}`
              : "/challenges",
          );
          break;
        case "book":
          onClose();
          navigate(pin.type === "coach" ? `/coaches/${pin.id}` : `/places/${pin.id}`);
          break;
        case "joinChallenge":
          onClose();
          navigate(`/challenges/${pin.id}`);
          break;
        case "instantJoin":
          await apiRequest("POST", `/api/instant-teams/${pin.id}/join`);
          queryClient.invalidateQueries({ queryKey: ["/api/instant-teams"] });
          queryClient.invalidateQueries({ queryKey: ["/api/map/viewport"] });
          setActionDone("instantJoin");
          toast({ title: "You're in!", description: pin.title });
          break;
        case "share":
          if (navigator.share) {
            await navigator.share({
              title: pin.title,
              text: `Check out ${pin.title} on SURNA`,
              url: window.location.origin + entityPath(pin.type, pin.id),
            });
          } else {
            await navigator.clipboard?.writeText(
              window.location.origin + entityPath(pin.type, pin.id),
            );
            toast({ title: "Link copied" });
          }
          break;
        default:
          onClose();
          navigate(entityPath(pin.type, pin.id));
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsActing(false);
    }
  };

  const primaryAction = getPrimaryAction(pin.type, actionDone);
  const subtitleLine = isEvent
    ? [pin.subtitle, distance].filter(Boolean).join(" · ") || typeLabel
    : [typeLabel, distance].filter(Boolean).join(" · ");

  const avatarInitials = pin.title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <div
      className="absolute inset-0 z-[1003] flex items-end justify-center"
      style={{
        background: sheet.backdrop,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-lg flex flex-col overflow-hidden border-t border-[var(--surna-border)]",
          expanded ? "max-h-[min(88dvh,720px)]" : "max-h-[min(46dvh,480px)]",
        )}
        style={{
          borderRadius: "20px 20px 0 0",
          background: sheet.surface,
          boxShadow: sheet.shadow,
          animation: "mapSheetUp 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 pb-0.5 flex-shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: sheet.handle }} />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {hasHero && (
            <div className="relative h-28 flex-shrink-0">
              <LazyImage
                src={heroUrl!}
                alt=""
                sources={deriveModernSources(heroUrl!)}
                placeholder={deriveLqipPlaceholder(heroUrl!)}
                wrapperClassName="absolute inset-0"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none" style={{ background: sheet.heroFade }} />
              <button
                type="button"
                onClick={onClose}
                className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md"
                style={{ background: sheet.heroScrim, border: `1px solid ${sheet.heroControlBorder}` }}
                aria-label="Close"
              >
                <X size={16} style={{ color: sheet.heroControlIcon }} />
              </button>
            </div>
          )}

          <div
            className="px-4 pt-3"
            style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
          >
            {!hasHero && (
              <div className="flex justify-end mb-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: sheet.inset }}
                  aria-label="Close"
                >
                  <X size={16} style={{ color: "var(--surna-text-muted)" }} />
                </button>
              </div>
            )}

            <div className="flex gap-3 items-start mb-3">
              <div className="relative flex-shrink-0">
                <div
                  className={cn(
                    "w-[52px] h-[52px] rounded-full overflow-hidden flex items-center justify-center ring-2",
                    pin.hasStory && pin.storyState === "new"
                      ? "ring-[var(--surna-accent)]"
                      : "ring-[var(--surna-border)]",
                  )}
                  style={{ background: sheet.inset }}
                >
                  {avatarUrl ? (
                    <LazyImage
                      src={avatarUrl}
                      alt=""
                      sources={deriveModernSources(avatarUrl)}
                      placeholder={deriveLqipPlaceholder(avatarUrl)}
                      wrapperClassName="w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-[var(--surna-text-secondary)]">{avatarInitials}</span>
                  )}
                </div>
                {isPerson && pin.presence === "active" && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ background: "#30D158", borderColor: sheet.presenceRing }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--surna-text-muted)]">
                  {typeLabel}
                  {isEvent && eventCountdown ? ` · ${eventCountdown}` : ""}
                </p>
                <h2 className="text-lg font-bold text-[var(--surna-text)] leading-snug line-clamp-2 mt-0.5">
                  {pin.title}
                </h2>
                <p className="text-[13px] text-[var(--surna-text-secondary)] mt-0.5 line-clamp-2">{subtitleLine}</p>
              </div>
            </div>

            {expanded && galleryUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto mb-3 pb-1" style={{ scrollbarWidth: "none" }}>
                {galleryUrls.slice(0, 5).map((url) => (
                  <div key={url} className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-[var(--surna-border)]">
                    <LazyImage
                      src={url}
                      alt=""
                      wrapperClassName="w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={handleNavigateMap}
                className="flex items-center justify-center h-11 w-11 rounded-full border border-[var(--surna-border)] active:scale-[0.97]"
                style={{ background: sheet.inset, color: "var(--surna-text)" }}
                aria-label="Directions"
              >
                <Navigation size={18} />
              </button>
              {primaryAction && (
                <button
                  type="button"
                  disabled={isActing || actionDone === primaryAction.key}
                  onClick={() => handleQuickAction(primaryAction.key)}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-full text-sm font-bold active:scale-[0.97] disabled:opacity-60"
                  style={{
                    background: actionDone === primaryAction.key ? "#30D158" : "var(--surna-text)",
                    color: actionDone === primaryAction.key ? "#fff" : sheet.textOnAccent,
                  }}
                >
                  <primaryAction.icon size={16} />
                  {isActing ? "…" : primaryAction.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => (expanded ? setExpanded(false) : setExpanded(true))}
                className="flex items-center justify-center h-11 px-3 rounded-full border border-[var(--surna-border)] text-[13px] font-semibold gap-1 active:scale-[0.97]"
                style={{ background: sheet.inset, color: "var(--surna-text)" }}
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {expanded ? "Less" : "More"}
              </button>
            </div>

            {expanded && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {pin.hasStory && pin.storyState !== "none" && (
                  <button
                    type="button"
                    onClick={() => onViewStory?.(pin)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm active:scale-[0.98]"
                    style={{
                      background: pin.storyState === "new" ? "var(--surna-text)" : sheet.inset,
                      color: pin.storyState === "new" ? sheet.textOnAccent : "var(--surna-text)",
                      border: pin.storyState === "new" ? "none" : "1px solid var(--surna-border)",
                    }}
                  >
                    <Play size={15} fill="currentColor" />
                    {pin.storyState === "new" ? "Watch story" : "Story viewed"}
                  </button>
                )}

                {isEvent ? (
                  <EventPinDetails pin={pin} sheet={sheet} distance={distance} />
                ) : (
                  <>
                    {chips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {chips.map((chip, i) => (
                          <span
                            key={`${chip}-${i}`}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium text-[var(--surna-text-secondary)] border border-[var(--surna-border)]"
                            style={{ background: sheet.inset }}
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                    {description && (
                      <p className="text-sm leading-relaxed text-[var(--surna-text-secondary)]">{description}</p>
                    )}
                    {infoRows.length > 0 && (
                      <div
                        className="rounded-2xl border border-[var(--surna-border)] overflow-hidden"
                        style={{ background: sheet.inset }}
                      >
                        {infoRows.map((row, i) => {
                          const RowIcon = row.icon;
                          return (
                            <div
                              key={`${row.label}-${i}`}
                              className={cn(
                                "flex items-start gap-3 px-3.5 py-2.5",
                                i > 0 && "border-t border-[var(--surna-border)]",
                              )}
                            >
                              <RowIcon size={15} className="mt-0.5 flex-shrink-0 text-[var(--surna-text-muted)]" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-wide text-[var(--surna-text-muted)]">{row.label}</p>
                                <p className="text-sm text-[var(--surna-text)] mt-0.5">{row.value}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {feeAmount != null && (
                  <div
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--surna-border)]"
                    style={{ background: sheet.inset }}
                  >
                    <DollarSign size={16} className="text-[var(--surna-text)]" />
                    <span className="text-sm font-medium text-[var(--surna-text)]">
                      {typeof feeAmount === "object" && feeAmount !== null && "amount" in feeAmount
                        ? `${(feeAmount as { amount: unknown }).amount} ${(feeAmount as { currency?: string }).currency || "EUR"}`
                        : String(feeAmount)}{" "}
                      entry
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleViewPage}
                    className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-full text-sm font-semibold border border-[var(--surna-border)] active:scale-[0.97]"
                    style={{ background: sheet.inset, color: "var(--surna-text)" }}
                  >
                    View profile
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("share")}
                    className="flex items-center justify-center h-11 w-11 rounded-full border border-[var(--surna-border)] active:scale-[0.97]"
                    style={{ background: sheet.inset, color: "var(--surna-text)" }}
                    aria-label="Share"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getPrimaryAction(
  type: EntityType,
  actionDone: string | null,
): { key: string; label: string; icon: typeof Ticket } | null {
  switch (type) {
    case "event":
      return {
        key: "rsvp",
        label: actionDone === "rsvp" ? "Going" : "I'm going",
        icon: actionDone === "rsvp" ? CheckCircle : Ticket,
      };
    case "team":
      return {
        key: "join",
        label: actionDone === "join" ? "Joined" : "Join team",
        icon: actionDone === "join" ? CheckCircle : UserPlus,
      };
    case "person":
    case "player":
      return { key: "message", label: "Message", icon: MessageSquare };
    case "coach":
      return { key: "book", label: "Book", icon: Calendar };
    case "place":
      return { key: "book", label: "Book", icon: DollarSign };
    case "challenge":
      return { key: "joinChallenge", label: "Join", icon: Trophy };
    case "instant":
      return {
        key: "instantJoin",
        label: actionDone === "instantJoin" ? "Joined" : "Join game",
        icon: actionDone === "instantJoin" ? CheckCircle : Zap,
      };
    default:
      return null;
  }
}
