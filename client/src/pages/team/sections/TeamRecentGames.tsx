import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { formatActivityVersus, getSportLabels } from "@/lib/sportLabels";
import { fetchTeamGames, formatGameScore } from "@/lib/teamGames";
import { MatchResultBadge } from "@/components/entity";
import { TeamSectionCard } from "../components/TeamSectionCard";

interface Props {
  teamId: string;
  sport?: string | null;
}

export default function TeamRecentGames({ teamId, sport }: Props) {
  const labels = getSportLabels(sport);
  const { data, isLoading } = useQuery({
    queryKey: ["/api/teams", teamId, "games"],
    queryFn: () => fetchTeamGames(teamId),
    enabled: !!teamId,
  });

  const games = data?.games ?? [];

  if (isLoading) {
    return (
      <TeamSectionCard>
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--surna-text-secondary)" }} />
        </div>
      </TeamSectionCard>
    );
  }

  if (games.length === 0) return null;

  return (
    <TeamSectionCard title={labels.recentActivities} testId="team-recent-games">
      <div className="space-y-3">
        {games.slice(0, 8).map((game) => {
          const score = formatGameScore(game);
          const resultKind = game.result === "win" ? "win" : game.result === "loss" ? "loss" : "draw";
          return (
            <div
              key={game.id}
              className="flex items-start justify-between gap-3 py-2 last:pb-0"
              style={{ borderBottom: "1px solid var(--surna-border)" }}
            >
              <div className="min-w-0">
                <div className="text-[14px] font-semibold truncate" style={{ color: "var(--surna-text)" }}>
                  {formatActivityVersus(labels, game.opponentName, sport)}
                </div>
                <div className="text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
                  {game.playedAt ? new Date(game.playedAt).toLocaleDateString() : "—"}
                  {game.players.length > 0
                    ? ` · ${game.players.length} ${labels.memberNoun.toLowerCase()}`
                    : ""}
                </div>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <MatchResultBadge result={resultKind} compact />
                {score ? (
                  <div className="text-[13px] font-medium" style={{ color: "var(--surna-text)" }}>
                    {score}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </TeamSectionCard>
  );
}
