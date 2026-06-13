import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
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

const TYPE_EMOJI: Record<string, string> = {
  event: "📅",
  place: "🏟",
  team: "👥",
  coach: "🏅",
  person: "👤",
  player: "👤",
  challenge: "🏆",
  instant: "⚡",
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

/** Sport placeholders — fade into the sheet surface for each theme. */
function sportGradient(sport?: string, isDark = true): string {
  const key = (sport || "").toLowerCase();
  if (!isDark) {
    const light: Record<string, string> = {
      basketball: "linear-gradient(145deg, #e4e4f0 0%, #d8dce8 50%, #f2f2f7 100%)",
      soccer: "linear-gradient(145deg, #dcece4 0%, #cde0d4 50%, #f2f2f7 100%)",
      football: "linear-gradient(145deg, #dce2ec 0%, #ccd6e4 50%, #f2f2f7 100%)",
      tennis: "linear-gradient(145deg, #ece4d8 0%, #e0d4c4 50%, #f2f2f7 100%)",
      running: "linear-gradient(145deg, #e0e4ea 0%, #d0d6de 50%, #f2f2f7 100%)",
      yoga: "linear-gradient(145deg, #e8e4f0 0%, #ddd4ec 50%, #f2f2f7 100%)",
    };
    return light[key] || "linear-gradient(160deg, #ebebeb 0%, #f0f0f0 55%, #f2f2f7 100%)";
  }
  const dark: Record<string, string> = {
    basketball: "linear-gradient(145deg, #252540 0%, #1c2038 50%, #121212 100%)",
    soccer: "linear-gradient(145deg, #152a1c 0%, #1a3328 50%, #121212 100%)",
    football: "linear-gradient(145deg, #1e2838 0%, #243048 50%, #121212 100%)",
    tennis: "linear-gradient(145deg, #2a2218 0%, #3d3228 50%, #121212 100%)",
    running: "linear-gradient(145deg, #222830 0%, #2c3540 50%, #121212 100%)",
    yoga: "linear-gradient(145deg, #2a2240 0%, #352a55 50%, #121212 100%)",
  };
  return dark[key] || "linear-gradient(160deg, #1e1e1e 0%, #161616 55%, #121212 100%)";
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

export default function PinSheet({ pin, userLocation, onClose, onNavigate, onViewStory }: PinSheetProps) {
  const [isActing, setIsActing] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { isDark: isDarkTheme, theme } = useTheme();
  const isDark = isDarkTheme ?? theme === "dark";
  const sheet = useMemo(() => getPinSheetTheme(isDark), [isDark]);

  useEffect(() => {
    setActionDone(null);
  }, [pin?.id]);

  const coverUrl = pin ? resolvePinCover(pin) : undefined;
  const avatarUrl = pin ? resolvePinAvatar(pin) : undefined;
  const chips = pin ? buildChips(pin) : [];
  const infoRows = pin ? buildInfoRows(pin) : [];
  const description = pin?.data?.description ? String(pin.data.description) : "";
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
  const emoji = TYPE_EMOJI[pin.type] || "📍";
  const isPerson = pin.type === "person" || pin.type === "player";
  const hasCover = Boolean(coverUrl);
  const showEventAvatar = !isEvent || !hasCover;
  const eventSport =
    isEvent && pin.data?.sport != null && String(pin.data.sport).trim()
      ? String(pin.data.sport)
      : null;

  const handleNavigateMap = () => {
    window.open(getNavigationUrl(pin.coords, userLocation), "_blank");
    onNavigate?.(pin.coords);
  };

  const handleViewPage = () => {
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

  return (
    <div
      className="absolute inset-0 z-[1003] flex items-end justify-center"
      style={{
        background: sheet.backdrop,
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-lg flex flex-col overflow-hidden",
          "max-h-[min(88dvh,720px)]",
          "border-t border-[var(--surna-border)]",
        )}
        style={{
          borderRadius: "24px 24px 0 0",
          background: sheet.surface,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: sheet.shadow,
          animation: "mapSheetUp 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-[5px] rounded-full" style={{ background: sheet.handle }} />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Hero */}
          <div className="relative h-44 sm:h-52 flex-shrink-0">
            {hasCover ? (
              <LazyImage
                src={coverUrl!}
                alt=""
                sources={deriveModernSources(coverUrl!)}
                placeholder={deriveLqipPlaceholder(coverUrl!)}
                wrapperClassName="absolute inset-0"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: sportGradient(String(pin.data?.sport || ""), isDark) }}
              >
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background: isDark
                      ? "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 70%)"
                      : "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.65) 0%, transparent 70%)",
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-5xl opacity-30 select-none">
                  {emoji}
                </span>
              </div>
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: sheet.heroFade }}
            />
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{
                background: sheet.heroScrim,
                border: `1px solid ${sheet.heroControlBorder}`,
              }}
              aria-label="Close"
            >
              <X size={18} style={{ color: sheet.heroControlIcon }} />
            </button>
            <span
              className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide backdrop-blur-md"
              style={{
                background: sheet.heroScrim,
                border: `1px solid ${sheet.heroControlBorder}`,
                color: sheet.heroBadgeColor,
              }}
            >
              {typeLabel}
            </span>
            {pin.hasStory && pin.storyState === "live" && (
              <span className="absolute top-3 left-[5.5rem] px-2 py-1 rounded-full text-[10px] font-bold bg-red-500 text-white">
                LIVE
              </span>
            )}
            {isEvent && hasCover && (
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 pointer-events-none">
                {eventSport && (
                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide backdrop-blur-md"
                    style={{ background: sheet.heroScrim, color: sheet.heroBadgeColor, border: `1px solid ${sheet.heroControlBorder}` }}
                  >
                    {eventSport}
                  </span>
                )}
                {eventCountdown && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md bg-white/95 text-black">
                    {eventCountdown}
                  </span>
                )}
              </div>
            )}
          </div>

          <div
            className={cn("px-5", hasCover ? "-mt-10 relative z-[1]" : "pt-2")}
            style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="flex gap-3.5 items-start mb-4">
              <button
                type="button"
                onClick={handleViewPage}
                className="flex flex-1 gap-3.5 items-start text-left active:opacity-90 transition-opacity min-w-0"
              >
                {showEventAvatar && (
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center ring-2",
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
                      <span className="text-2xl">{emoji}</span>
                    )}
                  </div>
                  {isPerson && pin.presence === "active" && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                      style={{ background: "#30D158", borderColor: sheet.presenceRing }}
                    />
                  )}
                </div>
                )}
                <div className={cn("flex-1 min-w-0", showEventAvatar ? "pt-1" : "")}>
                  <h2 className="text-xl font-bold text-[var(--surna-text)] leading-tight line-clamp-2">
                    {pin.title}
                  </h2>
                  <p className="text-sm text-[var(--surna-text-secondary)] mt-1 line-clamp-2">
                    {isEvent
                      ? [pin.subtitle, distance].filter(Boolean).join(" · ") || typeLabel
                      : `${pin.subtitle || typeLabel}${distance ? ` · ${distance}` : ""}`}
                  </p>
                </div>
              </button>
              {!hasCover && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: sheet.inset }}
                  aria-label="Close"
                >
                  <X size={18} style={{ color: "var(--surna-text-muted)" }} />
                </button>
              )}
            </div>

            {pin.hasStory && pin.storyState !== "none" && (
              <button
                type="button"
                onClick={() => onViewStory?.(pin)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-4 font-semibold text-sm active:scale-[0.98] transition-transform"
                style={{
                  background:
                    pin.storyState === "new" ? "var(--surna-text)" : sheet.inset,
                  color: pin.storyState === "new" ? sheet.textOnAccent : "var(--surna-text)",
                  border: pin.storyState === "new" ? "none" : "1px solid var(--surna-border)",
                }}
              >
                <Play size={16} fill="currentColor" />
                {pin.storyState === "new" ? "Watch story" : "Story viewed"}
              </button>
            )}

            {isEvent ? (
              <EventPinDetails pin={pin} sheet={sheet} distance={distance} />
            ) : (
              <>
                {chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {chips.map((chip, i) => (
                      <span
                        key={`${chip}-${i}`}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-medium",
                          chip.toLowerCase().includes("live")
                            ? "bg-red-500/15 text-red-400 border border-red-500/25"
                            : "text-[var(--surna-text-secondary)] border border-[var(--surna-border)]",
                        )}
                        style={
                          !chip.toLowerCase().includes("live")
                            ? { background: sheet.inset }
                            : undefined
                        }
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}

                {description && (
                  <p className="text-sm leading-relaxed text-[var(--surna-text-secondary)] mb-4">
                    {description.length > 280 ? `${description.slice(0, 280)}…` : description}
                  </p>
                )}

                {infoRows.length > 0 && (
                  <div
                    className="rounded-2xl border border-[var(--surna-border)] overflow-hidden mb-4"
                    style={{ background: sheet.inset }}
                  >
                    {infoRows.map((row, i) => {
                      const Icon = row.icon;
                      return (
                        <div
                          key={`${row.label}-${i}`}
                          className={cn(
                            "flex items-start gap-3 px-3.5 py-3",
                            i > 0 && "border-t border-[var(--surna-border)]",
                          )}
                        >
                          <Icon
                            size={16}
                            className="mt-0.5 flex-shrink-0"
                            style={{
                              color: row.highlight ? "var(--surna-text)" : "var(--surna-text-muted)",
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-wide text-[var(--surna-text-muted)]">
                              {row.label}
                            </p>
                            <p
                              className={cn(
                                "text-sm mt-0.5",
                                row.highlight
                                  ? "font-semibold text-[var(--surna-text)]"
                                  : "text-[var(--surna-text-secondary)]",
                              )}
                            >
                              {row.value}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {isEvent && description && (
              <p className="text-sm leading-relaxed text-[var(--surna-text-secondary)] mb-4 -mt-1">
                {description.length > 220 ? `${description.slice(0, 220)}…` : description}
              </p>
            )}

            {feeAmount != null && (
              <div
                className="flex items-center gap-2 mb-4 px-3.5 py-3 rounded-xl border border-[var(--surna-border)]"
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleNavigateMap}
                className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl text-sm font-semibold active:scale-[0.97] transition-transform border border-[var(--surna-border)]"
                style={{ background: sheet.inset, color: "var(--surna-text)" }}
              >
                <Navigation size={16} />
              </button>
              {primaryAction && (
                <button
                  type="button"
                  disabled={isActing || actionDone === primaryAction.key}
                  onClick={() => handleQuickAction(primaryAction.key)}
                  className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-60"
                  style={{
                    background:
                      actionDone === primaryAction.key ? "#30D158" : "var(--surna-text)",
                    color:
                      actionDone === primaryAction.key ? "#fff" : sheet.textOnAccent,
                  }}
                >
                  <primaryAction.icon size={16} />
                  {isActing ? "…" : primaryAction.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleQuickAction("share")}
                className="flex items-center justify-center h-12 w-12 rounded-xl border border-[var(--surna-border)] active:scale-[0.97]"
                style={{ background: sheet.inset, color: "var(--surna-text)" }}
                aria-label="Share"
              >
                <Share2 size={16} />
              </button>
            </div>
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
