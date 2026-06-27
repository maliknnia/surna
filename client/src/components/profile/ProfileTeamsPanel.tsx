import { useQuery } from "@tanstack/react-query";
import { Users, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { EntityEmptyState, EntityListSkeleton, entityCardStyle } from "@/components/entity";
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

  const teams = data?.teams ?? [];

  if (isLoading) return <EntityListSkeleton rows={2} rowHeight={88} />;

  if (teams.length === 0) {
    return (
      <EntityEmptyState
        icon={Users}
        title="No teams yet"
        description={
          isOwnProfile
            ? "Join a squad or create your own — your teams will show here."
            : "This athlete hasn't joined any teams yet."
        }
        actionLabel={isOwnProfile ? "Browse teams" : undefined}
        actionHref={isOwnProfile ? ROUTES.teams : undefined}
        compact
      />
    );
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => (
        <Link key={team.id} href={ROUTES.team(team.id)}>
          <button
            type="button"
            className="w-full p-4 rounded-2xl text-left active:opacity-90 flex items-center gap-3"
            style={entityCardStyle}
            data-testid={`profile-team-${team.id}`}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
              style={{ background: "var(--surna-base)" }}
            >
              {team.logo ? (
                <img src={team.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-5 h-5" style={{ color: "var(--surna-text-secondary)" }} />
              )}
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
