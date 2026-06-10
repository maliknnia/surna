import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Inbox, Users } from "lucide-react";
import { SectionHeader, EmptyState } from "@/features/my-hub/components";
import { MyHubTeamCard, type MyHubTeam } from "@/features/my-hub/components/MyHubTeamCard";
import { TeamJoinRequestsSheet } from "@/features/my-hub/components/TeamJoinRequestsSheet";
import { useAuth } from "@/hooks/useAuth";

interface ManagedTeamsResponse {
  items: MyHubTeam[];
}

export default function MyHubRequestsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const meId = user?.id ?? null;
  const [reqTeam, setReqTeam] = useState<MyHubTeam | null>(null);
  const [reqOpen, setReqOpen] = useState(false);

  const { data, isLoading, isError } = useQuery<ManagedTeamsResponse>({
    queryKey: ["/api/teams/me/managed"],
  });

  const withPending = (data?.items ?? []).filter((t) => (t.pendingRequestsCount ?? 0) > 0);
  const ownedWithPending = withPending.filter((t) => meId && t.captainId === meId);

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--surna-void)" }} data-testid="my-hub-requests-page">
      <div
        className="sticky top-0 z-40 glass-effect"
        style={{
          background: "var(--glass-bg, rgba(0,0,0,0.7))",
          borderBottom: "0.5px solid var(--surna-border)",
        }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/my-hub">
            <button type="button" className="p-2 rounded-xl active:scale-95" aria-label="Back to My Hub">
              <ArrowLeft className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
            </button>
          </Link>
          <h1 className="text-lg font-semibold" style={{ color: "var(--surna-text)" }}>
            Requests
          </h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <SectionHeader
          title="Team join requests"
          subtitle="Approve or decline players who want to join your teams"
        />

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{ height: 88, background: "var(--surna-elevated)" }}
              />
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={Inbox}
            title="Couldn't load requests"
            description="Check your connection and try again."
          />
        )}

        {!isLoading && !isError && ownedWithPending.length === 0 && (
          <EmptyState
            icon={Users}
            title="No pending requests"
            description="When someone asks to join a team you captain, they'll show up here."
            ctaLabel="Manage teams"
            ctaHref="/my-hub/teams"
          />
        )}

        {ownedWithPending.map((team) => (
          <MyHubTeamCard
            key={team.id}
            team={team}
            canEdit
            onEdit={() => setLocation(`/teams/${team.id}`)}
            onPostUpdate={() => setLocation(`/teams/${team.id}`)}
            onReviewRequests={(t) => {
              setReqTeam(t);
              setReqOpen(true);
            }}
          />
        ))}
      </div>

      <TeamJoinRequestsSheet team={reqTeam} open={reqOpen} onOpenChange={setReqOpen} />
    </div>
  );
}