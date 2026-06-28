import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, Crown, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TeamSizingRoster from "../components/TeamSizingRoster";
import TeamMemberProfileSheet, { type TeamMemberRow } from "../components/TeamMemberProfileSheet";
import { getDemoTeamMembers, isDemoTeamId, normalizeDemoTeamId } from "@/lib/demoTeams";

interface TeamMembersProps {
  teamId: string;
  teamName?: string;
  canManage?: boolean;
}

function memberDisplayName(member: TeamMemberRow): string {
  const u = member.user;
  if (u?.displayName?.trim()) return u.displayName.trim();
  if (u?.username?.trim()) return u.username.trim();
  const full = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim();
  return full || "Member";
}

export default function TeamMembers({ teamId, teamName, canManage = false }: TeamMembersProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const viewerUserId = (user as { id?: string } | null)?.id;
  const [selectedMember, setSelectedMember] = useState<TeamMemberRow | null>(null);
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
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card animate-pulse">
            <div className="w-16 h-16 bg-muted/40 rounded-full mx-auto mb-3" />
            <div className="h-4 bg-muted/40 rounded mb-2" />
            <div className="h-3 bg-muted/40 rounded w-2/3 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="glass-card text-center py-8">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-[14px]">No members found</p>
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    if (role === "captain") return <Crown size={14} style={{ color: "#FFD700" }} />;
    if (role === "co-captain") return <Star size={14} style={{ color: "#FFD700" }} />;
    return null;
  };

  return (
    <>
      <TeamSizingRoster teamId={teamId} canManage={canManage} viewerUserId={viewerUserId} />
      <div className="grid grid-cols-2 gap-3">
        {members.map((member) => {
          const avatar = member.user?.profileImageUrl;
          const name = memberDisplayName(member);
          return (
            <div
              key={member.id}
              className="glass-card cursor-pointer active:scale-[0.97] transition-transform"
              onClick={() => setSelectedMember(member)}
            >
              <div className="relative w-16 h-16 mx-auto mb-3">
                {avatar ? (
                  <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-muted/40 flex items-center justify-center">
                    <Users size={24} className="text-muted-foreground" />
                  </div>
                )}
                {getRoleIcon(member.role || "") && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-background/60 backdrop-blur-sm rounded-full flex items-center justify-center border border-border">
                    {getRoleIcon(member.role || "")}
                  </div>
                )}
              </div>

              <h4 className="text-center text-foreground text-[14px] font-semibold mb-1.5 truncate">
                {name}
              </h4>

              <div className="text-center">
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize bg-muted/40 text-muted-foreground">
                  {member.role}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Games</div>
                  <div className="text-[14px] font-bold text-foreground">{member.gamesPlayed || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Level</div>
                  <div className="text-[14px] font-bold text-foreground/70 capitalize">{member.skillLevel || "N/A"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <TeamMemberProfileSheet
        open={!!selectedMember}
        member={selectedMember}
        teamId={teamId}
        teamName={teamName}
        onClose={() => setSelectedMember(null)}
        onPersonalProfile={(userId) => {
          setSelectedMember(null);
          setLocation(`/person/${userId}`);
        }}
        onTeamProfile={(userId) => {
          setSelectedMember(null);
          setLocation(`/teams/${teamId}/player/${userId}`);
        }}
      />
    </>
  );
}
