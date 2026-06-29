import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, Crown, Star, UserPlus } from "lucide-react";
import { EntityEmptyState, EntityListSkeleton, entityCardStyle } from "@/components/entity";
import { getDemoTeamMembers, isDemoTeamId, normalizeDemoTeamId } from "@/lib/demoTeams";
import TeamSizingRoster from "../components/TeamSizingRoster";
import { useTeamPageAccent } from "../TeamPageTheme";
import type { TeamMemberRow } from "../components/TeamMemberProfileSheet";

interface TeamMembersProps {
  teamId: string;
  teamName?: string;
  canManage?: boolean;
  isMember?: boolean;
}

function memberDisplayName(member: TeamMemberRow): string {
  const u = member.user;
  if (u?.displayName?.trim()) return u.displayName.trim();
  if (u?.username?.trim()) return u.username.trim();
  const full = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim();
  return full || "Member";
}

export default function TeamMembers({
  teamId,
  canManage = false,
  isMember = false,
}: TeamMembersProps) {
  const [, setLocation] = useLocation();
  const accent = useTeamPageAccent();
  const normalizedId = normalizeDemoTeamId(teamId);

  const { data, isLoading } = useQuery<{ members?: TeamMemberRow[] }>({
    queryKey: ["/api/teams", normalizedId, "members"],
    queryFn: async () => {
      if (isDemoTeamId(normalizedId)) {
        return { members: getDemoTeamMembers(normalizedId) };
      }
      const res = await fetch(`/api/teams/${normalizedId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load members");
      return res.json();
    },
  });

  const members = data?.members ?? [];

  if (isLoading) {
    return (
      <div className="px-1">
        <EntityListSkeleton rows={4} rowHeight={140} />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <EntityEmptyState
        icon={Users}
        title="No members yet"
        description="Be the first to join, or invite teammates from My Hub."
        actionLabel={canManage ? "Invite from My Hub" : undefined}
        actionHref={canManage ? "/teams/manage" : undefined}
      />
    );
  }

  const getRoleIcon = (role: string) => {
    if (role === "captain") return <Crown size={14} style={{ color: "#FFD700" }} />;
    if (role === "co-captain") return <Star size={14} style={{ color: "#FFD700" }} />;
    return null;
  };

  const openProfile = (member: TeamMemberRow) => {
    const userId = member.userId || member.user?.id;
    if (userId) setLocation(`/profile/${userId}?from=${encodeURIComponent(`/teams/${teamId}`)}`);
  };

  return (
    <div className="space-y-3 px-1">
      <TeamSizingRoster teamId={teamId} canManage={canManage} isMember={isMember} />
      <div className="grid grid-cols-2 gap-2.5">
        {members.map((member) => {
          const avatar = member.user?.profileImageUrl;
          const name = memberDisplayName(member);
          const isLead = member.role === "captain" || member.role === "co-captain";
          return (
            <button
              key={member.id}
              type="button"
              className="rounded-2xl p-3 text-left active:scale-[0.97] transition-transform"
              style={{
                ...entityCardStyle,
                ...(isLead ? { boxShadow: `inset 0 0 0 1px ${accent}44` } : {}),
              }}
              onClick={() => openProfile(member)}
            >
              <div className="relative w-14 h-14 mx-auto mb-2.5">
                {avatar ? (
                  <img src={avatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{ background: "var(--surna-bg-highlight)" }}
                  >
                    <Users size={22} style={{ color: "var(--surna-text-secondary)" }} />
                  </div>
                )}
                {getRoleIcon(member.role || "") ? (
                  <div
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "var(--surna-base)", border: "1px solid var(--surna-border)" }}
                  >
                    {getRoleIcon(member.role || "")}
                  </div>
                ) : null}
              </div>

              <h4
                className="text-center text-[13px] font-semibold mb-1 truncate"
                style={{ color: "var(--surna-text)" }}
              >
                {name}
              </h4>

              <div className="text-center">
                <span
                  className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                  style={{ background: `${accent}18`, color: accent }}
                >
                  {member.role}
                </span>
              </div>

              <div
                className="mt-2.5 pt-2.5 grid grid-cols-2 gap-1 text-center"
                style={{ borderTop: "1px solid var(--surna-border)" }}
              >
                <div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--surna-text-muted)" }}>
                    Games
                  </div>
                  <div className="text-[13px] font-bold" style={{ color: "var(--surna-text)" }}>
                    {member.gamesPlayed || 0}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--surna-text-muted)" }}>
                    Level
                  </div>
                  <div className="text-[13px] font-bold capitalize" style={{ color: "var(--surna-text-secondary)" }}>
                    {member.skillLevel || "—"}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {canManage ? (
        <button
          type="button"
          onClick={() => setLocation("/teams/manage")}
          className="w-full h-10 rounded-xl text-[13px] font-semibold inline-flex items-center justify-center gap-2 active:opacity-80"
          style={{ ...entityCardStyle, color: "var(--surna-text-secondary)" }}
        >
          <UserPlus size={16} />
          Invite players
        </button>
      ) : null}
    </div>
  );
}
