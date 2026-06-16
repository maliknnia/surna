import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Crown, Loader2, MapPin, Star, Users } from "lucide-react";
import { getSportConfig } from "@/components/TeamCard";
import { teamLogoUrl } from "@/lib/teamLogo";
import { useSmartBack } from "@/lib/navigation";
import type { TeamMemberRow } from "./components/TeamMemberProfileSheet";

function displayName(user: Record<string, unknown> | null | undefined): string {
  if (!user) return "Player";
  if (typeof user.displayName === "string" && user.displayName.trim()) return user.displayName.trim();
  if (typeof user.username === "string" && user.username.trim()) return user.username.trim();
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return full || "Player";
}

export default function TeamPlayerPage() {
  const params = useParams<{ teamId: string; userId: string }>();
  const teamId = params.teamId;
  const userId = params.userId;
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({ fallback: teamId ? `/teams/${teamId}` : "/?panel=teams" });

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["/api/teams", teamId],
    enabled: !!teamId,
  });

  const { data: membersData, isLoading: membersLoading } = useQuery<{ members?: TeamMemberRow[] }>({
    queryKey: ["/api/teams", teamId, "members"],
    enabled: !!teamId,
  });

  const { data: roster } = useQuery<Array<{ player: Record<string, unknown>; user: Record<string, unknown> }>>({
    queryKey: ["/api/pro/team", teamId, "roster"],
    queryFn: async () => {
      const res = await fetch(`/api/pro/team/${teamId}/roster`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!teamId,
    staleTime: 60_000,
  });

  if (teamLoading || membersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const members = membersData?.members ?? [];
  const member = members.find((m) => (m.userId || m.user?.id) === userId);
  const user = member?.user;
  const proEntry = (roster ?? []).find((r) => String(r.user?.id) === userId);
  const proPlayer = proEntry?.player as {
    jerseyNumber?: number | null;
    positions?: string[] | null;
    status?: string | null;
  } | undefined;

  if (!team || !member || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Player not found</h2>
        <p className="text-sm text-muted-foreground mb-4">This player is not on the team roster.</p>
        <button
          type="button"
          onClick={() => setLocation(teamId ? `/teams/${teamId}` : "/?panel=teams")}
          className="px-5 py-2.5 rounded-full bg-muted/40 text-sm font-semibold"
        >
          Back to team
        </button>
      </div>
    );
  }

  const teamAny = team as Record<string, unknown>;
  const config = getSportConfig(teamAny.sport as string);
  const logo = teamLogoUrl(teamAny as never);
  const name = displayName(user);
  const avatar = user.profileImageUrl as string | null | undefined;
  const role = member.role || "member";
  const positions = Array.isArray(proPlayer?.positions) ? proPlayer.positions : [];

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-border bg-background/90 backdrop-blur-xl">
        <button
          type="button"
          onClick={goBack}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Team roster</p>
          <p className="text-[15px] font-bold truncate">{String(teamAny.name ?? "Team")}</p>
        </div>
      </div>

      <div className="px-5 pt-8 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div
            className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-offset-2 ring-offset-background"
            style={{ boxShadow: `0 0 0 4px ${config.ringColor}44` }}
          >
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/40">
                <Users size={36} className="text-muted-foreground" />
              </div>
            )}
          </div>
          {role === "captain" || role === "co-captain" ? (
            <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center">
              {role === "captain" ? <Crown size={16} style={{ color: "#FFD700" }} /> : <Star size={16} style={{ color: "#FFD700" }} />}
            </span>
          ) : null}
        </div>

        <h1 className="text-[24px] font-extrabold text-foreground">{name}</h1>
        <p className="text-[13px] text-muted-foreground capitalize mt-1">{role}</p>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {proPlayer?.jerseyNumber != null ? (
            <span className="px-3 py-1 rounded-full text-[12px] font-semibold bg-muted/40">#{proPlayer.jerseyNumber}</span>
          ) : null}
          {positions.map((pos) => (
            <span key={pos} className="px-3 py-1 rounded-full text-[12px] font-semibold bg-muted/40 capitalize">{pos}</span>
          ))}
          {teamAny.sport ? (
            <span className="px-3 py-1 rounded-full text-[12px] font-semibold" style={{ background: `${config.ringColor}18`, color: config.ringColor }}>
              {config.emoji} {String(teamAny.sport)}
            </span>
          ) : null}
        </div>

        {logo ? (
          <div className="mt-6 flex items-center gap-2 text-[13px] text-muted-foreground">
            <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
            <span>{String(teamAny.name)}</span>
          </div>
        ) : null}

        {teamAny.city ? (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <MapPin size={14} />
            {String(teamAny.city)}
          </p>
        ) : null}
      </div>

      <div className="px-4 mt-8 grid grid-cols-2 gap-3">
        <div className="glass-card text-center py-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Games</p>
          <p className="text-[20px] font-bold text-foreground mt-1">{member.gamesPlayed ?? 0}</p>
        </div>
        <div className="glass-card text-center py-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Level</p>
          <p className="text-[20px] font-bold text-foreground mt-1 capitalize">{member.skillLevel || "—"}</p>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-2.5">
        <button
          type="button"
          onClick={() => setLocation(`/person/${userId}`)}
          className="w-full h-11 rounded-full bg-foreground text-background text-[14px] font-bold"
        >
          Open personal profile
        </button>
        <button
          type="button"
          onClick={() => setLocation(teamId ? `/teams/${teamId}` : "/?panel=teams")}
          className="w-full h-11 rounded-full bg-muted/40 text-foreground text-[14px] font-semibold"
        >
          Back to team
        </button>
      </div>
    </div>
  );
}
