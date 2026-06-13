import type { ReactNode } from "react";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Clock, MapPin, Navigation, Users } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSmartBack } from "@/lib/navigation";
import { useToast } from "@/hooks/use-toast";
import { useEvent, useRSVP } from "@/hooks/useEvents";
import { useEventRoute } from "@/hooks/useEventRoute";
import EventRouteMapView from "@/components/events/EventRouteMapView";
import { getSportConfig } from "@/components/TeamCard";
import { findDemoMapPin } from "@/lib/demoMapPins";
import {
  estimateDurationMinutes,
  eventCoordsFromRow,
  formatRouteDuration,
  pathDistanceKm,
} from "@/lib/eventRoutes";
import { routeColorForSport } from "@/components/map/surnaMapRoutes";
import type { Coordinates } from "@/lib/geo";

const FALLBACK_CENTER: Coordinates = { lat: 51.8985, lng: -8.4756 };

function resolveEventCenter(ev: Record<string, unknown>, routeCoords: Coordinates[]): Coordinates {
  const fromRow = eventCoordsFromRow(ev);
  if (fromRow) return fromRow;
  if (routeCoords.length > 0) return routeCoords[0]!;
  const demoPin = findDemoMapPin("event", String(ev.id), FALLBACK_CENTER);
  if (demoPin) return demoPin.coords;
  return FALLBACK_CENTER;
}

