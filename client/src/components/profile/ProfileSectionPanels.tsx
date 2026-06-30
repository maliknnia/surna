import { lazy, Suspense } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProfileExtras } from "@/hooks/useProfileExtras";
import { ProfileSectionCard } from "@/components/profile/ProfileSectionCard";
import { Link } from "wouter";
import { Trophy } from "lucide-react";
import { EntityEmptyState, MatchResultBadge } from "@/components/entity";
import { ROUTES } from "@/navigation";
import { ChevronRight } from "lucide-react";
import {
  fetchProfileTeamGames,
  formatGameScore,
  setProfileTeamGameVisibility,
} from "@/lib/teamGames";
import { getSportLabels } from "@/lib/sportLabels";
import { statCardSurface, type StatCardTone } from "@/lib/statCardStyle";

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
            { label: "Win rate", value: `${profileExtras.winRate}%`, tone: "win" as StatCardTone },
            { label: "Level", value: String(profileExtras.level), tone: "gold" as StatCardTone },
            { label: "Games", value: String(profileExtras.gamesCount), tone: "accent" as StatCardTone },
            { label: "Rating", value: profileExtras.rating.toFixed(1), tone: "amber" as StatCardTone },
          ].map((item) => {
            const surface = statCardSurface(item.tone);
            return (
            <div
              key={item.label}
              className="rounded-2xl p-3"
              style={{ background: surface.background, border: `1px solid ${surface.border}` }}
            >
              <div
                className="text-[22px] font-bold tabular-nums"
                style={{ color: surface.valueColor }}
              >
                {item.value}
              </div>
              <div className="text-[12px]" style={{ color: surface.labelColor }}>
                {item.label}
              </div>
            </div>
            );
          })}
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
  isOwnProfile?: boolean;
};

function ProfileTeamGamesList({ userId, isOwnProfile }: { userId: string; isOwnProfile: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/profile", userId, "team-games"],
    queryFn: () => fetchProfileTeamGames(userId),
    enabled: !!userId,
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ participantId, showOnProfile }: { participantId: string; showOnProfile: boolean }) =>
      setProfileTeamGameVisibility(participantId, showOnProfile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", userId, "team-games"] });
    },
  });

  const games = data?.games ?? [];

  if (isLoading) return <PanelFallback />;
  if (games.length === 0) {
    return (
      <EntityEmptyState
        icon={Trophy}
        title="No games logged yet"
        description={
          isOwnProfile
            ? "Log match results from My Hub — wins and stats will show here."
            : "No match history on this profile yet."
        }
        actionLabel={isOwnProfile ? "My teams" : undefined}
        actionHref={isOwnProfile ? ROUTES.myHubTeams : undefined}
        compact
      />
    );
  }

  const sectionTitle = getSportLabels(null).profileActivityTitle;

  return (
    <ProfileSectionCard title={sectionTitle}>
      <div className="space-y-3">
        {games.map((game) => {
          const score = formatGameScore(game);
          const resultKind = game.result === "win" ? "win" : game.result === "loss" ? "loss" : "draw";
          return (
            <div
              key={game.id}
              className="flex items-start justify-between gap-3 py-2"
              style={{ borderBottom: "1px solid var(--surna-border)" }}
            >
              <div className="min-w-0">
                <div className="text-[14px] font-semibold truncate" style={{ color: "var(--surna-text)" }}>
                  {game.teamName} vs {game.opponentName}
                </div>
                <div className="text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
                  {game.playedAt ? new Date(game.playedAt).toLocaleDateString() : "—"}
                  {score ? ` · ${score}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <MatchResultBadge result={resultKind} compact />
                {isOwnProfile ? (
                  <button
                    type="button"
                    aria-label={game.showOnProfile ? "Hide on profile" : "Show on profile"}
                    onClick={() =>
                      visibilityMutation.mutate({
                        participantId: game.id,
                        showOnProfile: !game.showOnProfile,
                      })
                    }
                    className="p-1 rounded-lg"
                    style={{ color: game.showOnProfile ? "var(--surna-text-secondary)" : "var(--surna-text-muted)" }}
                  >
                    {game.showOnProfile ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </ProfileSectionCard>
  );
}

export function ProfileGamesPanel({ userId, isOwnProfile = false }: ProfileGamesPanelProps) {
  return (
    <div className="space-y-4">
      <ProfileTeamGamesList userId={userId} isOwnProfile={isOwnProfile} />
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
