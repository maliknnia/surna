import { useState, useEffect } from "react";
import { MapPin, Star, Play } from "lucide-react";
import { useLocation } from "wouter";
import type { CoachWithProfile } from "@shared/schema";
import { formatPlanPrice } from "@shared/coachProfile";
import CoachVerificationBadge from "@/components/coaches/CoachVerificationBadge";
import { extractDominantColor, getCachedColor } from "@/lib/extractColor";
import { sportCardBg } from "@/lib/sportColors";
import { getSportConfig } from "@/components/TeamCard";
import { useTheme } from "@/contexts/ThemeContext";
import { ROUTES } from "@/navigation";

type Props = {
  coach: CoachWithProfile;
  width?: number;
  showTagline?: boolean;
  fullWidth?: boolean;
};

export default function CoachSquareCard({ coach, width = 152, showTagline = true, fullWidth = false }: Props) {
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const profile = coach.profile;
  const photo = profile?.coverImageUrl || coach.user.profileImageUrl;
  const sport = coach.specialties?.[0] || coach.user.sport || "Coach";
  const config = getSportConfig(sport);
  const [dominantColor, setDominantColor] = useState<string | null>(photo ? getCachedColor(photo) : null);

  useEffect(() => {
    if (!photo) return;
    extractDominantColor(photo).then(setDominantColor);
  }, [photo]);

  const cardBg = photo && dominantColor ? dominantColor : sportCardBg(sport, theme as "light" | "dark");
  const hourly = coach.hourlyRate ? parseFloat(coach.hourlyRate) : 0;
  const plan = profile?.pricingPlans?.find((p) => p.highlighted) || profile?.pricingPlans?.[0];
  const priceLabel = plan ? formatPlanPrice(plan) : hourly > 0 ? `€${hourly.toFixed(0)}/hr` : "Contact";
  const rating = profile?.rating ?? 0;
  const hasVideo = (profile?.media ?? []).some((m) => m.type === "video");

  return (
    <button
      type="button"
      onClick={() => setLocation(ROUTES.coach(coach.id))}
      className="relative shrink-0 rounded-md overflow-hidden text-left active:scale-[0.97] transition-transform group"
      style={{ width: fullWidth ? "100%" : width, aspectRatio: "1 / 1", background: cardBg }}
    >
      {photo ? (
        <>
          <img
            src={photo}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "saturate(1.08)" }}
            loading="lazy"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 35%, ${cardBg}cc 70%, ${cardBg} 100%)`,
            }}
          />
        </>
      ) : null}

      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
        <CoachVerificationBadge coach={coach} size="sm" />
        {hasVideo ? (
          <span className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Play size={10} fill="#fff" className="text-white ml-0.5" />
          </span>
        ) : null}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <p className="text-[13px] font-bold leading-tight line-clamp-1 text-white drop-shadow-md">
          {coach.user.firstName} {coach.user.lastName}
        </p>
        <p className="text-[10px] font-medium text-white/80 truncate">
          {config.emoji} {sport}
          {coach.experience ? ` · ${coach.experience}y` : ""}
        </p>
        {showTagline && profile?.tagline ? (
          <p className="text-[9px] text-white/65 line-clamp-1 mt-0.5">{profile.tagline}</p>
        ) : null}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {rating > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white bg-black/35 rounded-full px-1.5 py-0.5">
              <Star size={9} className="fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>
          ) : null}
          <span className="text-[10px] font-bold text-white bg-black/35 rounded-full px-1.5 py-0.5">
            {priceLabel}
          </span>
        </div>
        {coach.user.location ? (
          <p className="text-[9px] text-white/55 flex items-center gap-0.5 mt-1 truncate">
            <MapPin size={8} className="shrink-0" />
            {coach.user.location}
          </p>
        ) : null}
      </div>
    </button>
  );
}
