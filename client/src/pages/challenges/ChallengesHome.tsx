import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Plus,
  MapPin,
  Swords,
  CheckCircle2,
  Medal,
  Users,
  Calendar,
  Clock,
  ArrowLeft,
  ChevronRight,
  Zap,
  Target,
  Star,
  RefreshCw,
} from "lucide-react";
import type { CompetitiveMatch } from "@shared/schema";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useAuth } from "@/hooks/useAuth";
import { fetchChallengesList, fetchLeaderboard } from "@/lib/challengesApi";
import { calculateDistance } from "@/lib/geo";
import { useChallengesTheme } from "./challengesTheme";
import { CardAttendeeStrip } from "@/components/people/CardAttendeeStrip";
import { HowChallengesWorkCard } from "./ChallengeAccessInfo";

type TabId = "nearby" | "invites" | "mine" | "completed" | "leaderboards";

const tabs: { id: TabId; label: string; icon: typeof MapPin }[] = [
  { id: "nearby", label: "Open", icon: MapPin },
  { id: "invites", label: "Invites", icon: Zap },
  { id: "mine", label: "Mine", icon: Swords },
  { id: "completed", label: "Done", icon: CheckCircle2 },
  { id: "leaderboards", label: "Top", icon: Medal },
];

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "rgba(255,214,10,0.15)", text: "#B8860B", label: "Open" },
  invited: { bg: "rgba(139,138,255,0.15)", text: "#6D28D9", label: "Invited" },
  accepted: { bg: "rgba(48,209,88,0.15)", text: "#248A3D", label: "Accepted" },
  live: { bg: "rgba(255,69,58,0.15)", text: "#D70015", label: "LIVE" },
  completed: { bg: "rgba(142,142,147,0.15)", text: "#636366", label: "Done" },
  disputed: { bg: "rgba(255,159,10,0.15)", text: "#C93400", label: "Disputed" },
  cancelled: { bg: "rgba(142,142,147,0.1)", text: "#8E8E93", label: "Cancelled" },
};

export default function ChallengesHome() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tabParam = params.get("tab");
  const initialTab: TabId =
    tabParam === "mine" || tabParam === "invites" || tabParam === "completed" || tabParam === "leaderboards"
      ? tabParam
      : "nearby";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = (user as { id?: string } | null)?.id;
  const t = useChallengesTheme();

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  }, []);

  const { data: nearbyMatches, isLoading: nearbyLoading } = useQuery({
    queryKey: ["challenges-list", "nearby"],
    queryFn: () => fetchChallengesList({ status: "pending" }),
  });

  const { data: myInvites, isLoading: invitesLoading } = useQuery({
    queryKey: ["challenges-list", "invites", userId],
    queryFn: () => fetchChallengesList({ status: "invited", userId }),
    enabled: !!userId,
  });

  const { data: myMatches, isLoading: myMatchesLoading } = useQuery({
    queryKey: ["challenges-list", "mine"],
    queryFn: () => fetchChallengesList({ mine: true }),
  });

  const { data: completedMatches, isLoading: completedLoading } = useQuery({
    queryKey: ["challenges-list", "completed"],
    queryFn: () => fetchChallengesList({ status: "completed" }),
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
  };
  const { isRefreshing, pullDistance, touchHandlers } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    if (activeTab === "nearby") next.delete("tab");
    else next.set("tab", activeTab);
    const qs = next.toString();
    window.history.replaceState(
      {},
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [activeTab]);

  const getTabData = (): { matches: CompetitiveMatch[]; loading: boolean } => {
    switch (activeTab) {
      case "nearby":
        return { matches: nearbyMatches?.matches || [], loading: nearbyLoading };
      case "invites":
        return { matches: myInvites?.matches || [], loading: invitesLoading };
      case "mine":
        return { matches: myMatches?.matches || [], loading: myMatchesLoading };
      case "completed":
        return { matches: completedMatches?.matches || [], loading: completedLoading };
      default:
        return { matches: [], loading: false };
    }
  };

  const { matches, loading } = getTabData();

  const sortedMatches = useMemo(() => {
    if (activeTab !== "nearby" || !userCoords) return matches;
    const withDist = matches.map((m) => {
      const loc = m.location as { lat?: number; lng?: number } | null | undefined;
      const lat = loc?.lat;
      const lng = loc?.lng;
      const dist =
        typeof lat === "number" && typeof lng === "number"
          ? calculateDistance(userCoords, { lat, lng })
          : Number.POSITIVE_INFINITY;
      return { m, dist };
    });
    return withDist.sort((a, b) => a.dist - b.dist).map((row) => row.m);
  }, [matches, activeTab, userCoords]);

  const displayMatches = activeTab === "nearby" ? sortedMatches : matches;

  return (
    <div className="min-h-screen" style={{ background: t.pageBg }} {...touchHandlers}>
      {pullDistance > 0 && (
        <div className="flex justify-center pt-2">
          <span className="text-xs" style={{ color: t.textMuted }}>
            {isRefreshing ? "Refreshing..." : "Pull to refresh"}
          </span>
        </div>
      )}
      <header
        className="sticky top-0 z-10 px-4 pt-3 pb-2"
        style={{
          background: t.headerBg,
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() =>
                window.history.length > 1 ? window.history.back() : setLocation("/")
              }
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: t.iconBtnBg }}
            >
              <ArrowLeft size={18} style={{ color: t.iconAccent }} />
            </button>
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold" style={{ color: t.textPrimary }}>
                Challenges
              </h1>
              <p className="text-[11px]" style={{ color: t.textMuted }}>
                Compete and climb the ranks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: t.iconBtnBg }}
              aria-label="Refresh"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
                style={{ color: t.iconAccent }}
              />
            </button>
            <button
              onClick={() => setLocation("/challenges/create")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold active:scale-95 transition-transform"
              style={{ background: t.ctaBg, color: t.ctaText }}
            >
              <Plus size={16} />
              Create
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all active:scale-95 flex-shrink-0"
                style={{
                  background: isActive ? t.chipActiveBg : t.chipBg,
                  color: isActive ? t.chipActiveText : t.chipInactiveText,
                }}
              >
                <TabIcon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-4 py-4 pb-28">
        {activeTab === "nearby" && <HowChallengesWorkCard />}
        {activeTab === "leaderboards" ? (
          <LeaderboardsView />
        ) : loading ? (
          <LoadingSkeleton />
        ) : displayMatches.length > 0 ? (
          <div className="space-y-2.5">
            {displayMatches.map((match) => (
              <MatchCard key={match.id} match={match} showActions={activeTab === "invites"} />
            ))}
          </div>
        ) : (
          <EmptyState tab={activeTab} onCreate={() => setLocation("/challenges/create")} />
        )}
      </main>
    </div>
  );
}

