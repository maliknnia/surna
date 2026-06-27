import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Trophy,
  MapPin,
  Medal,
  Users,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Play,
  Flag,
  Loader2,
  MessageCircle,
  ArrowLeft,
  Navigation,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fetchChallengeDetail } from "@/lib/challengesApi";
import type { ChallengeMatchView } from "@/lib/challengesApi";
import { useSmartBack } from "@/lib/navigation";
import { mapPath } from "@/lib/mapNavigation";
import ScoreReporter from "./ScoreReporter";
import ChallengeChat from "./ChallengeChat";
import type { MatchParticipant, MatchResult } from "@shared/schema";
import { useChallengesTheme } from "./challengesTheme";
import { AccessRulesSummary } from "./ChallengeAccessInfo";
import type { ChallengeTypeKey, VisibilityKey } from "./challengesTheme";
import { ROUTES } from "@/navigation";
import { isDemoChallengeId } from "@/lib/demoChallenges";
import {
  EntityEmptyState,
  EntityHero,
  EntityQuickStats,
  EntitySectionTabs,
} from "@/components/entity";
import { CardAttendeeStrip } from "@/components/people/CardAttendeeStrip";

type TabType = "details" | "participants" | "chat" | "results";

type EnrichedParticipant = MatchParticipant & {
  displayName?: string;
  profileImageUrl?: string | null;
};

function locationAddress(loc: unknown): string | null {
  if (!loc || typeof loc !== "object") return null;
  const addr = (loc as Record<string, unknown>).address;
  return typeof addr === "string" ? addr : null;
}

