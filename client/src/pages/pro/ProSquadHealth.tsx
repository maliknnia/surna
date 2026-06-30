import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ChevronRight, X } from "lucide-react";
import { PageShell, Card, EmptyState } from "./components/primitives";
import { useProTeam } from "./components/ProTeamContext";
import { useProWorkspaceContext } from "./lib/useProWorkspaceContext";
import { ProWorkspaceModeGate } from "./components/ProWorkspaceModeGate";
import { useProRole } from "./components/useProRole";

type SquadPlayer = {
  userId: string;
  name: string;
  position?: string;
  status: "green" | "amber" | "red";
  sessions7d: number;
  durationMinutes7d: number;
};

type PlayerHistory = {
  health: { status: string; sessions7d: number; durationMinutes7d: number };
  activities: Array<Record<string, unknown>>;
  load7d: Array<Record<string, unknown>>;
};

const STATUS_COLOR = {
  green: "#1DB954",
  amber: "#F59E0B",
  red: "#EF4444",
};

export default function ProSquadHealth() {
  const { isTeamMode } = useProWorkspaceContext();
  if (!isTeamMode) {
    return (
      <ProWorkspaceModeGate
        required={["team"]}
        title="Squad health"
        description="Player load and availability tracking is part of Team Pro."
      />
    );
  }
  return <ProTeamSquadHealth />;
}

function ProTeamSquadHealth() {
  const { teamId } = useProTeam();
  const { can } = useProRole();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ players: SquadPlayer[] }>({
    queryKey: ["/api/pro/team", teamId, "squad-health"],
    queryFn: async () => {
      const res = await fetch(`/api/pro/team/${teamId}/squad-health`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load squad health");
      return res.json();
    },
    enabled: !!teamId && can("analytics.view"),
  });

  const { data: history } = useQuery<PlayerHistory>({
    queryKey: ["/api/pro/team", teamId, "squad-health", selectedPlayer],
    queryFn: async () => {
      const res = await fetch(`/api/pro/team/${teamId}/squad-health/${selectedPlayer}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load player history");
      return res.json();
    },
    enabled: !!teamId && !!selectedPlayer,
  });

  const players = data?.players ?? [];

  return (
    <PageShell title="Squad health" subtitle="Player activity load this week">
      {isLoading && <p className="pro-empty__desc">Loading squad…</p>}
      {!isLoading && players.length === 0 && (
        <EmptyState
          icon={<Activity size={32} />}
          title="No squad data"
          description="Add players to your roster to see health status."
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <button
            key={p.userId}
            type="button"
            onClick={() => setSelectedPlayer(p.userId)}
            className="pro-card text-left p-4 flex items-center gap-3 w-full"
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: STATUS_COLOR[p.status] }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.name}</p>
              <p className="text-xs text-[var(--pro-muted)]">
                {p.sessions7d} sessions · {p.durationMinutes7d}m this week
              </p>
            </div>
            <ChevronRight size={16} className="text-[var(--pro-muted)] shrink-0" />
          </button>
        ))}
      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Activity history</h3>
              <button type="button" onClick={() => setSelectedPlayer(null)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {history && (
              <>
                <p className="text-sm text-[var(--pro-muted)] mb-4">
                  Status:{" "}
                  <span
                    style={{
                      color: STATUS_COLOR[history.health.status as keyof typeof STATUS_COLOR] ?? "#888",
                    }}
                  >
                    {history.health.status}
                  </span>
                  {" · "}
                  {history.health.sessions7d} sessions / {history.health.durationMinutes7d}m (7d)
                </p>
                <ul className="space-y-2">
                  {(history.activities as Array<Record<string, unknown>>).slice(0, 20).map((a) => (
                    <li
                      key={String(a.id)}
                      className="text-sm flex justify-between border-b border-[var(--pro-border)] py-2"
                    >
                      <span className="capitalize">{String(a.activity_type ?? "activity")}</span>
                      <span className="text-[var(--pro-muted)] tabular-nums">
                        {Number(a.distance_km ?? 0).toFixed(2)} km
                      </span>
                    </li>
                  ))}
                  {history.activities.length === 0 && (
                    <li className="text-sm text-[var(--pro-muted)]">No logged activities yet.</li>
                  )}
                </ul>
              </>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}
