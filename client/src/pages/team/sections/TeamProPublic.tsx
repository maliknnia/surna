import { useQuery } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";

export default function TeamProPublic({ teamId }: { teamId: string }) {
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
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className="glass-card text-center py-8">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-[14px]">Official roster not published yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {roster.map((entry) => {
        const user = entry.user ?? {};
        const player = entry.player ?? {};
        const name =
          (user.displayName as string) ||
          `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
          "Player";
        const positions = Array.isArray(player.positions) ? (player.positions as string[]) : [];
        return (
          <div key={String(player.id ?? user.id)} className="glass-card flex items-center gap-3 p-3">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-muted/40 shrink-0">
              {user.profileImageUrl ? (
                <img src={String(user.profileImageUrl)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Users size={18} className="text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold truncate">{name}</p>
              <p className="text-[12px] text-muted-foreground capitalize truncate">
                {positions.length ? positions.join(", ") : "Player"}
                {player.jerseyNumber != null ? ` · #${player.jerseyNumber}` : ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
