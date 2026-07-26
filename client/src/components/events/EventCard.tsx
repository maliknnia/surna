import { useState, useEffect, type MouseEvent } from "react";
import { useRSVP } from "@/hooks/useEvents";
import { MapPin, Navigation, Plus, Sparkles, Users } from "lucide-react";
import { eventDetailPath, isRouteSport, resolveEventRouteCoordinates, storeMapRouteFocus } from "@/lib/eventRoutes";
import { mapPath } from "@/lib/mapNavigation";
import { useLocation } from "wouter";
import { markNavReturn, mobilePanelReturnPath } from "@/lib/navigation";
import CardMenu from "../CardMenu";
import { calculateDistance } from "@/lib/geo";
import { CardAttendeeStrip } from "@/components/people/CardAttendeeStrip";
import { getSportConfig } from "@/components/TeamCard";
import { getEventCoverUrl } from "@/lib/eventCover";
import SpotifyPlaylistCard from "@/components/cards/SpotifyPlaylistCard";
import { useDiscoveryCardBg } from "@/hooks/useDiscoveryCardBg";
import { isLightHex } from "@/lib/colorUtils";
import { normalizeEventFormat, EVENT_FORMAT_META } from "@shared/eventFormats";
import { eventTicketPriceLabel, isPaidTicketEvent } from "@shared/eventTicketPricing";

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
  return eventTicketPriceLabel(ev);
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
  const [interested, setInterested] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const isRecommended = Boolean(
    ev.recommended || ev.isRecommended || ev.featured || ev.isFeatured || ev.is_featured,
  );

  const sport = inferSport(ev);
  const eventFormat = normalizeEventFormat(ev.event_format ?? ev.eventFormat);
  const sportConfig = getSportConfig(sport);
  const coverUrl = getEventCoverUrl(ev);

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

  const cardBg = useDiscoveryCardBg(coverUrl, sport);
  const hasPhoto = Boolean(coverUrl?.trim());
  // Blurred photo backdrop always uses light text on a dark scrim
  const lightCard = hasPhoto ? false : isLightHex(cardBg);
  const textPrimary = lightCard ? "#121212" : "#ffffff";
  const textMuted = lightCard ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)";
  const progressTrack = lightCard ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";

  const openEvent = () => {
    const onHome = window.location.pathname === "/" || window.location.pathname === "/mobile";
    markNavReturn(onHome ? mobilePanelReturnPath("events") : "/events");
    setLocation(eventDetailPath(String(ev.id), ev.sport, eventFormat));
  };

  const openOnMap = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
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
    if (isPaidTicketEvent(ev)) return `Get tickets · ${priceLabel ?? "Paid"}`;
    return "I'm going";
  })();

  const metaParts = [
    whenLabel,
    ev.location,
    distanceLabel,
    countdownLabel,
    spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5 ? `${spotsLeft} spots left` : null,
    isFull ? "Full" : null,
    priceLabel,
  ].filter(Boolean);

  const subtitleParts = [
    eventFormat !== "open" ? EVENT_FORMAT_META[eventFormat].shortLabel : null,
    sport ? String(sport) : null,
    isRecommended ? "Recommended" : null,
  ].filter(Boolean);

  return (
    <>
      <SpotifyPlaylistCard
        title={ev.title}
        subtitle={subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined}
        meta={metaParts.join(" · ")}
        imageUrl={coverUrl}
        fallbackIcon={sportConfig.emoji}
        backgroundColor={cardBg}
        onCardClick={openEvent}
        menu={<CardMenu inline />}
        extraContent={
          <>
            <CardAttendeeStrip
              entityType="event"
              entityId={String(ev.id)}
              fallbackCount={goingCount > 0 ? goingCount : undefined}
            />
            {capacity > 0 ? (
              <div className="flex items-center gap-2 mt-2">
                <Users size={13} style={{ color: textMuted }} />
                <span className="text-xs font-semibold" style={{ color: textPrimary }}>
                  {goingCount}
                </span>
                <span className="text-xs" style={{ color: textMuted }}>
                  / {capacity}
                </span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: progressTrack }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${fillPercent}%`,
                      background: lightCard
                        ? "linear-gradient(90deg, #121212 0%, rgba(0,0,0,0.45) 100%)"
                        : "linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.5) 100%)",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </>
        }
        primaryAction={{
          label: primaryLabel,
          icon: isRecommended ? <Sparkles size={14} /> : undefined,
          onClick: (e) => {
            e.stopPropagation();
            rsvp.mutate({
              status: isFull ? "waitlist" : "going",
              issueTicket: !isFull && isPaidTicketEvent(ev),
            });
          },
          disabled: rsvp.isPending,
        }}
        secondaryActions={[
          {
            icon: <Plus size={16} />,
            label: interested ? "Interested" : "Mark interested",
            ariaLabel: "Mark interested",
            active: interested,
            disabled: rsvp.isPending || interested,
            onClick: (e) => {
              e.stopPropagation();
              rsvp.mutate({ status: "interested" }, { onSuccess: () => setInterested(true) });
            },
          },
          ...(showViewRoute
            ? [
                {
                  icon: <Navigation size={15} />,
                  label: "View route",
                  ariaLabel: "View route",
                  onClick: openViewRoute,
                },
              ]
            : []),
          ...((ev.location || eventCoords) && !showViewRoute
            ? [
                {
                  icon: <MapPin size={15} />,
                  label: "View on map",
                  ariaLabel: "View on map",
                  onClick: openOnMap,
                },
              ]
            : []),
        ]}
      />
    </>
  );
}