export default function EventRoutePage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({ fallback: "/?panel=events" });
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();

  const id = params.id ?? "";
  const { data: evData, isLoading: eventLoading } = useEvent(id);
  const ev = evData as Record<string, unknown> | undefined;
  const sport = String(ev?.sport ?? "");

  const { data: routeCoords = [], isLoading: routeLoading } = useEventRoute(id, sport);
  const rsvpMutation = useRSVP(id);
  const [joined, setJoined] = useState(false);

  const loading = eventLoading || routeLoading;

  const mapCenter = ev ? resolveEventCenter(ev, routeCoords) : FALLBACK_CENTER;
  const hasRoute = routeCoords.length >= 2;
  const distanceKm = hasRoute ? pathDistanceKm(routeCoords) : 0;
  const durationMin = estimateDurationMinutes(sport, distanceKm);
  const goingCount = Number(ev?.going_count ?? 0);
  const organizer = String(ev?.creator_first_name ?? ev?.creator_username ?? "Organiser");
  const accent = routeColorForSport(sport);
  const sportConfig = getSportConfig(sport);

  const handleGoing = () => {
    if (joined || rsvpMutation.isPending) return;

    rsvpMutation.mutate(
      { status: "going", issueTicket: true },
      {
        onSuccess: () => {
          setJoined(true);
          toast({
            title: "You're going!",
            description: `See you at ${String(ev?.title ?? "the event")}.`,
          });

          const chatGroupId =
            (ev?.chat_group_id as string | undefined) ||
            (ev?.chatGroupId as string | undefined);

          setTimeout(() => {
            if (chatGroupId) {
              setLocation(`/messages?groupId=${encodeURIComponent(chatGroupId)}`);
            } else {
              setLocation("/messages");
            }
          }, 700);
        },
        onError: () => {
          toast({
            title: "Could not join",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-[#0b0f14]">
        <div
          className="w-10 h-10 rounded-full border-[3px] animate-spin"
          style={{ borderColor: `${accent}33`, borderTopColor: accent }}
        />
        <p className="text-sm font-medium text-white/60">Loading route…</p>
      </div>
    );
  }

  if (!ev) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center px-6 bg-[#0b0f14]">
        <p className="text-white/60">Event not found</p>
        <button
          type="button"
          onClick={() => setLocation("/events")}
          className="mt-4 px-6 py-3 rounded-full text-sm font-bold text-white"
          style={{ background: accent }}
        >
          Browse events
        </button>
      </div>
    );
  }

  const goingLabel = joined ? "You're going ✓" : rsvpMutation.isPending ? "Joining…" : "Going";

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0b0f14]">
      {/* Map — full bleed behind UI */}
      <div className="absolute inset-0 z-0">
        <EventRouteMapView
          center={mapCenter}
          routeCoordinates={routeCoords}
          sportType={sport}
          isDark={isDark}
        />
      </div>

      {/* Bottom fade so route reads above the sheet */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[42%]"
        style={{
          background: isDark
            ? "linear-gradient(to top, rgba(8,10,14,0.98) 0%, rgba(8,10,14,0.55) 45%, transparent 100%)"
            : "linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.5) 45%, transparent 100%)",
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 pt-[max(12px,env(safe-area-inset-top))] px-4 flex items-center justify-between pointer-events-none">
        <button
          type="button"
          onClick={goBack}
          className="pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl shadow-lg"
          style={{
            background: isDark ? "rgba(15,18,24,0.82)" : "rgba(255,255,255,0.92)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          aria-label="Back"
        >
          <ArrowLeft size={20} className={isDark ? "text-white" : "text-gray-900"} />
        </button>

        {hasRoute && (
          <div
            className="pointer-events-none flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl shadow-lg"
            style={{
              background: isDark ? "rgba(15,18,24,0.82)" : "rgba(255,255,255,0.92)",
              border: `1px solid ${accent}66`,
            }}
          >
            <Navigation size={15} style={{ color: accent }} />
            <span className="text-[13px] font-bold" style={{ color: accent }}>
              {distanceKm.toFixed(1)} km route
            </span>
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.35)]"
        style={{
          background: isDark ? "rgba(14,16,22,0.97)" : "rgba(255,255,255,0.98)",
          borderTop: `3px solid ${accent}`,
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-12 h-1 rounded-full"
            style={{ background: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)" }}
          />
        </div>

        <div className="px-5 pt-1 pb-2">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-md"
              style={{ background: `${accent}22`, border: `1px solid ${accent}55` }}
            >
              {sportConfig.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="text-[20px] font-extrabold leading-snug line-clamp-2"
                style={{ color: isDark ? "#fff" : "#111" }}
              >
                {String(ev.title)}
              </h1>
              <p className="text-[13px] font-semibold mt-0.5" style={{ color: accent }}>
                {sport || "Event"} · {organizer}
              </p>
            </div>
          </div>

          {hasRoute ? (
            <div
              className="flex items-stretch gap-2 mb-4 p-1 rounded-2xl"
              style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
            >
              <HeroStat
                icon={<Navigation size={18} style={{ color: accent }} />}
                value={`${distanceKm.toFixed(1)}`}
                unit="km"
                label="Distance"
                accent={accent}
                isDark={isDark}
              />
              <HeroStat
                icon={<Clock size={18} style={{ color: accent }} />}
                value={formatRouteDuration(durationMin)}
                label="Est. time"
                accent={accent}
                isDark={isDark}
              />
              <HeroStat
                icon={<Users size={18} style={{ color: accent }} />}
                value={String(goingCount)}
                unit="going"
                label="Joined"
                accent={accent}
                isDark={isDark}
              />
            </div>
          ) : (
            <div
              className="flex items-center gap-2 mb-4 px-4 py-3 rounded-2xl text-[13px]"
              style={{
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)",
              }}
            >
              <MapPin size={16} style={{ color: accent }} />
              Route not published yet — showing event location
            </div>
          )}

          {!hasRoute && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <MiniStat label="Participants" value={String(goingCount)} isDark={isDark} />
              <MiniStat label="Organiser" value={organizer} isDark={isDark} />
            </div>
          )}

          <button
            type="button"
            onClick={handleGoing}
            disabled={joined || rsvpMutation.isPending}
            className="w-full h-[52px] rounded-2xl text-[16px] font-extrabold tracking-wide transition-all active:scale-[0.98] disabled:opacity-80 shadow-lg"
            style={{
              background: joined
                ? isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)"
                : `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
              color: joined ? (isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)") : "#fff",
              boxShadow: joined ? "none" : `0 8px 24px ${accent}55`,
            }}
          >
            {goingLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  icon,
  value,
  unit,
  label,
  isDark,
}: {
  icon: ReactNode;
  value: string;
  unit?: string;
  label: string;
  accent: string;
  isDark: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-3 px-1 rounded-xl">
      {icon}
      <p className="mt-1.5 text-[20px] font-black leading-none tabular-nums text-center" style={{ color: isDark ? "#fff" : "#111" }}>
        {value}
        {unit && (
          <span className="text-[13px] font-bold ml-0.5 opacity-70">{unit}</span>
        )}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-45">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-45 mb-0.5">{label}</p>
      <p className="text-[14px] font-bold truncate" style={{ color: isDark ? "#fff" : "#111" }}>
        {value}
      </p>
    </div>
  );
}
