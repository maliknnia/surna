import { Star } from "lucide-react";
import type { MouseEvent } from "react";
import CoachVerificationBadge from "@/components/coaches/CoachVerificationBadge";
import { useLocation } from "wouter";
import type { CoachWithProfile } from "@shared/schema";
import { formatPlanPrice } from "@shared/coachProfile";
import { getSportConfig } from "@/components/TeamCard";
import { ROUTES } from "@/navigation";
import { markNavReturn } from "@/lib/navigation";
import SpotifyPlaylistCard from "@/components/cards/SpotifyPlaylistCard";
import { useDiscoveryCardBg } from "@/hooks/useDiscoveryCardBg";

interface CoachCardProps {
  coach: CoachWithProfile;
  compact?: boolean;
  embedded?: boolean;
}

/** Discovery coach card — same elevated playlist surface as teams/venues. */
export default function CoachCard({ coach, compact = false, embedded = false }: CoachCardProps) {
  const [, setLocation] = useLocation();
  const profile = coach.profile;
  const portrait = coach.user.profileImageUrl || profile?.coverImageUrl;
  const cover = profile?.coverImageUrl || coach.user.profileImageUrl;
  const sport = coach.specialties?.[0] || coach.user.sport || "Coach";
  const config = getSportConfig(sport);
  const cardBg = useDiscoveryCardBg(cover || portrait, sport);

  const hourly = coach.hourlyRate ? parseFloat(coach.hourlyRate) : 0;
  const highlighted = profile?.pricingPlans?.find((p) => p.highlighted) || profile?.pricingPlans?.[0];
  const priceLabel =
    highlighted ? formatPlanPrice(highlighted) : hourly > 0 ? `€${hourly.toFixed(0)}/hr` : "Book";
  const rating = profile?.rating ?? 0;
  const fullName = [coach.user.firstName, coach.user.lastName].filter(Boolean).join(" ") || "Coach";
  const tagline = profile?.tagline || coach.bio || undefined;

  const navigateCoach = (path: string) => {
    if (embedded) markNavReturn("/discover");
    setLocation(path);
  };
  const openProfile = () => navigateCoach(ROUTES.coach(coach.id));
  const openBook = (e: MouseEvent) => {
    e.stopPropagation();
    navigateCoach(`${ROUTES.coach(coach.id)}?tab=book`);
  };

  const metaParts = [
    rating > 0 ? `★ ${rating.toFixed(1)}` : null,
    priceLabel,
    coach.user.location || null,
  ].filter(Boolean);

  if (compact) {
    return (
      <div style={{ width: 280 }} className="shrink-0">
        <SpotifyPlaylistCard
          title={fullName}
          subtitle={sport}
          meta={metaParts.join(" · ")}
          imageUrl={portrait}
          fallbackIcon={<span className="text-xl">{config.emoji}</span>}
          backgroundColor={cardBg}
          backdrop="solid"
          onCardClick={openProfile}
          primaryAction={{ label: "Book", onClick: openBook }}
          menu={<CoachVerificationBadge coach={coach} size="sm" />}
        />
      </div>
    );
  }

  return (
    <SpotifyPlaylistCard
      title={fullName}
      subtitle={sport}
      meta={[tagline, ...metaParts].filter(Boolean).join(" · ")}
      imageUrl={portrait}
      fallbackIcon={<span className="text-2xl">{config.emoji}</span>}
      backgroundColor={cardBg}
      backdrop="solid"
      onCardClick={openProfile}
      thumbSize="large"
      primaryAction={{ label: "Book session", onClick: openBook }}
      menu={<CoachVerificationBadge coach={coach} size="sm" />}
      extraContent={
        rating > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold opacity-80">
            <Star size={11} className="fill-current" />
            {rating.toFixed(1)}
          </span>
        ) : null
      }
    />
  );
}
