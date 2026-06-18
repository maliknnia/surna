import { useQuery } from "@tanstack/react-query";
import { Users, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { mergeProfileTeams, type DemoProfileTeam } from "@/lib/demoProfileMedia";
import { ProfileSectionCard } from "@/components/profile/ProfileSectionCard";
import { ROUTES } from "@/navigation";

type ProfileTeamsPanelProps = {
  userId: string;
  isOwnProfile: boolean;
};

type TeamRow = {
  id: string;
  name: string;
  sport?: string;
  role?: string;
  joinedAt?: string;
  logo?: string;
};

export function ProfileTeamsPanel({ userId, isOwnProfile }: ProfileTeamsPanelProps) {
  const { data, isLoading } = useQuery<{ teams?: TeamRow[] }>({
    queryKey: ["/api/profile", userId, "teams"],
    enabled: !!userId,
  });

  const teams = mergeProfileTeams(data?.teams ?? [], isOwnProfile) as (TeamRow | DemoProfileTeam)[];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--surna-elevated)" }} />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <ProfileSectionCard title="Teams">
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--surna-text)" }} />
          <p className="text-[14px] font-medium" style={{ color: "var(--surna-text)" }}>
            No teams yet
          </p>
          {isOwnProfile ? (
            <Link href={ROUTES.teams}>
              <button type="button" className="text-[13px] mt-2 underline" style={{ color: "var(--surna-text-secondary)" }}>
                Browse teams
              </button>
            </Link>
          ) : null}
        </div>
      </ProfileSectionCard>
    );
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => (
        <Link key={team.id} href={ROUTES.team(team.id)}>
          <button
            type="button"
            className="w-full p-4 rounded-2xl text-left active:opacity-90 flex items-center gap-3"
            style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
            data-testid={`profile-team-${team.id}`}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--surna-base)" }}
            >
              <Users className="w-5 h-5" style={{ color: "var(--surna-text-secondary)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold truncate" style={{ color: "var(--surna-text)" }}>
                {team.name}
              </div>
              <div className="text-[12px] mt-0.5 capitalize" style={{ color: "var(--surna-text-secondary)" }}>
                {team.sport}
                {team.role ? ` · ${team.role}` : ""}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--surna-text-secondary)" }} />
          </button>
        </Link>
      ))}
    </div>
  );
}
