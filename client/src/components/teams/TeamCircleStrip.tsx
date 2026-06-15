import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Team } from "@shared/schema";
import { getSportColor } from "@/lib/sportColors";
import { getSportConfig } from "@/components/TeamCard";
import { teamLogoUrl } from "@/lib/teamLogo";

function sportRingGradient(sport?: string | null): string {
  const { base, light } = getSportColor(sport);
  return `linear-gradient(135deg, ${light} 0%, ${base} 55%, ${base} 100%)`;
}

type TeamCircleStripProps = {
  teams: Team[];
  onTeamClick: (teamId: string) => void;
  onCreateTeam?: () => void;
  loading?: boolean;
};

function TeamCircleSkeleton() {
  return (
    <div className="team-circle-item shrink-0">
      <div
        className="team-circle-ring animate-pulse"
        style={{ background: "var(--surna-surface)" }}
      >
        <div className="team-circle-inner" style={{ background: "var(--surna-elevated)" }} />
      </div>
      <div
        className="mt-2 h-2.5 w-12 rounded-full animate-pulse mx-auto"
        style={{ background: "var(--surna-surface)" }}
      />
    </div>
  );
}

export default function TeamCircleStrip({
  teams,
  onTeamClick,
  onCreateTeam,
  loading = false,
}: TeamCircleStripProps) {
  const [pressedId, setPressedId] = useState<string | null>(null);

  const stripTeams = useMemo(() => {
    return [...teams]
      .sort((a, b) => {
        const aLogo = !!teamLogoUrl(a);
        const bLogo = !!teamLogoUrl(b);
        if (aLogo !== bLogo) return aLogo ? -1 : 1;
        return (b.currentMembers || 0) - (a.currentMembers || 0);
      })
      .slice(0, 18);
  }, [teams]);

  if (!loading && stripTeams.length === 0 && !onCreateTeam) return null;

  return (
    <div className="team-circle-strip mb-6">
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex gap-3.5 pb-1">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => <TeamCircleSkeleton key={i} />)
            : stripTeams.map((team) => {
                const logo = teamLogoUrl(team);
                const config = getSportConfig(team.sport);
                const isPressed = pressedId === team.id;

                return (
                  <button
                    key={team.id}
                    type="button"
                    className="team-circle-item shrink-0 text-left"
                    style={{
                      transform: isPressed ? "scale(0.94)" : "scale(1)",
                      transition: "transform 0.15s ease",
                    }}
                    onPointerDown={() => setPressedId(team.id)}
                    onPointerUp={() => setPressedId(null)}
                    onPointerLeave={() => setPressedId(null)}
                    onPointerCancel={() => setPressedId(null)}
                    onClick={() => onTeamClick(team.id)}
                  >
                    <div
                      className="team-circle-ring"
                      style={{ background: sportRingGradient(team.sport) }}
                    >
                      <div className="team-circle-inner">
                        {logo ? (
                          <img
                            src={logo}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="team-circle-emoji" aria-hidden>
                            {config.emoji}
                          </span>
                        )}
                      </div>
                      {team.verified ? (
                        <span className="team-circle-verified" aria-label="Verified team">
                          ✓
                        </span>
                      ) : null}
                    </div>

                    <span className="team-circle-name">{team.name}</span>
                    {team.sport ? (
                      <span className="team-circle-sport">{team.sport}</span>
                    ) : null}
                  </button>
                );
              })}

          {!loading && onCreateTeam ? (
            <button
              type="button"
              className="team-circle-item shrink-0 text-left"
              onClick={onCreateTeam}
            >
              <div
                className="team-circle-ring team-circle-ring--create"
                style={{ background: "transparent" }}
              >
                <div className="team-circle-inner team-circle-inner--create">
                  <Plus size={22} style={{ color: "var(--surna-text-secondary)" }} />
                </div>
              </div>
              <span className="team-circle-name" style={{ color: "var(--surna-text-secondary)" }}>
                Create
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
