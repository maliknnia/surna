import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Users } from "lucide-react";
import { EntityEmptyState, EntityListSkeleton, entityCardStyle } from "@/components/entity";
import { useTeamPageAccent } from "../TeamPageTheme";

export default function TeamProPublic({ teamId }: { teamId: string }) {
  const [, setLocation] = useLocation();
  const accent = useTeamPageAccent();

  const { data: roster = [], isLoading } = useQuery<
    Array<{ player: Record<string, unknown>; user: Record<string, unknown> }>
  >({
    queryKey: ["/api/pro/team", teamId, "roster"],
    queryFn: async () => {
      const res = await fetch(`/api/pro/team/${teamId}/roster`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!teamId,
  });

  if (isLoading) {
    return (
      <div className="px-1">
        <EntityListSkeleton rows={4} rowHeight={72} />
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <EntityEmptyState
        icon={Users}
        title="Official roster not published"
        description="When the team publishes their pro roster, it will appear here."
      />
    );
  }

  return (
    <div className="space-y-2 px-1">
      {roster.map((entry) => {
        const user = entry.user ?? {};
        const player = entry.player ?? {};
        const name =
          (user.displayName as string) ||
          `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
          "Player";
        const positions = Array.isArray(player.positions) ? (player.positions as string[]) : [];
        const uid = String(user.id ?? "");

        return (
          <button
            key={String(player.id ?? user.id)}
            type="button"
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-left active:scale-[0.98] transition-transform"
            style={entityCardStyle}
            onClick={() => {
              if (uid) setLocation(`/profile/${uid}?from=${encodeURIComponent(`/teams/${teamId}`)}`);
            }}
          >
            <div
              className="w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
              style={{ background: "var(--surna-bg-highlight)" }}
            >
              {user.profileImageUrl ? (
                <img src={String(user.profileImageUrl)} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users size={18} style={{ color: "var(--surna-text-secondary)" }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold truncate" style={{ color: "var(--surna-text)" }}>
                {name}
              </p>
              <p className="text-[12px] capitalize truncate" style={{ color: "var(--surna-text-secondary)" }}>
                {positions.length ? positions.join(", ") : "Player"}
                {player.jerseyNumber != null ? ` · #${player.jerseyNumber}` : ""}
              </p>
            </div>
            <span className="text-[12px] font-semibold shrink-0" style={{ color: accent }}>
              →
            </span>
          </button>
        );
      })}
    </div>
  );
}
