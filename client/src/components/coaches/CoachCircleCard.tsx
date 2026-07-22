import { useLocation } from "wouter";
import type { CoachWithProfile } from "@shared/schema";
import CoachVerificationBadge, { coachVerificationStatus } from "@/components/coaches/CoachVerificationBadge";
import { ROUTES } from "@/navigation";

type Props = {
  coach: CoachWithProfile;
  size?: number;
};

export default function CoachCircleCard({ coach, size = 88 }: Props) {
  const [, setLocation] = useLocation();
  const photo = coach.user.profileImageUrl || coach.profile?.coverImageUrl;
  const initials = `${coach.user.firstName?.[0] ?? ""}${coach.user.lastName?.[0] ?? ""}`.trim() || "C";
  const name = coach.user.firstName
    ? `${coach.user.firstName}${coach.user.lastName ? ` ${coach.user.lastName[0]}.` : ""}`
    : "Coach";
  const sport = coach.specialties?.[0] || coach.user.sport || "Coach";
  const hourly = coach.hourlyRate ? parseFloat(coach.hourlyRate) : 0;
  const verification = coachVerificationStatus(coach);
  const showBadge = verification === "verified" || verification === "pending";

  return (
    <button
      type="button"
      onClick={() => setLocation(ROUTES.coach(coach.id))}
      className="flex flex-col items-center shrink-0 active:scale-[0.97] transition-transform w-full touch-manipulation"
    >
      <div className="relative mb-2.5">
        <div
          className="rounded-full overflow-hidden mx-auto"
          style={{
            width: size,
            height: size,
            background: "var(--surna-elevated)",
            border: "1px solid var(--surna-border)",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.06)",
          }}
        >
          {photo ? (
            <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[18px] font-semibold"
              style={{ background: "var(--surna-surface)", color: "var(--surna-text-secondary)" }}
            >
              {initials}
            </div>
          )}
        </div>
        {showBadge ? (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: "var(--surna-elevated)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              border: "1px solid var(--surna-border)",
            }}
          >
            <CoachVerificationBadge coach={coach} size="sm" />
          </div>
        ) : null}
      </div>
      <span
        className="text-[12px] font-semibold text-center leading-snug line-clamp-2 w-full"
        style={{ color: "var(--surna-text)" }}
      >
        {name}
      </span>
      <span
        className="text-[11px] text-center line-clamp-1 w-full mt-0.5"
        style={{ color: "var(--surna-text-secondary)" }}
      >
        {sport}
        {hourly > 0 ? ` · €${hourly.toFixed(0)}/hr` : ""}
      </span>
    </button>
  );
}
