import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { formatActivityVersus, getSportLabels } from "@/lib/sportLabels";
import { fetchTeamGames, formatGameScore, resultLabel, resultTone } from "@/lib/teamGames";

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
      <div className="glass-card flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (games.length === 0) return null;

  return (
    <div className="glass-card" data-testid="team-recent-games">
      <h3 className="text-lg font-bold text-foreground mb-4">{labels.recentActivities}</h3>
      <div className="space-y-3">
        {games.slice(0, 8).map((game) => {
          const score = formatGameScore(game);
          const tone = resultTone(game.result);
          const toneColor =
            tone === "success" ? "#22c55e" : tone === "danger" ? "#ef4444" : "var(--muted-foreground)";
          return (
            <div
              key={game.id}
              className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0"
            >
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-foreground truncate">
                  {formatActivityVersus(labels, game.opponentName, sport)}
                </div>
                <div className="text-[12px] text-muted-foreground">
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
                {score ? <div className="text-[13px] text-foreground font-medium">{score}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
