import { useLocation } from "wouter";
import { Star, Calendar } from "lucide-react";
import type { CoachWithProfile } from "@shared/schema";
import { formatPlanPrice } from "@shared/coachProfile";
import { getSportConfig } from "@/components/TeamCard";
import { ROUTES } from "@/navigation";
import CoachVerificationBadge from "@/components/coaches/CoachVerificationBadge";

type Props = {
  coach: CoachWithProfile;
};

/** Spotify-style wide “episode” card for featured picks */
export default function CoachWideCard({ coach }: Props) {
  const [, setLocation] = useLocation();
  const photo = coach.profile?.coverImageUrl || coach.user.profileImageUrl;
  const sport = coach.specialties?.[0] || coach.user.sport || "Coach";
  const config = getSportConfig(sport);
  const hourly = coach.hourlyRate ? parseFloat(coach.hourlyRate) : 0;
  const plan = coach.profile?.pricingPlans?.find((p) => p.highlighted);
  const priceLabel = plan ? formatPlanPrice(plan) : hourly > 0 ? `€${hourly.toFixed(0)}/hr` : "Book";
  const rating = coach.profile?.rating ?? 0;

  return (
    <button
      type="button"
      onClick={() => setLocation(ROUTES.coach(coach.id))}
      className="flex shrink-0 items-center gap-3 p-2.5 pr-4 rounded-md active:scale-[0.98] transition-transform text-left"
      style={{
        width: 280,
        background: "var(--surna-elevated)",
        border: "1px solid var(--surna-border)",
      }}
    >
      <div
        className="w-[72px] h-[72px] rounded-sm overflow-hidden shrink-0"
        style={{ background: "var(--surna-border)" }}
      >
        {photo ? (
          <img src={photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">{config.emoji}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <p className="text-[13px] font-bold truncate" style={{ color: "var(--surna-text)" }}>
            {coach.user.firstName} {coach.user.lastName}
          </p>
          <CoachVerificationBadge coach={coach} size="sm" />
        </div>
        <p className="text-[11px] truncate mb-1" style={{ color: "var(--surna-text-secondary)" }}>
          {coach.profile?.tagline || `${sport} coaching`}
        </p>
        <div className="flex items-center gap-2 text-[10px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>
          {rating > 0 ? (
            <span className="flex items-center gap-0.5">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>
          ) : null}
          <span>{priceLabel}</span>
        </div>
      </div>
      <span
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: "#1DB954", color: "#000" }}
        onClick={(e) => {
          e.stopPropagation();
          setLocation(`${ROUTES.coach(coach.id)}?tab=book`);
        }}
      >
        <Calendar size={14} />
      </span>
    </button>
  );
}
