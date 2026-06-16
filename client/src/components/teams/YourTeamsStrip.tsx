import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { teamLogoUrl } from "@/lib/teamLogo";
import { getSportConfig } from "@/components/TeamCard";
import type { Team } from "@shared/schema";

type MyTeam = Team & { myRole?: string | null };

export function YourTeamsStrip({
  onTeamClick,
}: {
  onTeamClick: (teamId: string) => void;
}) {
  const { data: myTeams = [], isLoading } = useQuery<MyTeam[]>({
    queryKey: ["/api/teams/my-teams"],
  });

  if (isLoading || myTeams.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--surna-text-secondary)" }}>
          Your teams
        </h2>
        <span className="text-[11px] text-muted-foreground">{myTeams.length}</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {myTeams.map((team) => {
          const logo = teamLogoUrl(team);
          const config = getSportConfig(team.sport);
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onTeamClick(team.id)}
              className="shrink-0 flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full active:scale-[0.97] transition-transform"
              style={{ background: "var(--surna-surface)", border: "1px solid var(--surna-border)" }}
            >
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-muted/30">
                {logo ? (
                  <img src={logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base">{config.emoji}</span>
                )}
              </div>
              <div className="text-left min-w-0 max-w-[120px]">
                <p className="text-[12px] font-semibold truncate" style={{ color: "var(--surna-text)" }}>
                  {team.name}
                </p>
                <p className="text-[10px] capitalize truncate text-muted-foreground">{team.myRole || "member"}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
