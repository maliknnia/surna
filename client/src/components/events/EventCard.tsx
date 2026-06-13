import { useState, useEffect, type MouseEvent } from "react";
import { useRSVP } from "@/hooks/useEvents";
import { Users, MapPin } from "lucide-react";
import { eventDetailPath, isRouteSport, resolveEventRouteCoordinates, storeMapRouteFocus } from "@/lib/eventRoutes";
import { mapPath } from "@/lib/mapNavigation";
import { useLocation } from "wouter";
import { markNavReturn, mobilePanelReturnPath } from "@/lib/navigation";
import CardMenu from "../CardMenu";
import { useTheme } from "@/contexts/ThemeContext";
import { extractDominantColor, getCachedColor } from "@/lib/extractColor";
import { calculateDistance } from "@/lib/geo";
import { sportCardBg } from "@/lib/sportColors";
import { demoPeopleForEntity } from "@/lib/activityPeople";
import { CardAttendeeStrip } from "@/components/people/CardAttendeeStrip";
import { ActivityPeopleSheet } from "@/components/people/ActivityPeopleSheet";
import { getSportConfig } from "@/components/TeamCard";
import { getEventCoverUrl } from "@/lib/eventCover";

function formatEventWhen(dateStr: string): string | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} · ${time}`;
}

function getCountdownLabel(dateStr: string): string | null {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  if (diff < -1000 * 60 * 60 * 3) return null;
  if (diff < 0) return "Happening now";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 30) return null;
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  if (hours > 0) return `Starts in ${hours}h ${mins}m`;
  return `Starts in ${mins}m`;
}

function getPriceLabel(ev: any): string | null {
  const desc = (ev.description || "").toLowerCase();
  const priceMatch = desc.match(/\$(\d+)/);
  if (priceMatch) return `€${priceMatch[1]}`;
  if (desc.includes("free entry") || desc.includes("free event") || desc.includes("no fee")) return "Free";
  return null;
}

function inferSport(ev: any): string | null {
  if (ev.sport) return String(ev.sport);
  const t = (ev.title || "").toLowerCase();
  const keys = ["basketball", "soccer", "football", "tennis", "running", "mma", "boxing", "volleyball", "yoga", "crossfit", "swim", "padel"];
  for (const k of keys) {
    if (t.includes(k)) return k;
  }
  return null;
}

export default function EventCard({ ev }: { ev: any }) {
  const rsvp = useRSVP(ev.id);
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [peopleOpen, setPeopleOpen] = useState(false);

  const sport = inferSport(ev);
  const sportConfig = getSportConfig(sport);
  const coverUrl = getEventCoverUrl(ev);
  const hasPhoto = !!coverUrl;

  const [dominantColor, setDominantColor] = useState<string | null>(
    coverUrl ? getCachedColor(coverUrl) : null,
  );
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!coverUrl) return;
    extractDominantColor(coverUrl).then(setDominantColor);
  }, [coverUrl]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  }, []);

  const eventCoords = (() => {
    const lat = Number(ev.lat ?? ev.latitude ?? ev.locationLat);
    const lng = Number(ev.lng ?? ev.longitude ?? ev.locationLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  })();

  const distanceLabel =
    userCoords && eventCoords
      ? `${calculateDistance(userCoords, eventCoords).toFixed(1)} km away`
      : null;

  const startDate = ev.starts_at || ev.startDate;
  const whenLabel = startDate ? formatEventWhen(startDate) : null;
  const countdownLabel = startDate ? getCountdownLabel(startDate) : null;
  const priceLabel = getPriceLabel(ev);

  const goingCount = ev.going_count || 0;
  const capacity = ev.capacity || 0;
  const fillPercent = capacity > 0 ? Math.min((goingCount / capacity) * 100, 100) : 0;
  const spotsLeft = capacity > 0 ? Math.max(0, capacity - goingCount) : null;
  const isFull = spotsLeft === 0;

  const attendeePreview = demoPeopleForEntity(
    String(ev.id),
    goingCount > 0 ? goingCount : undefined,
  );

  const fallbackBg = sportCardBg(sport, theme as "light" | "dark");
  const cardBg = hasPhoto && dominantColor ? dominantColor : fallbackBg;
  const cardIsDark = isDark || hasPhoto;

  const textPrimary = cardIsDark ? "#ffffff" : "#111111";
  const textSecondary = cardIsDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const textTertiary = cardIsDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";
  const surfaceLight = cardIsDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";
  const surfaceFaint = cardIsDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
  const progressTrack = cardIsDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const progressFill = "linear-gradient(90deg, #000000 0%, #555555 100%)";
  const viewBtnBorder = cardIsDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";

  const openEvent = () => {
    const onHome = window.location.pathname === "/" || window.location.pathname === "/mobile";
    markNavReturn(onHome ? mobilePanelReturnPath("events") : "/events");
    setLocation(eventDetailPath(String(ev.id), ev.sport));
  };

  const openOnMap = () => {
    setLocation(mapPath({ type: "event", id: String(ev.id) }));
  };

  const openViewRoute = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const coordinates = await resolveEventRouteCoordinates(ev);
    storeMapRouteFocus({
      id: String(ev.id),
      title: String(ev.title ?? "Event"),
      sportType: String(sport ?? ev.sport ?? "Running"),
      coordinates,
    });
    setLocation(mapPath({ type: "event", id: String(ev.id) }));
  };

  const showViewRoute = isRouteSport(sport ?? ev.sport);

  const primaryLabel = (() => {
    if (rsvp.isPending) return "...";
    if (isFull) return "Join waitlist";
    if (priceLabel && priceLabel !== "Free") return `Get tickets · ${priceLabel}`;
    return "I'm going";
  })();

  const metaParts = [whenLabel, ev.location, distanceLabel].filter(Boolean);
  const statusNote =
    countdownLabel ||
    (spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5 ? `${spotsLeft} spots left` : null) ||
    (isFull ? "Full" : null);

  return (
    <>
      <div
        className="card-spotify relative overflow-hidden cursor-pointer group active:scale-[0.97] transition-transform duration-200"
        style={{ padding: "20px", background: cardBg }}
        onClick={openEvent}
      >
        {hasPhoto && (
          <>
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "blur(2px) saturate(1.1)", transform: "scale(1.05)" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: dominantColor ? `${dominantColor}55` : "rgba(0,0,0,0.35)" }}
            />
          </>
        )}

        <CardMenu />

        <div className="relative z-[2]">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {sport && (
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm"
                style={{ background: surfaceLight, color: textSecondary }}
              >
                {sport}
              </span>
            )}
            {priceLabel && (
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm"
                style={{ background: surfaceLight, color: textSecondary }}
              >
                {priceLabel}
              </span>
            )}
          </div>

          <h3
            className="text-lg font-bold leading-tight mb-1 line-clamp-2 drop-shadow-sm"
            style={{ color: textPrimary }}
          >
            {ev.title}
          </h3>

          {metaParts.length > 0 && (
            <p className="text-[13px] leading-snug mb-1 line-clamp-2" style={{ color: textSecondary }}>
              {metaParts.join(" · ")}
            </p>
          )}

          {statusNote && (
            <p className="text-[12px] font-medium mb-2" style={{ color: textTertiary }}>
              {statusNote}
            </p>
          )}

          {ev.description && (
            <p className="text-[13px] leading-snug mb-3 line-clamp-2" style={{ color: textSecondary }}>
              {ev.description}
            </p>
          )}

          <div className="mb-3">
            <CardAttendeeStrip
              entityType="event"
              entityId={String(ev.id)}
              fallbackCount={goingCount > 0 ? goingCount : undefined}
            />
          </div>

          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5 shrink-0">
              <Users size={13} style={{ color: textSecondary }} />
              <span className="text-xs font-semibold" style={{ color: textPrimary }}>
                {goingCount}
              </span>
              {capacity > 0 && (
                <span className="text-xs" style={{ color: textTertiary }}>
                  / {capacity}
                </span>
              )}
            </div>
            {capacity > 0 && (
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: progressTrack }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${fillPercent}%`, background: progressFill }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex-1 h-9 rounded-full text-[13px] font-bold transition-all duration-200 active:scale-[0.96] border-none"
              style={{
                background: cardIsDark ? "#ffffff" : "#111111",
                color: cardIsDark ? "#000000" : "#ffffff",
              }}
              onClick={(e) => {
                e.stopPropagation();
                rsvp.mutate({
                  status: isFull ? "waitlist" : "going",
                  issueTicket: !isFull && !!priceLabel && priceLabel !== "Free",
                });
              }}
              disabled={rsvp.isPending}
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              className="h-9 px-4 rounded-full text-[13px] font-semibold transition-all duration-200 active:scale-[0.96] backdrop-blur-sm"
              style={{
                background: surfaceFaint,
                color: textSecondary,
                border: `1px solid ${viewBtnBorder}`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                openEvent();
              }}
            >
              View
            </button>
            {showViewRoute && (
              <button
                type="button"
                className="h-9 px-4 rounded-full text-[13px] font-semibold transition-all duration-200 active:scale-[0.96] backdrop-blur-sm"
                style={{
                  background: surfaceFaint,
                  color: textSecondary,
                  border: `1px solid ${viewBtnBorder}`,
                }}
                onClick={openViewRoute}
              >
                View Route
              </button>
            )}
            {(ev.location || eventCoords) && (
              <button
                type="button"
                className="h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-[0.96] backdrop-blur-sm"
                style={{
                  background: surfaceFaint,
                  color: textSecondary,
                  border: `1px solid ${viewBtnBorder}`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  openOnMap();
                }}
                aria-label="View on map"
              >
                <MapPin size={15} />
              </button>
            )}
          </div>
        </div>

        {!hasPhoto && (
          <div
            className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-base z-[2]"
            style={{ background: surfaceLight }}
          >
            {sportConfig.emoji}
          </div>
        )}
      </div>

      <ActivityPeopleSheet
        open={peopleOpen}
        onClose={() => setPeopleOpen(false)}
        kind="event"
        entityId={String(ev.id)}
        title={ev.title}
        subtitle={ev.location || ev.venueName}
        route={`/events/${ev.id}`}
        previewPeople={attendeePreview}
      />
    </>
  );
}
