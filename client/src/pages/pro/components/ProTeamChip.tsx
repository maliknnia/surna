import { memo } from "react";
import { ChevronDown } from "lucide-react";
import { useProTeam } from "./ProTeamContext";

function ProTeamChip() {
  const { teams, teamId, setTeamId, activeTeam, teamsLoading } = useProTeam();

  if (teamsLoading) {
    return <div className="pro-team-chip pro-team-chip--loading" aria-hidden />;
  }

  if (teams.length === 0) {
    return (
      <span className="pro-team-chip pro-team-chip--empty" title="No teams linked">
        No team
      </span>
    );
  }

  if (teams.length === 1 && activeTeam) {
    return (
      <span className="pro-team-chip" title={activeTeam.sport}>
        <span className="pro-team-chip__dot" />
        {activeTeam.name}
        <span className="pro-team-chip__sport">{activeTeam.sport}</span>
      </span>
    );
  }

  return (
    <label className="pro-team-chip pro-team-chip--select">
      <span className="pro-team-chip__dot" />
      <select
        value={activeTeam?.id ?? teamId ?? ""}
        onChange={(e) => setTeamId(e.target.value)}
        aria-label="Switch team"
        data-testid="pro-team-chip-select"
      >
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name} · {t.sport}</option>
        ))}
      </select>
      <ChevronDown size={13} className="pro-team-chip__chev" />
    </label>
  );
}

export default memo(ProTeamChip);
