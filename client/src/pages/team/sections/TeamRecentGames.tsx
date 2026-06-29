import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { formatActivityVersus, getSportLabels } from "@/lib/sportLabels";
import { fetchTeamGames, formatGameScore, resultLabel, resultTone } from "@/lib/teamGames";
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
          const tone = resultTone(game.result);
          const toneColor =
            tone === "success" ? "#22c55e" : tone === "danger" ? "#ef4444" : "var(--surna-text-muted)";
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
              <div className="text-right shrink-0">
                <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: toneColor }}>
                  {resultLabel(game.result)}
                </div>
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
