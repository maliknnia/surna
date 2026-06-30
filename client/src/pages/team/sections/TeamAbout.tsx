import { MapPin, Calendar, Users, Trophy, Map as MapIcon } from "lucide-react";
import { useLocation } from "wouter";
import { entityPath, mapPath } from "@/lib/mapNavigation";
import { getSportLabels } from "@/lib/sportLabels";
import { teamRecordTotals } from "@/lib/teamRecord";
import { statCardSurface } from "@/lib/statCardStyle";
import { useTeamPageAccent } from "../TeamPageTheme";
import { TeamAccentButton, TeamDetailRow, TeamSectionCard } from "../components/TeamSectionCard";
import TeamRecentGames from "./TeamRecentGames";

interface TeamAboutProps {
  team: {
    id?: string;
    sport?: string;
    description?: string | null;
    city?: string | null;
    currentMembers?: number;
    maxMembers?: number;
    createdAt?: string | Date | null;
    placeName?: string | null;
    placeId?: string | null;
    record?: { W?: number; L?: number; D?: number };
    isPublic?: boolean;
    canManage?: boolean;
    isCaptain?: boolean;
  };
}

export default function TeamAbout({ team }: TeamAboutProps) {
  const [, setLocation] = useLocation();
  const labels = getSportLabels(team.sport);
  const accent = useTeamPageAccent();
  const canManage = !!(team.canManage || team.isCaptain);

  const handleViewOnMap = () => {
    if (team.placeId) {
      setLocation(mapPath({ type: "place", id: String(team.placeId) }));
      return;
    }
    if (team.id) {
      setLocation(mapPath({ type: "team", id: String(team.id) }));
      return;
    }
    setLocation(mapPath());
  };

  const handleViewVenue = () => {
    if (team.placeId) setLocation(entityPath("place", String(team.placeId)));
  };

  const { w, l, d, winRate } = teamRecordTotals(team.record);

  return (
    <div className="space-y-3 px-1">
      <TeamSectionCard title="About">
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--surna-text-secondary)" }}>
          {team.description || "No description yet — captains can add one from My Hub."}
        </p>
      </TeamSectionCard>

      <TeamSectionCard title={`${labels.groupNoun} details`}>
        <div className="grid grid-cols-2 gap-4">
          <TeamDetailRow icon={Trophy} label="Sport" value={team.sport ?? "—"} />
          <TeamDetailRow icon={MapPin} label="Location" value={team.city || "Not specified"} />
          {canManage ? (
            <TeamDetailRow
              icon={Users}
              label={labels.sizeLabel}
              value={`${team.currentMembers ?? 0} / ${team.maxMembers ?? "—"}`}
            />
          ) : (
            <TeamDetailRow icon={Users} label="Members" value={team.currentMembers ?? 0} />
          )}
          <TeamDetailRow
            icon={Calendar}
            label="Founded"
            value={team.createdAt ? new Date(team.createdAt).toLocaleDateString() : "—"}
          />
        </div>
      </TeamSectionCard>

      {team.placeName ? (
        <TeamSectionCard
          title={labels.homeVenue}
          action={
            <TeamAccentButton onClick={handleViewOnMap}>
              <MapIcon size={14} />
              Map
            </TeamAccentButton>
          }
        >
          <button
            type="button"
            className="text-[14px] text-left active:opacity-70"
            style={{ color: "var(--surna-text-secondary)" }}
            onClick={handleViewVenue}
          >
            {team.placeName}
          </button>
        </TeamSectionCard>
      ) : null}

      <TeamSectionCard title="Record">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Wins", value: w, tone: "win" as const },
            { label: "Losses", value: l, tone: "loss" as const },
            { label: "Draws", value: d, tone: "draw" as const },
          ].map(({ label, value, tone }) => {
            const surface = statCardSurface(tone);
            return (
              <div
                key={label}
                className="rounded-2xl p-3 text-center"
                style={{ background: surface.background, border: `1px solid ${surface.border}` }}
              >
                <div className="text-[20px] font-bold tabular-nums" style={{ color: surface.valueColor }}>
                  {value}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: surface.labelColor }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
        <div
          className="flex justify-between items-center mt-3 pt-3 px-1 rounded-2xl py-2.5"
          style={{
            background: statCardSurface("amber").background,
            border: `1px solid ${statCardSurface("amber").border}`,
          }}
        >
          <span className="text-[13px] font-medium" style={{ color: statCardSurface("amber").labelColor }}>
            Win rate
          </span>
          <span className="text-[16px] font-bold tabular-nums" style={{ color: accent }}>
            {winRate}%
          </span>
        </div>
      </TeamSectionCard>

      {team.id ? <TeamRecentGames teamId={String(team.id)} sport={team.sport} /> : null}

      <TeamSectionCard title={`${labels.groupNoun} type`}>
        <div className="flex items-center gap-2">
          <Users size={18} style={{ color: "var(--surna-text-secondary)" }} />
          <span className="text-[14px] font-medium" style={{ color: "var(--surna-text)" }}>
            {team.isPublic ? `Public ${labels.groupNoun.toLowerCase()}` : `Private ${labels.groupNoun.toLowerCase()}`}
          </span>
        </div>
        <p className="text-[13px] mt-2" style={{ color: "var(--surna-text-muted)" }}>
          {team.isPublic ? `Anyone can request to join` : "Invitation only"}
        </p>
      </TeamSectionCard>
    </div>
  );
}
