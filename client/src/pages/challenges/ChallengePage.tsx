import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Trophy,
  Calendar,
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fetchChallengeDetail } from "@/lib/challengesApi";
import ScoreReporter from "./ScoreReporter";
import ChallengeChat from "./ChallengeChat";
import type { CompetitiveMatch, MatchParticipant, MatchResult } from "@shared/schema";
import { useChallengesTheme } from "./challengesTheme";
import { AccessRulesSummary } from "./ChallengeAccessInfo";
import type { ChallengeTypeKey, VisibilityKey } from "./challengesTheme";
import { ROUTES } from "@/navigation";
import { isDemoChallengeId } from "@/lib/demoChallenges";

type TabType = "details" | "participants" | "chat" | "results";

function locationAddress(loc: unknown): string | null {
  if (!loc || typeof loc !== "object") return null;
  const addr = (loc as Record<string, unknown>).address;
  return typeof addr === "string" ? addr : null;
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

  const { data: challengeData, isLoading, error } = useQuery<{
    match: CompetitiveMatch;
    participants: MatchParticipant[];
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
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: t.pageBg }}>
        <div className="text-center max-w-sm">
          <Trophy size={36} className="mx-auto mb-4" style={{ color: t.iconAccent }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: t.textPrimary }}>Sample challenge</h2>
          <p className="text-[13px] mb-5" style={{ color: t.textMuted }}>
            This is a preview card on the home feed. Create or join a real challenge to compete.
          </p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.challenges)}
            className="px-5 py-2.5 rounded-full text-[13px] font-semibold"
            style={{ background: t.ctaBg, color: t.ctaText }}
          >
            Browse challenges
          </button>
        </div>
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
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: t.pageBg }}>
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: t.elevated }}
          >
            <Trophy size={28} style={{ color: t.iconMuted }} />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: t.textPrimary }}>
            Challenge Not Found
          </h2>
          <p className="text-[13px] mb-5" style={{ color: t.textMuted }}>
            This challenge doesn't exist or was removed.
          </p>
          <button
            type="button"
            onClick={() => navigate("/challenges")}
            className="px-5 py-2.5 rounded-full text-[13px] font-semibold"
            style={{ background: t.ctaBg, color: t.ctaText }}
          >
            Back to Challenges
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "participants", label: "People" },
    { id: "chat", label: "Chat" },
    { id: "results", label: "Results" },
  ];

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

  const statCellStyle = { background: t.elevated };

  return (
    <main className="min-h-screen pb-28" style={{ background: t.pageBg }}>
      <header
        className="sticky top-0 z-10 px-4 pt-3 pb-3"
        style={{
          background: t.headerBg,
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/challenges")}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: t.iconBtnBg }}
          >
            <ArrowLeft size={18} style={{ color: t.iconAccent }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-bold truncate" style={{ color: t.textPrimary }}>
              {challenge.title}
            </h1>
            <p className="text-[11px] capitalize" style={{ color: t.textMuted }}>
              {challenge.sport} · {challenge.status}
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-center mb-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: t.elevated, border: `2px solid ${t.border}` }}
            >
              <Trophy size={36} style={{ color: t.iconAccent }} />
            </div>
          </div>

          <div className="text-center mb-5">
            <div className="flex justify-center gap-1.5 mb-2 flex-wrap">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full capitalize"
                style={{ background: t.chipBg, color: t.accentPurple }}
              >
                {challenge.status}
              </span>
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: t.chipBg, color: t.chipInactiveText }}
              >
                {challenge.sport}
              </span>
              {challenge.type === "teamVsTeam" && (
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{ background: t.chipBg, color: t.chipInactiveText }}
                >
                  <Users size={10} /> Team
                </span>
              )}
            </div>
            <h2 className="text-[22px] font-bold mb-1" style={{ color: t.textPrimary }}>
              {challenge.title}
            </h2>
            {challenge.reward && (
              <p className="text-[13px] flex items-center justify-center gap-1.5" style={{ color: "#FFD60A" }}>
                <Medal size={14} />
                {String(challenge.reward)} reward
              </p>
            )}
          </div>

          <div className="flex gap-2 mb-6">
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

          <div
            className="grid grid-cols-2 gap-2 rounded-2xl p-3 mb-6"
            style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
          >
            {challenge.timeStart && (
              <div className="text-center p-2.5 rounded-xl" style={statCellStyle}>
                <Calendar size={16} style={{ color: t.iconAccent }} className="mx-auto mb-1" />
                <p className="text-[10px] mb-0.5" style={{ color: t.textMuted }}>
                  Date
                </p>
                <p className="text-[12px] font-semibold" style={{ color: t.textPrimary }}>
                  {new Date(challenge.timeStart).toLocaleDateString()}
                </p>
              </div>
            )}
            {challengeLocation && (
                <div className="text-center p-2.5 rounded-xl" style={statCellStyle}>
                  <MapPin size={16} style={{ color: t.iconAccent }} className="mx-auto mb-1" />
                  <p className="text-[10px] mb-0.5" style={{ color: t.textMuted }}>
                    Location
                  </p>
                  <p className="text-[12px] font-semibold truncate px-1" style={{ color: t.textPrimary }}>
                    {challengeLocation}
                  </p>
                </div>
              )}
            {participants.length > 0 && (
              <div className="text-center p-2.5 rounded-xl" style={statCellStyle}>
                <Users size={16} style={{ color: t.iconAccent }} className="mx-auto mb-1" />
                <p className="text-[10px] mb-0.5" style={{ color: t.textMuted }}>
                  Players
                </p>
                <p className="text-[12px] font-semibold" style={{ color: t.textPrimary }}>
                  {participants.length}
                </p>
              </div>
            )}
            {challengeEntryFee && (
                <div className="text-center p-2.5 rounded-xl" style={statCellStyle}>
                  <DollarSign size={16} style={{ color: t.iconAccent }} className="mx-auto mb-1" />
                  <p className="text-[10px] mb-0.5" style={{ color: t.textMuted }}>
                    Entry
                  </p>
                  <p className="text-[12px] font-semibold" style={{ color: t.textPrimary }}>
                    {challengeEntryFee}
                  </p>
                </div>
              )}
          </div>

          <div
            className="flex gap-1 mb-5 rounded-2xl p-1"
            style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all"
                style={{
                  background: activeTab === tab.id ? t.ctaBg : "transparent",
                  color: activeTab === tab.id ? t.ctaText : t.chipInactiveText,
                }}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

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
              <h3 className="text-[14px] font-semibold mb-3" style={{ color: t.textPrimary }}>
                Participants
              </h3>
              {participants.length > 0 ? (
                <div className="space-y-2">
                  {participants.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (!p.participantId) return;
                        if (p.participantType === "team") navigate(`/teams/${p.participantId}`);
                        else navigate(`/person/${p.participantId}`);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors active:opacity-70"
                      style={{ background: t.elevated }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: t.chipBg }}
                      >
                        <span className="text-[12px] font-bold" style={{ color: t.iconAccent }}>
                          {p.participantId?.charAt(0) || "P"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold" style={{ color: t.textPrimary }}>
                          {p.participantId}
                        </p>
                        <p className="text-[10px] capitalize" style={{ color: t.textMuted }}>
                          {p.role || "Participant"}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: t.chipBg, color: t.accentPurple }}
                      >
                        {p.status}
                      </span>
                    </button>
                  ))}
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
      </div>

      {challenge && (
        <ScoreReporter match={challenge} open={scoreReporterOpen} onOpenChange={setScoreReporterOpen} />
      )}
    </main>
  );
}
