import { MapPin, Star, MessageCircle, Calendar, Settings, Clock } from "lucide-react";
import { getSportConfig } from "@/components/TeamCard";
import CoachVerificationBadge from "@/components/coaches/CoachVerificationBadge";
import type { CoachWithProfile } from "@shared/schema";
import type { CoachProfileExtras } from "@shared/coachProfile";

interface SportConfig {
  emoji: string;
  colors: [string, string];
  ringColor: string;
}

type CoachHeaderProps = {
  coach: CoachWithProfile;
  profile: CoachProfileExtras;
  sportConfig: SportConfig;
  accentColor: string;
  openSlots: number;
  reviewCount: number;
  isOwnCoach: boolean;
  canBookSlots: boolean;
  chatPending: boolean;
  verificationPending: boolean;
  onMessage: () => void;
  onBook: () => void;
  onEdit: () => void;
  onReviews: () => void;
};

export default function CoachHeader({
  coach,
  profile,
  sportConfig,
  accentColor,
  openSlots,
  reviewCount,
  isOwnCoach,
  canBookSlots,
  chatPending,
  verificationPending,
  onMessage,
  onBook,
  onEdit,
  onReviews,
}: CoachHeaderProps) {
  const sport = coach.specialties?.[0] || coach.user.sport || "Coach";
  const photo = profile.coverImageUrl || coach.user.profileImageUrl;
  const initials = `${coach.user.firstName?.[0] ?? ""}${coach.user.lastName?.[0] ?? ""}`;
  const rating = profile.rating ?? 0;

  return (
    <div className="spotify-hero-inner">
      <div className="spotify-album-art">
        {photo ? (
          <img src={photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-7xl font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${sportConfig.colors[0]}88, ${sportConfig.colors[1]}88)`,
            }}
          >
            {initials || sportConfig.emoji}
          </div>
        )}
        <div
          className="spotify-album-shadow"
          style={{ boxShadow: `0 24px 64px ${accentColor}44, 0 12px 32px rgba(0,0,0,0.6)` }}
        />
      </div>

      <h1 className="text-[28px] font-extrabold text-foreground leading-tight mt-6 mb-2 tracking-tight">
        {coach.user.firstName} {coach.user.lastName}
      </h1>

      <div className="flex items-center gap-2 mb-3 flex-wrap justify-center">
        <span
          className="spotify-sport-badge"
          style={{
            background: `${accentColor}18`,
            color: accentColor,
            border: `1px solid ${accentColor}30`,
          }}
        >
          {sportConfig.emoji} {sport}
        </span>
        <CoachVerificationBadge coach={coach} size="md" showLabel />
      </div>

      {profile.tagline ? (
        <p className="text-[14px] text-muted-foreground mb-2 max-w-md leading-snug">{profile.tagline}</p>
      ) : null}

      {coach.user.location ? (
        <span className="flex items-center gap-1 text-[12px] text-muted-foreground mb-5">
          <MapPin size={11} />
          {coach.user.location}
        </span>
      ) : null}

      <div className="spotify-stats-pill">
        <div className="text-center">
          <div className="flex items-center gap-1 justify-center">
            <Star size={14} style={{ color: "#FFD700" }} />
            <p className="text-[17px] font-bold text-foreground">{rating > 0 ? rating.toFixed(1) : "—"}</p>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rating</p>
        </div>
        <div className="w-px h-8 bg-muted/40" />
        <div className="text-center">
          <p className="text-[17px] font-bold text-foreground">
            {coach.experience ? `${coach.experience}y` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Experience</p>
        </div>
        <div className="w-px h-8 bg-muted/40" />
        <div className="text-center">
          <p className="text-[17px] font-bold text-foreground">{openSlots}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Open slots</p>
        </div>
        <div className="w-px h-8 bg-muted/40" />
        <button type="button" onClick={onReviews} className="text-center active:opacity-70 transition-opacity">
          <p className="text-[17px] font-bold text-foreground">{reviewCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reviews</p>
        </button>
      </div>

      {!isOwnCoach ? (
        <div className="flex items-center gap-2.5 w-full max-w-sm mt-5">
          <button
            type="button"
            onClick={onBook}
            className="flex-1 h-12 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.96]"
            style={{
              background: accentColor,
              color: "#fff",
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              boxShadow: `0 8px 24px ${accentColor}44`,
            }}
          >
            <Calendar size={16} />
            {canBookSlots ? "Book session" : "Enquire"}
          </button>
          <button
            type="button"
            onClick={onMessage}
            disabled={chatPending}
            className="h-12 px-5 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all active:scale-[0.96] bg-muted/60 hover:bg-muted text-foreground border border-border backdrop-blur-sm disabled:opacity-60"
          >
            <MessageCircle size={15} />
            Message
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="w-full max-w-sm h-12 mt-5 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.96]"
          style={{
            background: accentColor,
            color: "#fff",
            boxShadow: `0 8px 24px ${accentColor}44`,
          }}
        >
          <Settings size={16} />
          Edit profile & booking
        </button>
      )}

      {isOwnCoach && verificationPending ? (
        <div className="w-full max-w-sm mt-4 px-4 py-3 rounded-2xl text-[12px] leading-snug text-left bg-amber-500/10 border border-amber-500/30 text-muted-foreground">
          <span className="font-bold text-amber-600 dark:text-amber-400">Verification under review.</span>{" "}
          Your profile stays live while we check credentials (usually 24–48 hours).
        </div>
      ) : null}

      {canBookSlots && openSlots > 0 && !isOwnCoach ? (
        <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
          <Clock size={11} />
          {openSlots} open slots in the next 2 weeks
        </p>
      ) : null}
    </div>
  );
}

export function coachSportConfig(sport: string, extractedColor: string | null) {
  const config = getSportConfig(sport);
  if (!extractedColor) return config;
  return {
    ...config,
    colors: [extractedColor, extractedColor] as [string, string],
    ringColor: extractedColor,
  };
}
