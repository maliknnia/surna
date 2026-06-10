import { useLocation } from "wouter";
import type { CoachWithProfile } from "@shared/schema";
import CoachVerificationBadge from "@/components/coaches/CoachVerificationBadge";
import { ROUTES } from "@/navigation";

type Props = {
  coach: CoachWithProfile;
  size?: number;
};

export default function CoachCircleCard({ coach, size = 88 }: Props) {
  const [, setLocation] = useLocation();
  const photo = coach.profile?.coverImageUrl || coach.user.profileImageUrl;
  const initials = `${coach.user.firstName?.[0] ?? ""}${coach.user.lastName?.[0] ?? ""}`;
  const name = coach.user.firstName
    ? `${coach.user.firstName}${coach.user.lastName ? ` ${coach.user.lastName[0]}.` : ""}`
    : "Coach";

  return (
    <button
      type="button"
      onClick={() => setLocation(ROUTES.coach(coach.id))}
      className="flex flex-col items-center shrink-0 active:scale-95 transition-transform"
      style={{ width: size }}
    >
      <div className="relative mb-2">
        <div
          className="rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-transparent"
          style={{
            width: size,
            height: size,
            background: "var(--surna-elevated)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          {photo ? (
            <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[22px] font-bold"
              style={{ background: "linear-gradient(135deg, #1DB954 0%, #121212 100%)", color: "#fff" }}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">
          <CoachVerificationBadge coach={coach} size="sm" />
        </div>
      </div>
      <span
        className="text-[11px] font-semibold text-center leading-tight line-clamp-2 w-full"
        style={{ color: "var(--surna-text)" }}
      >
        {name}
      </span>
    </button>
  );
}
