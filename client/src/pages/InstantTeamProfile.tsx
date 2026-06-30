import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  MapPin,
  MessageCircle,
  Trophy,
  Users,
  Zap,
  Loader2,
  Navigation,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSmartBack } from "@/lib/navigation";
import { mapPath } from "@/lib/mapNavigation";
import { ROUTES } from "@/navigation";
import {
  EntityEmptyState,
  EntityHero,
  EntityQuickStats,
  EntitySectionTabs,
} from "@/components/entity";
import { CardAttendeeStrip } from "@/components/people/CardAttendeeStrip";

type InstantTeamDetail = {
  id: string;
  name: string;
  sport: string;
  description?: string | null;
  locationName?: string | null;
  lat?: string | number;
  lng?: string | number;
  startTime: string;
  playersNeeded: number;
  playersJoined?: number;
  skillLevel?: string;
  visibility?: string;
  status?: string;
  creatorId?: string;
  creator?: { id: string; displayName?: string; profileImageUrl?: string };
  members?: Array<{ userId: string; user?: { displayName?: string; profileImageUrl?: string } }>;
  isMember?: boolean;
  isCreator?: boolean;
  messengerGroupId?: string | null;
};

function formatTimeUntil(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff < 0) return "Started";
  if (diff < 60000) return "Starting now";
  if (diff < 3600000) return `In ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `In ${Math.floor(diff / 3600000)}h`;
  return new Date(date).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export default function InstantTeamProfile() {
  const params = useParams<{ id: string }>();
  const teamId = params?.id;
  const [, navigate] = useLocation();
  const goBack = useSmartBack({ fallback: ROUTES.instantJoin });
  const { toast } = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState<"about" | "players">("about");

  const { data: team, isLoading, error } = useQuery<InstantTeamDetail>({
    queryKey: [`/api/instant-teams/${teamId}`],
    enabled: Boolean(teamId),
    queryFn: async () => {
      const res = await fetch(`/api/instant-teams/${teamId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Game not found");
      return res.json();
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/instant-teams/${teamId}/join`);
      return res.json() as Promise<{ success: boolean; chatGroupId?: string }>;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: [`/api/instant-teams/${teamId}`] });
      void queryClient.invalidateQueries({ queryKey: ["/api/instant-teams"] });
      toast({ title: "You're in!", description: "See you at the game." });
      if (data.chatGroupId) {
        navigate(`/messages?groupId=${encodeURIComponent(data.chatGroupId)}`);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Can't join", description: err.message, variant: "destructive" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/instant-teams/${teamId}/leave`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [`/api/instant-teams/${teamId}`] });
      void queryClient.invalidateQueries({ queryKey: ["/api/instant-teams"] });
      toast({ title: "Left the game" });
    },
    onError: (err: Error) => {
      toast({ title: "Can't leave", description: err.message, variant: "destructive" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/instant-teams/${teamId}/convert`);
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: (newTeam) => {
      toast({ title: "Converted to full team!" });
      navigate(ROUTES.team(newTeam.id));
    },
    onError: (err: Error) => {
      toast({ title: "Convert failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surna-void)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--surna-text-secondary)" }} />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen px-4 py-16" style={{ background: "var(--surna-void)" }}>
        <EntityEmptyState
          icon={Zap}
          title="Game not found"
          description="This pickup game may have ended or been removed."
          actionLabel="Browse games"
          onAction={() => navigate(ROUTES.instantJoin)}
        />
      </div>
    );
  }

  const isFull = (team.playersJoined ?? 0) >= team.playersNeeded;
  const isExpired = team.status === "expired";
  const lat = Number(team.lat);
  const lng = Number(team.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--surna-void)" }}>
      <header
        className="sticky top-0 z-30 px-4 h-14 flex items-center gap-3"
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--surna-separator)" }}
      >
        <button type="button" onClick={goBack} className="p-2 -ml-2" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <span className="flex-1 text-base font-bold truncate" style={{ color: "var(--surna-text)" }}>
          Pickup game
        </span>
        {hasCoords ? (
          <button
            type="button"
            onClick={() => navigate(mapPath({ type: "instant", id: team.id, lat, lng }))}
            className="p-2 rounded-full"
            style={{ background: "var(--surna-elevated)" }}
            aria-label="View on map"
          >
            <Navigation size={18} />
          </button>
        ) : null}
      </header>

      <div className="px-4 pt-4">
        <EntityHero
          avatarUrl={team.creator?.profileImageUrl}
          avatarFallback={team.sport?.slice(0, 2)?.toUpperCase() || "⚡"}
          title={team.name}
          subtitle={team.sport}
          badge={{ label: team.visibility === "invite-only" ? "Invite only" : "Public", tone: "muted" }}
          location={team.locationName || undefined}
          bio={team.description || undefined}
          meta={
            <span className="text-xs font-semibold" style={{ color: isExpired ? "#FF3B30" : "var(--surna-text-secondary)" }}>
              {isExpired ? "Expired" : formatTimeUntil(team.startTime)}
            </span>
          }
        />

        <EntityQuickStats
          items={[
            { icon: Users, value: `${team.playersJoined ?? 0}/${team.playersNeeded}`, label: "Players", tone: "accent" },
            { icon: Clock, value: formatTimeUntil(team.startTime), label: "Starts", tone: "amber" },
            { icon: Trophy, value: team.skillLevel || "any", label: "Skill", tone: "gold" },
          ]}
        />

        <EntitySectionTabs
          tabs={[
            { id: "about", label: "About" },
            { id: "players", label: "Players" },
          ]}
          activeId={tab}
          onChange={(id) => setTab(id as "about" | "players")}
        />

        {tab === "about" ? (
          <div className="space-y-4 pb-4">
            {team.locationName ? (
              <div className="flex items-start gap-2 text-sm" style={{ color: "var(--surna-text-secondary)" }}>
                <MapPin size={16} className="shrink-0 mt-0.5" />
                <span>{team.locationName}</span>
              </div>
            ) : null}
            {team.description ? (
              <p className="text-sm leading-relaxed" style={{ color: "var(--surna-text)" }}>
                {team.description}
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--surna-text-secondary)" }}>
                No extra details yet. Join the chat to coordinate with other players.
              </p>
            )}
          </div>
        ) : (
          <div className="pb-4 space-y-4">
            <CardAttendeeStrip entityType="instant" entityId={team.id} fallbackCount={team.playersJoined} />
            <ul className="space-y-2">
              {(team.members ?? []).map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: "var(--surna-elevated)" }}
                >
                  {m.user?.profileImageUrl ? (
                    <img src={m.user.profileImageUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full" style={{ background: "var(--surna-surface)" }} />
                  )}
                  <span className="text-sm font-medium" style={{ color: "var(--surna-text)" }}>
                    {m.user?.displayName || "Player"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 flex gap-2 z-40"
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", borderTop: "1px solid var(--surna-separator)" }}
      >
        {team.isMember && team.messengerGroupId ? (
          <button
            type="button"
            onClick={() => navigate(`/messages?groupId=${encodeURIComponent(team.messengerGroupId!)}`)}
            className="flex-1 h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2"
            style={{ background: "#000", color: "#fff" }}
          >
            <MessageCircle size={18} />
            Group chat
          </button>
        ) : null}

        {team.isMember && !team.isCreator ? (
          <button
            type="button"
            onClick={() => leaveMutation.mutate()}
            disabled={leaveMutation.isPending}
            className="h-12 px-5 rounded-full font-semibold text-sm"
            style={{ background: "var(--surna-surface)", color: "var(--surna-text-secondary)" }}
          >
            Leave
          </button>
        ) : null}

        {team.isCreator ? (
          <button
            type="button"
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
            className="flex-1 h-12 rounded-full font-semibold text-sm"
            style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}
          >
            Convert to team
          </button>
        ) : null}

        {!team.isMember && user && !isExpired ? (
          <button
            type="button"
            onClick={() => joinMutation.mutate()}
            disabled={isFull || joinMutation.isPending}
            className="flex-1 h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2"
            style={{
              background: isFull ? "var(--surna-surface)" : "#000",
              color: isFull ? "var(--surna-text-muted)" : "#fff",
            }}
          >
            {joinMutation.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isFull ? (
              "Full"
            ) : (
              <>
                <Zap size={16} />
                Join game
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
