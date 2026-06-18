import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { ProfileExtras } from "@/hooks/useProfileExtras";
import { ProfileSectionCard } from "@/components/profile/ProfileSectionCard";
import { Link } from "wouter";
import { ROUTES } from "@/navigation";
import { ChevronRight } from "lucide-react";

const Stats = lazy(() => import("@/pages/profile/sections/Stats"));
const ChallengeHistory = lazy(() => import("@/pages/profile/sections/ChallengeHistory"));

function PanelFallback() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--surna-text-secondary)" }} />
    </div>
  );
}

type ProfileStatsPanelProps = {
  userId: string;
  profileExtras: ProfileExtras;
};

export function ProfileStatsPanel({ userId, profileExtras }: ProfileStatsPanelProps) {
  return (
    <div className="space-y-4">
      <ProfileSectionCard title="At a glance">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Win rate", value: `${profileExtras.winRate}%` },
            { label: "Level", value: String(profileExtras.level), gold: true },
            { label: "Games", value: String(profileExtras.gamesCount) },
            { label: "Rating", value: profileExtras.rating.toFixed(1) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-3"
              style={{ background: "var(--surna-base)", border: "1px solid var(--surna-border)" }}
            >
              <div
                className="text-[22px] font-bold tabular-nums"
                style={{ color: item.gold ? "var(--surna-gold, #f5c518)" : "var(--surna-text)" }}
              >
                {item.value}
              </div>
              <div className="text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
        <Link href={ROUTES.performance}>
          <button
            type="button"
            className="mt-3 w-full flex items-center justify-center gap-1 h-10 rounded-xl text-[13px] font-semibold active:opacity-80"
            style={{ border: "1px solid var(--surna-border)", color: "var(--surna-text)" }}
          >
            Open performance hub
            <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
      </ProfileSectionCard>

      <Suspense fallback={<PanelFallback />}>
        <Stats userId={userId} />
      </Suspense>
    </div>
  );
}

type ProfileGamesPanelProps = {
  userId: string;
};

export function ProfileGamesPanel({ userId }: ProfileGamesPanelProps) {
  return (
    <div className="space-y-4">
      <Link href={ROUTES.challenges}>
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl active:opacity-90"
          style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
        >
          <span className="text-[14px] font-semibold" style={{ color: "var(--surna-text)" }}>
            Browse challenges
          </span>
          <ChevronRight className="w-4 h-4" style={{ color: "var(--surna-text-secondary)" }} />
        </button>
      </Link>
      <Suspense fallback={<PanelFallback />}>
        <ChallengeHistory userId={userId} />
      </Suspense>
    </div>
  );
}
