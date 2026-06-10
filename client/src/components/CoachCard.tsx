import { Star } from "lucide-react";
import CoachVerificationBadge from "@/components/coaches/CoachVerificationBadge";
import { useLocation } from "wouter";
import type { CoachWithProfile } from "@shared/schema";
import { formatPlanPrice } from "@shared/coachProfile";
import { sportCardBg, getSportColor } from "@/lib/sportColors";
import { getSportConfig } from "@/components/TeamCard";
import { useTheme } from "@/contexts/ThemeContext";
import { ROUTES } from "@/navigation";
import { markNavReturn } from "@/lib/navigation";

interface CoachCardProps {
  coach: CoachWithProfile;
  compact?: boolean;
  embedded?: boolean;
}

/** Discovery card — same Spotify-style pattern as TeamCard / VenueCard. Sport tint only (no photo pink flood). */
export default function CoachCard({ coach, compact = false, embedded = false }: CoachCardProps) {
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const mode = theme as "light" | "dark";
  const profile = coach.profile;
  const photo = profile?.coverImageUrl || coach.user.profileImageUrl;
  const sport = coach.specialties?.[0] || coach.user.sport || "Coach";
  const config = getSportConfig(sport);
  const sportTone = getSportColor(sport);
  const cardBg = sportCardBg(sport, mode);
  const hasPhoto = Boolean(photo);
  const cardIsDark = isDark || hasPhoto;
  const overlayColor = `${sportTone.dark}66`;

  const textPrimary = cardIsDark ? "#ffffff" : "#111111";
  const textSecondary = cardIsDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const surfaceLight = cardIsDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";
  const viewBtnBorder = cardIsDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";

  const hourly = coach.hourlyRate ? parseFloat(coach.hourlyRate) : 0;
  const highlighted = profile?.pricingPlans?.find((p) => p.highlighted) || profile?.pricingPlans?.[0];
  const priceLabel =
    highlighted ? formatPlanPrice(highlighted) : hourly > 0 ? `€${hourly.toFixed(0)}/hr` : "Book";
  const rating = profile?.rating ?? 0;

  const navigateCoach = (path: string) => {
    if (embedded) markNavReturn("/discover");
    setLocation(path);
  };
  const openProfile = () => navigateCoach(ROUTES.coach(coach.id));
  const openBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigateCoach(`${ROUTES.coach(coach.id)}?tab=book`);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={openProfile}
        className="card-spotify relative shrink-0 overflow-hidden text-left active:scale-[0.97] transition-transform duration-200"
        style={{ width: 260, padding: 14, background: cardBg }}
      >
        {hasPhoto && (
          <>
            <img
              src={photo!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "blur(2px) saturate(1.05)", transform: "scale(1.05)" }}
              loading="lazy"
            />
            <div className="absolute inset-0" style={{ background: overlayColor }} />
          </>
        )}
        <div className="relative z-[1] flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center text-xl"
            style={{ background: surfaceLight, backdropFilter: "blur(8px)" }}
          >
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              config.emoji
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold truncate" style={{ color: textPrimary }}>
              {coach.user.firstName} {coach.user.lastName}
            </p>
            <p className="text-[11px] truncate" style={{ color: textSecondary }}>
              {sport}
            </p>
          </div>
          <span
            className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: cardIsDark ? "#ffffff" : "#111111", color: cardIsDark ? "#000000" : "#ffffff" }}
          >
            {priceLabel}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div
      className="card-spotify relative overflow-hidden cursor-pointer active:scale-[0.97] transition-transform duration-200"
      style={{ padding: 20, background: cardBg }}
      onClick={openProfile}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && openProfile()}
    >
      {hasPhoto && (
        <>
          <img
            src={photo!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ filter: "blur(2px) saturate(1.05)", transform: "scale(1.05)" }}
            loading="lazy"
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: overlayColor }} />
        </>
      )}

      <div className="relative z-[2]">
        <div className="flex items-start gap-4 mb-3">
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center text-2xl"
            style={{ background: surfaceLight, backdropFilter: "blur(8px)" }}
          >
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              config.emoji
            )}
          </div>
          <div className="flex-1 min-w-0 min-h-[4rem]">
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="text-lg font-bold leading-tight truncate" style={{ color: textPrimary }}>
                {coach.user.firstName} {coach.user.lastName}
              </h3>
              <CoachVerificationBadge coach={coach} size="sm" />
            </div>
            <span
              className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm"
              style={{ background: surfaceLight, color: textSecondary }}
            >
              {sport}
            </span>
          </div>
        </div>

        {(profile?.tagline || coach.bio) && (
          <p className="text-[13px] leading-snug mb-3 line-clamp-2" style={{ color: textSecondary }}>
            {profile?.tagline || coach.bio}
          </p>
        )}

        <div className="flex items-center gap-2 mb-4 text-[12px] font-semibold flex-wrap" style={{ color: textSecondary }}>
          {rating > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: surfaceLight }}>
              <Star size={11} className="fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>
          )}
          <span>{priceLabel}</span>
          {coach.user.location && <span className="truncate opacity-80">{coach.user.location}</span>}
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="flex-1 h-9 rounded-full text-[13px] font-bold transition-all duration-200 active:scale-[0.96] border-none"
            style={{ background: cardIsDark ? "#ffffff" : "#111111", color: cardIsDark ? "#000000" : "#ffffff" }}
            onClick={openBook}
          >
            Book session
          </button>
          <button
            type="button"
            className="h-9 px-4 rounded-full text-[13px] font-semibold transition-all duration-200 active:scale-[0.96] backdrop-blur-sm"
            style={{
              background: cardIsDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              color: textSecondary,
              border: `1px solid ${viewBtnBorder}`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              openProfile();
            }}
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}