function locationCoords(loc: unknown): { lat: number; lng: number } | null {
  if (!loc || typeof loc !== "object") return null;
  const row = loc as Record<string, unknown>;
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function entryFeeLabel(fee: unknown): string | null {
  if (!fee || typeof fee !== "object") return null;
  const row = fee as Record<string, unknown>;
  if (typeof row.amount !== "number") return null;
  const currency = typeof row.currency === "string" ? row.currency : "EUR";
  return `${row.amount} ${currency}`;
}

export default function ChallengePage() {
  const params = useParams();
  const challengeId = params.id;
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [scoreReporterOpen, setScoreReporterOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const t = useChallengesTheme();
  const goBack = useSmartBack({ fallback: ROUTES.challenges });

  const { data: challengeData, isLoading, error } = useQuery<{
    match: ChallengeMatchView;
    participants: EnrichedParticipant[];
    result?: MatchResult | null;
  }>({
    queryKey: ["challenge-detail", challengeId],
    queryFn: () => fetchChallengeDetail(challengeId!),
    enabled: !!challengeId && !isDemoChallengeId(challengeId!),
  });

  const { data: userTeams } = useQuery<{ id: string }[]>({
    queryKey: ["/api/teams/my-teams"],
    enabled: !!user,
  });

  const challenge = challengeData?.match;
  const participants = challengeData?.participants || [];
  const matchResult = challengeData?.result ?? null;
  const challengeLocation = challenge ? locationAddress(challenge.location) : null;
  const challengeCoords = challenge ? locationCoords(challenge.location) : null;
  const challengeEntryFee = challenge ? entryFeeLabel(challenge.entryFee) : null;

  const isParticipant =
    user &&
    participants.some((p) => {
      if (p.participantType === "user") return p.participantId === user.id;
      if (p.participantType === "team") {
        return userTeams?.some((team) => team.id === p.participantId) ?? false;
      }
      return false;
    });

  const acceptMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/competitive-challenges/${challengeId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-detail", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      toast({ title: "Challenge Accepted!", description: "Good luck!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to accept challenge", variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/competitive-challenges/${challengeId}/decline`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-detail", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      toast({ title: "Challenge Declined" });
      navigate("/challenges");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to decline challenge", variant: "destructive" });
    },
  });

  const startMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/competitive-challenges/${challengeId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-detail", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      toast({ title: "Challenge Started!", description: "May the best win!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start challenge", variant: "destructive" });
    },
  });

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/competitive-challenges/${challengeId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-detail", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      toast({ title: "Joined!", description: "You're in the challenge." });
    },
    onError: (err: Error) => {
      toast({ title: "Can't join", description: err.message, variant: "destructive" });
    },
  });

  const confirmResultMutation = useMutation({
    mutationFn: (resultId: string) =>
      apiRequest("POST", `/api/competitive-challenges/${challengeId}/confirm`, { resultId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-detail", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      toast({ title: "Result confirmed", description: "Ratings updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const disputeResultMutation = useMutation({
    mutationFn: ({ resultId, reason }: { resultId: string; reason: string }) =>
      apiRequest("POST", `/api/competitive-challenges/${challengeId}/dispute`, { resultId, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-detail", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      toast({ title: "Result disputed", description: "We'll review the outcome." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (challengeId && isDemoChallengeId(challengeId)) {
    return (
      <div className="min-h-screen px-4 py-16" style={{ background: t.pageBg }}>
        <EntityEmptyState
          icon={Trophy}
          title="Sample challenge"
          description="This is a preview card on the home feed. Create or join a real challenge to compete."
          actionLabel="Browse challenges"
          onAction={() => navigate(ROUTES.challenges)}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: t.pageBg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: t.iconAccent }} />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen px-4 py-16" style={{ background: t.pageBg }}>
        <EntityEmptyState
          icon={Trophy}
          title="Challenge not found"
          description="This challenge doesn't exist or was removed."
          actionLabel="Back to challenges"
          onAction={() => navigate(ROUTES.challenges)}
        />
      </div>
    );
  }

  const canRespond = challenge.status === "pending" || challenge.status === "invited";
  const isOpenJoin =
    challenge.type === "open" &&
    (challenge.status === "pending" || challenge.status === "live") &&
    !isParticipant &&
    user;
  const canConfirmResult =
    matchResult?.status === "pending" &&
    user &&
    matchResult.reportedById !== user.id &&
    isParticipant;
  const challengeType = (challenge.type || "player1v1") as ChallengeTypeKey;
  const visibility = (challenge.visibility || "public") as VisibilityKey;

  const renderActionButtons = () => {
    if (canRespond) {
      return (
        <>
          <button
            data-testid="button-accept-challenge"
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: t.success, color: "#fff" }}
          >
            <CheckCircle2 size={15} />
            {acceptMutation.isPending ? "..." : "Accept"}
          </button>
          <button
            data-testid="button-decline-challenge"
            onClick={() => declineMutation.mutate()}
            disabled={declineMutation.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: t.secondaryBtnBg, color: t.secondaryBtnText }}
          >
            <XCircle size={15} />
            {declineMutation.isPending ? "..." : "Decline"}
          </button>
        </>
      );
    }

    if (challenge.status === "accepted" || challenge.status === "active") {
      return (
        <button
          data-testid="button-start-challenge"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-40"
          style={{ background: t.ctaBg, color: t.ctaText }}
        >
          <Play size={15} />
          {startMutation.isPending ? "Starting..." : "Start Match"}
        </button>
      );
    }

    if (challenge.status === "live" && isParticipant) {
      return (
        <button
          data-testid="button-report-result"
          onClick={() => setScoreReporterOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all active:scale-95"
          style={{ background: "#FF9500", color: "#fff" }}
        >
          <Flag size={15} />
          Report Result
        </button>
      );
    }

    if (isOpenJoin) {
      return (
        <button
          type="button"
          onClick={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-40"
          style={{ background: t.ctaBg, color: t.ctaText }}
        >
          <Trophy size={15} />
          {joinMutation.isPending ? "Joining…" : "Join challenge"}
        </button>
      );
    }

    return null;
  };

  const quickStats = [
    { icon: Users, value: participants.length, label: "Players" },
    {
      icon: Calendar,
      value: challenge.timeStart
        ? new Date(challenge.timeStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : "TBD",
      label: "Date",
    },
    {
      icon: challengeEntryFee ? DollarSign : Trophy,
      value: challengeEntryFee || challenge.visibility || "Public",
      label: challengeEntryFee ? "Entry" : "Visibility",
    },
  ];

  return (
    <main className="min-h-screen pb-28" style={{ background: t.pageBg }}>
      <header
        className="sticky top-0 z-30 px-4 h-14 flex items-center gap-3"
        style={{
          background: t.headerBg,
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <button type="button" onClick={goBack} className="p-2 -ml-2" aria-label="Go back">
          <ArrowLeft size={20} style={{ color: t.iconAccent }} />
        </button>
        <span className="flex-1 text-base font-bold truncate" style={{ color: t.textPrimary }}>
          Challenge
        </span>
        {challengeCoords ? (
          <button
            type="button"
            onClick={() =>
              navigate(mapPath({ type: "challenge", id: challenge.id, lat: challengeCoords.lat, lng: challengeCoords.lng }))
            }
            className="p-2 rounded-full"
            style={{ background: t.iconBtnBg }}
            aria-label="View on map"
          >
            <Navigation size={18} style={{ color: t.iconAccent }} />
          </button>
        ) : null}
      </header>

      <div className="px-4 pt-4 max-w-lg mx-auto">
        <EntityHero
          coverUrl={challenge.coverUrl}
          avatarFallback={challenge.sport?.slice(0, 2)?.toUpperCase() || "🏆"}
          title={challenge.title}
          subtitle={`${challenge.sport} · ${challenge.type?.replace(/([A-Z])/g, " $1").trim() || "match"}`}
          badge={{ label: String(challenge.status), tone: challenge.status === "live" ? "gold" : "muted" }}
          location={challengeLocation || undefined}
          meta={
            challenge.reward ? (
              <span className="text-xs font-semibold flex items-center justify-center gap-1" style={{ color: "#FFD60A" }}>
                <Medal size={12} />
                {String(challenge.reward)} reward
              </span>
            ) : undefined
          }
        />

        <EntityQuickStats items={quickStats} />

        <div className="flex gap-2 mb-4">
          {renderActionButtons()}
          {challenge.messengerGroupId && isParticipant ? (
            <button
              type="button"
              onClick={() => navigate(`/messages?groupId=${encodeURIComponent(challenge.messengerGroupId!)}`)}
              className="px-4 py-2.5 rounded-2xl transition-all active:scale-95"
              style={{ background: t.secondaryBtnBg, color: t.secondaryBtnText }}
              aria-label="Open group chat"
            >
              <MessageCircle size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className="px-4 py-2.5 rounded-2xl transition-all active:scale-95"
              style={{
                background: activeTab === "chat" ? t.ctaBg : t.secondaryBtnBg,
                color: activeTab === "chat" ? t.ctaText : t.secondaryBtnText,
              }}
              aria-label="Open challenge chat"
            >
              <MessageCircle size={16} />
            </button>
          )}
        </div>

        <EntitySectionTabs
          tabs={[
            { id: "details", label: "Details" },
            { id: "participants", label: "People" },
            { id: "chat", label: "Chat" },
            { id: "results", label: "Results" },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as TabType)}
        />

          {activeTab === "details" && (
            <div className="space-y-4">
              <div
                className="rounded-2xl p-4 space-y-4"
                style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
              >
                <h3 className="text-[14px] font-semibold" style={{ color: t.textPrimary }}>
                  Details
                </h3>
                {challenge.rules && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: t.label }}>
                      Rules
                    </p>
                    <p className="text-[13px] whitespace-pre-wrap" style={{ color: t.textSecondary }}>
                      {challenge.rules}
                    </p>
                  </div>
                )}
                {challenge.timeStart && (
                  <div className="flex items-center gap-3">
                    <Clock size={16} style={{ color: t.iconAccent }} />
                    <div>
                      <p className="text-[11px]" style={{ color: t.textMuted }}>
                        Start
                      </p>
                      <p className="text-[13px]" style={{ color: t.textPrimary }}>
                        {new Date(challenge.timeStart).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {challenge.timeEnd && (
                  <div className="flex items-center gap-3">
                    <Clock size={16} style={{ color: t.iconAccent }} />
                    <div>
                      <p className="text-[11px]" style={{ color: t.textMuted }}>
                        End
                      </p>
                      <p className="text-[13px]" style={{ color: t.textPrimary }}>
                        {new Date(challenge.timeEnd).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Trophy size={16} style={{ color: t.iconAccent }} />
                  <div>
                    <p className="text-[11px]" style={{ color: t.textMuted }}>
                      Visibility
                    </p>
                    <p className="text-[13px] capitalize" style={{ color: t.textPrimary }}>
                      {challenge.visibility}
                    </p>
                  </div>
                </div>
              </div>
              <AccessRulesSummary type={challengeType} visibility={visibility} />
            </div>
          )}

          {activeTab === "participants" && (
            <div
              className="rounded-2xl p-4"
              style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
            >
              <div className="mb-4">
                <CardAttendeeStrip
                  entityType="challenge"
                  entityId={challenge.id}
                  fallbackCount={participants.length}
                />
              </div>
              <h3 className="text-[14px] font-semibold mb-3" style={{ color: t.textPrimary }}>
                Participants
              </h3>
              {participants.length > 0 ? (
                <div className="space-y-2">
                  {participants.map((p) => {
                    const label = p.displayName || p.participantId;
                    return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (!p.participantId) return;
                        if (p.participantType === "team") navigate(ROUTES.team(p.participantId));
                        else navigate(ROUTES.person(p.participantId));
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors active:opacity-70"
                      style={{ background: t.elevated }}
                    >
                      {p.profileImageUrl ? (
                        <img src={p.profileImageUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background: t.chipBg }}
                        >
                          <span className="text-[12px] font-bold" style={{ color: t.iconAccent }}>
                            {label.charAt(0) || "P"}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: t.textPrimary }}>
                          {label}
                        </p>
                        <p className="text-[10px] capitalize" style={{ color: t.textMuted }}>
                          {p.role || "Participant"} · {p.participantType}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0"
                        style={{ background: t.chipBg, color: t.accentPurple }}
                      >
                        {p.status}
                      </span>
                    </button>
                  );})}
                </div>
              ) : (
                <p className="text-center py-8 text-[13px]" style={{ color: t.textMuted }}>
                  No participants yet
                </p>
              )}
            </div>
          )}

          {activeTab === "chat" && challengeId && (
            <ChallengeChat challengeId={challengeId} currentUserId={user?.id} />
          )}

          {activeTab === "results" && (
            <div
              className="rounded-2xl p-4"
              style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
            >
              {matchResult ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
                      {matchResult.status === "confirmed" ? "Final result" : "Reported result"}
                    </p>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: t.textPrimary }}>
                      {matchResult.hostScore ?? "–"} : {matchResult.guestScore ?? "–"}
                    </p>
                    <p className="text-sm capitalize mt-1" style={{ color: t.textSecondary }}>
                      {String(matchResult.outcome).replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <span
                      className="inline-block mt-2 text-[10px] font-bold px-2.5 py-1 rounded-full capitalize"
                      style={{ background: t.chipBg, color: t.accentPurple }}
                    >
                      {matchResult.status}
                    </span>
                  </div>
                  {matchResult.notes ? (
                    <p className="text-[13px]" style={{ color: t.textSecondary }}>{matchResult.notes}</p>
                  ) : null}
                  {canConfirmResult && matchResult.id ? (
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => confirmResultMutation.mutate(matchResult.id)}
                        disabled={confirmResultMutation.isPending}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                        style={{ background: t.success, color: "#fff" }}
                      >
                        Confirm result
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt("Why are you disputing this result?");
                          if (reason?.trim()) {
                            disputeResultMutation.mutate({ resultId: matchResult.id, reason: reason.trim() });
                          }
                        }}
                        disabled={disputeResultMutation.isPending}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                        style={{ background: t.secondaryBtnBg, color: t.secondaryBtnText }}
                      >
                        Dispute
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy size={28} className="mx-auto mb-2" style={{ color: t.iconMuted }} />
                  <p className="text-[13px]" style={{ color: t.textMuted }}>
                    Results appear after the match is played and reported
                  </p>
                </div>
              )}
            </div>
          )}
      </div>

      {challenge && (
        <ScoreReporter match={challenge} open={scoreReporterOpen} onOpenChange={setScoreReporterOpen} />
      )}
    </main>
  );
}