function MatchCard({
  match,
  showActions = false,
}: {
  match: CompetitiveMatch;
  showActions?: boolean;
}) {
  const t = useChallengesTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const status = statusStyles[match.status || "pending"] || statusStyles.pending;

  const acceptMutation = useMutation({
    mutationFn: async (matchId: string) => {
      await apiRequest("POST", `/api/competitive-challenges/${matchId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      toast({ title: "Challenge accepted!", description: "Time to compete" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (matchId: string) => {
      await apiRequest("POST", `/api/competitive-challenges/${matchId}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      toast({ title: "Declined" });
    },
  });

  return (
    <div
      className="rounded-2xl p-4 active:scale-[0.98] transition-all cursor-pointer"
      style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
      onClick={() => setLocation(`/challenges/${match.id}`)}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: t.elevated }}
        >
          <Swords size={20} style={{ color: t.iconAccent }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: status.bg, color: status.text }}
            >
              {status.label}
            </span>
            {match.sport && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: t.chipBg, color: t.chipInactiveText }}
              >
                {match.sport}
              </span>
            )}
            {match.type === "teamVsTeam" && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: t.chipBg, color: t.chipInactiveText }}
              >
                <Users size={10} /> Team
              </span>
            )}
          </div>
          <h3 className="text-[15px] font-semibold truncate" style={{ color: t.textPrimary }}>
            {match.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {match.timeStart && (
              <div className="flex items-center gap-1">
                <Calendar size={11} style={{ color: t.iconMuted }} />
                <span className="text-[11px]" style={{ color: t.textMuted }}>
                  {new Date(match.timeStart).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
            {match.timeStart && (
              <div className="flex items-center gap-1">
                <Clock size={11} style={{ color: t.iconMuted }} />
                <span className="text-[11px]" style={{ color: t.textMuted }}>
                  {new Date(match.timeStart).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {match.reward && (
              <div className="flex items-center gap-1">
                <Trophy size={11} style={{ color: "#FFD60A" }} />
                <span className="text-[11px] capitalize" style={{ color: t.textMuted }}>
                  {String(match.reward)}
                </span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight size={16} style={{ color: t.iconMuted, flexShrink: 0, marginTop: 4 }} />
      </div>

      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <CardAttendeeStrip
          entityType="challenge"
          entityId={String(match.id)}
          fallbackCount={(match as { participantCount?: number }).participantCount}
        />
      </div>

      {showActions && (
        <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${t.divider}` }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              acceptMutation.mutate(match.id);
            }}
            disabled={acceptMutation.isPending}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold active:scale-95 transition-all disabled:opacity-40"
            style={{ background: t.success, color: "#fff" }}
          >
            {acceptMutation.isPending ? "..." : "Accept"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              declineMutation.mutate(match.id);
            }}
            disabled={declineMutation.isPending}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold active:scale-95 transition-all disabled:opacity-40"
            style={{ background: t.secondaryBtnBg, color: t.secondaryBtnText }}
          >
            {declineMutation.isPending ? "..." : "Decline"}
          </button>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  const t = useChallengesTheme();
  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl p-4"
          style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full animate-pulse" style={{ background: t.skeleton }} />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 rounded animate-pulse" style={{ background: t.skeleton }} />
              <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: t.skeleton }} />
              <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: t.skeleton }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab, onCreate }: { tab: TabId; onCreate: () => void }) {
  const t = useChallengesTheme();
  const messages: Record<TabId, { title: string; sub: string; icon: typeof Target }> = {
    nearby: {
      title: "No challenges nearby",
      sub: "Be the first to create one in your area",
      icon: Target,
    },
    invites: {
      title: "No invites yet",
      sub: "Challenge someone from their profile",
      icon: Zap,
    },
    mine: { title: "No challenges yet", sub: "Create your first challenge", icon: Swords },
    completed: {
      title: "No completed challenges",
      sub: "Finish a challenge to see it here",
      icon: CheckCircle2,
    },
    leaderboards: {
      title: "No data yet",
      sub: "Complete challenges to rank up",
      icon: Medal,
    },
  };

  const msg = messages[tab];
  const Icon = msg.icon;

  return (
    <div className="flex flex-col items-center justify-center pt-16 pb-10">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: t.elevated }}
      >
        <Icon size={28} style={{ color: t.iconMuted }} />
      </div>
      <h3 className="text-[16px] font-semibold mb-1" style={{ color: t.textPrimary }}>
        {msg.title}
      </h3>
      <p className="text-[13px] mb-5 text-center px-6" style={{ color: t.textMuted }}>
        {msg.sub}
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[13px] font-semibold active:scale-95 transition-transform"
        style={{ background: t.ctaBg, color: t.ctaText }}
      >
        <Plus size={16} />
        Create Challenge
      </button>
    </div>
  );
}

function LeaderboardsView() {
  const t = useChallengesTheme();
  const [, setLocation] = useLocation();
  const [scope, setScope] = useState<"user" | "team">("user");

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["challenges-leaderboard", scope],
    queryFn: () => fetchLeaderboard(scope),
  });

  const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["user", "team"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all active:scale-95"
            style={{
              background: scope === s ? t.chipActiveBg : t.chipBg,
              color: scope === s ? t.chipActiveText : t.chipInactiveText,
            }}
          >
            {s === "user" ? <Star size={13} /> : <Users size={13} />}
            {s === "user" ? "Players" : "Teams"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : leaderboard?.leaderboard && leaderboard.leaderboard.length > 0 ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: `1px solid ${t.divider}` }}
          >
            <Medal size={16} style={{ color: "#FFD60A" }} />
            <span className="text-[14px] font-semibold" style={{ color: t.textPrimary }}>
              Top {scope === "user" ? "Players" : "Teams"}
            </span>
          </div>
          <div>
            {leaderboard.leaderboard.map((entry, index) => (
              <button
                key={entry.entityId}
                type="button"
                onClick={() =>
                  setLocation(
                    scope === "user" ? `/person/${entry.entityId}` : `/teams/${entry.entityId}`,
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors active:opacity-70"
                style={{
                  borderBottom:
                    index < leaderboard.leaderboard.length - 1
                      ? `1px solid ${t.divider}`
                      : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
                    style={{
                      background:
                        index < 3 ? `${medalColors[index]}20` : t.chipBg,
                      color: index < 3 ? medalColors[index] : t.iconMuted,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: t.textPrimary }}>
                      {entry.entityId}
                    </p>
                    <p className="text-[11px]" style={{ color: t.textMuted }}>
                      {entry.sport || "All Sports"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold" style={{ color: t.textPrimary }}>
                    {entry.rating}
                  </p>
                  <p
                    className="text-[9px] font-semibold uppercase tracking-wider"
                    style={{ color: t.textMuted }}
                  >
                    ELO
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState tab="leaderboards" onCreate={() => setLocation("/challenges/create")} />
      )}
    </div>
  );
}
