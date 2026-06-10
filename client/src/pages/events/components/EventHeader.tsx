import {
  Calendar,
  CheckCircle,
  Heart,
  MapPin,
  Share2,
  Ticket,
  Users,
} from "lucide-react";
import { getSportConfig } from "@/components/TeamCard";
import { AvatarStack } from "@/components/people/AvatarStack";
import type { ActivityPerson } from "@/lib/activityPeople";

type EventHeaderProps = {
  title: string;
  sport: string | null;
  sportEmoji: string;
  accentColor: string;
  coverUrl: string | null;
  whenLine: string | null;
  countdownLabel: string | null;
  priceLabel: string | null;
  location?: string | null;
  goingCount: number;
  interestedCount: number;
  capacity: number;
  spotsLeft: number | null;
  isFull: boolean;
  fillPercent: number;
  attendeePreview: ActivityPerson[];
  rsvpStatus: string | null;
  rsvpLoading: boolean;
  needsTicket: boolean;
  primaryCta: string;
  onPrimaryRsvp: () => void;
  onInterested: () => void;
  onShare: () => void;
  onCalendar: () => void;
  onMap: () => void;
  onQr: () => void;
};

export default function EventHeader({
  title,
  sport,
  sportEmoji,
  accentColor,
  coverUrl,
  whenLine,
  countdownLabel,
  priceLabel,
  location,
  goingCount,
  interestedCount,
  capacity,
  spotsLeft,
  isFull,
  fillPercent,
  attendeePreview,
  rsvpStatus,
  rsvpLoading,
  needsTicket,
  primaryCta,
  onPrimaryRsvp,
  onInterested,
  onShare,
  onCalendar,
  onMap,
  onQr,
}: EventHeaderProps) {
  const config = getSportConfig(sport);

  return (
    <div className="spotify-hero-inner">
      <div
        className="w-28 h-28 rounded-3xl overflow-hidden mb-5 shadow-2xl relative"
        style={{ boxShadow: `0 16px 48px ${accentColor}44` }}
      >
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{
              background: `linear-gradient(135deg, ${config.colors[0]}88, ${config.colors[1]}88)`,
            }}
          >
            {sportEmoji}
          </div>
        )}
      </div>

      <h1 className="text-[26px] font-extrabold leading-tight mb-2 text-foreground">{title}</h1>

      <div className="flex items-center gap-2 mb-3 flex-wrap justify-center">
        {sport && (
          <span
            className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider"
            style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}
          >
            {sportEmoji} {sport}
          </span>
        )}
        {priceLabel && (
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-muted/50 text-muted-foreground">
            {priceLabel}
          </span>
        )}
        {countdownLabel && (
          <span
            className="px-3 py-1 rounded-full text-[11px] font-semibold text-white"
            style={{ background: accentColor }}
          >
            {countdownLabel}
          </span>
        )}
      </div>

      {whenLine && (
        <p className="text-[14px] text-muted-foreground mb-2 flex items-center gap-1.5 justify-center">
          <Calendar size={13} />
          {whenLine}
        </p>
      )}

      {location && (
        <p className="text-[12px] text-muted-foreground mb-4 flex items-center gap-1 justify-center max-w-sm">
          <MapPin size={11} className="shrink-0" />
          <span className="line-clamp-2">{location}</span>
        </p>
      )}

      <div className="spotify-stats-pill">
        <div className="text-center">
          <p className="text-[17px] font-bold text-foreground">{goingCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Going</p>
        </div>
        <div className="w-px h-8 bg-muted/40" />
        <div className="text-center">
          <p className="text-[17px] font-bold text-foreground">{interestedCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Interested</p>
        </div>
        <div className="w-px h-8 bg-muted/40" />
        <div className="text-center">
          <p className="text-[17px] font-bold text-foreground">
            {capacity > 0 ? capacity : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Capacity</p>
        </div>
        <div className="w-px h-8 bg-muted/40" />
        <div className="text-center">
          <p className="text-[17px] font-bold text-foreground">
            {spotsLeft !== null ? (isFull ? "Full" : spotsLeft) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Spots</p>
        </div>
      </div>

      {capacity > 0 && (
        <div className="w-full max-w-sm mt-3 h-1.5 rounded-full overflow-hidden bg-muted/40">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${fillPercent}%`, background: accentColor }}
          />
        </div>
      )}

      {attendeePreview.length > 0 && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <AvatarStack people={attendeePreview} max={6} size={32} overlap={10} />
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Users size={11} />
            {goingCount} attending
          </p>
        </div>
      )}

      <div className="flex items-center gap-2.5 w-full max-w-sm mt-5">
        <button
          type="button"
          disabled={rsvpLoading}
          onClick={onPrimaryRsvp}
          className="flex-1 h-12 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.96] disabled:opacity-60"
          style={{
            background: accentColor,
            color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            boxShadow: `0 8px 24px ${accentColor}44`,
          }}
        >
          {needsTicket && rsvpStatus !== "going" ? (
            <Ticket size={16} />
          ) : rsvpStatus === "going" ? (
            <CheckCircle size={16} />
          ) : null}
          {primaryCta}
        </button>
        <button
          type="button"
          disabled={rsvpLoading}
          onClick={onInterested}
          className="h-12 px-5 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all active:scale-[0.96] bg-muted/60 hover:bg-muted text-foreground border border-border backdrop-blur-sm disabled:opacity-60"
        >
          <Heart size={15} className={rsvpStatus === "interested" ? "fill-current text-red-400" : ""} />
          Interested
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
        <SecondaryChip label="Calendar" onClick={onCalendar} />
        <SecondaryChip label="Map" onClick={onMap} />
        <SecondaryChip label="Share" onClick={onShare} />
        <SecondaryChip label="QR" onClick={onQr} />
      </div>
    </div>
  );
}

function SecondaryChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 px-4 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all active:scale-[0.96] bg-muted/40 text-muted-foreground border border-border backdrop-blur-sm"
    >
      {label === "Share" && <Share2 size={13} />}
      {label === "Map" && <MapPin size={13} />}
      {label === "Calendar" && <Calendar size={13} />}
      {label}
    </button>
  );
}

export function eventAccentColor(extracted: string | null, sport: string | null): string {
  if (extracted) return extracted;
  return getSportConfig(sport).ringColor;
}
