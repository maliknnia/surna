import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import {
  SectionHeader,
  EmptyState,
  UpgradePromptCard,
} from "@/features/my-hub/components";
import { MyHubTeamCard, type MyHubTeam } from "@/features/my-hub/components/MyHubTeamCard";
import { EditTeamSheet } from "@/features/my-hub/components/EditTeamSheet";
import { PostTeamUpdateSheet } from "@/features/my-hub/components/PostTeamUpdateSheet";
import { TeamJoinRequestsSheet } from "@/features/my-hub/components/TeamJoinRequestsSheet";
import { TeamJoinSettingsSheet } from "@/features/my-hub/components/TeamJoinSettingsSheet";
import { TeamInvitePlayerSheet } from "@/features/my-hub/components/TeamInvitePlayerSheet";
import { LogTeamGameSheet } from "@/features/my-hub/components/LogTeamGameSheet";
import { ManageHighlightsSheet } from "@/features/my-hub/components/ManageHighlightsSheet";
import { useAuth } from "@/hooks/useAuth";
import { HubSubpageHeader } from "@/components/create/HubSubpageHeader";
import { createHubPath } from "@/lib/createHub";

interface ManagedTeamsResponse {
  items: MyHubTeam[];
  generatedAt: string;
}

export default function MyHubTeamsPage() {
  const { user } = useAuth();
  const meId = user?.id ?? null;

  const [editTarget, setEditTarget] = useState<MyHubTeam | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [postTarget, setPostTarget] = useState<MyHubTeam | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [reqTarget, setReqTarget] = useState<MyHubTeam | null>(null);
  const [reqOpen, setReqOpen] = useState(false);
  const [highlightsTarget, setHighlightsTarget] = useState<MyHubTeam | null>(null);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [joinSettingsTarget, setJoinSettingsTarget] = useState<MyHubTeam | null>(null);
  const [joinSettingsOpen, setJoinSettingsOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<MyHubTeam | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [logGameTarget, setLogGameTarget] = useState<MyHubTeam | null>(null);
  const [logGameOpen, setLogGameOpen] = useState(false);

  const { data, isLoading, isError } = useQuery<ManagedTeamsResponse>({
    queryKey: ["/api/teams/me/managed"],
  });

  const items = data?.items ?? [];
  const owned = items.filter((t) => meId && t.captainId === meId);
  const captaining = items.filter((t) => !meId || t.captainId !== meId);
  const showEmpty = !isLoading && !isError && items.length === 0;

  const handleEdit = (t: MyHubTeam) => {
    setEditTarget(t);
    setEditOpen(true);
  };
  const handlePost = (t: MyHubTeam) => {
    setPostTarget(t);
    setPostOpen(true);
  };
  const handleRequests = (t: MyHubTeam) => {
    setReqTarget(t);
    setReqOpen(true);
  };

  const handleHighlights = (t: MyHubTeam) => {
    setHighlightsTarget(t);
    setHighlightsOpen(true);
  };

  const handleJoinSettings = (t: MyHubTeam) => {
    setJoinSettingsTarget(t);
    setJoinSettingsOpen(true);
  };

  const handleInvite = (t: MyHubTeam) => {
    setInviteTarget(t);
    setInviteOpen(true);
  };

  const handleLogGame = (t: MyHubTeam) => {
    setLogGameTarget(t);
    setLogGameOpen(true);
  };

  return (
    <div
      className="min-h-screen pb-32"
      style={{ background: "var(--surna-void)" }}
      data-testid="my-hub-teams-page"
    >
      <HubSubpageHeader title="My Teams" createType="team" testId="my-hub-teams-title" />

      <div className="max-w-md mx-auto px-4 pt-4 space-y-6">
        {isLoading && (
          <div className="space-y-3" data-testid="teams-loading">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{
                  height: 200,
                  background: "var(--surna-elevated)",
                  border: "1px solid var(--surna-border)",
                }}
              />
            ))}
          </div>
        )}

        {isError && (
          <div
            className="rounded-2xl p-4 text-center text-sm"
            style={{
              background: "var(--surna-elevated)",
              border: "1px solid var(--surna-border)",
              color: "var(--surna-text-secondary)",
            }}
            data-testid="teams-error"
          >
            Couldn't load your teams. Please try again.
          </div>
        )}

        {showEmpty && (
          <EmptyState
            icon={Trophy}
            title="You don't manage any teams yet"
            description="Create a team to start organizing matches, training and your roster."
            ctaLabel="Create one"
            ctaHref={createHubPath("team")}
            testId="teams-empty-state"
          />
        )}

        {!isLoading && !isError && items.length > 0 && (
          <>
            {owned.length > 0 && (
              <section>
                <SectionHeader
                  title="Teams you own"
                  subtitle={`${owned.length} team${owned.length === 1 ? "" : "s"}`}
                />
                <div className="space-y-3">
                  {owned.map((t) => (
                    <MyHubTeamCard
                      key={t.id}
                      team={t}
                      canEdit={true}
                      onEdit={handleEdit}
                      onPostUpdate={handlePost}
                      onReviewRequests={handleRequests}
                      onJoinSettings={handleJoinSettings}
                      onInvitePlayer={handleInvite}
                      onLogGame={handleLogGame}
                      onManageHighlights={handleHighlights}
                    />
                  ))}
                </div>
              </section>
            )}

            {captaining.length > 0 && (
              <section>
                <SectionHeader
                  title="Teams you manage"
                  subtitle={`${captaining.length} team${captaining.length === 1 ? "" : "s"}`}
                />
                <div className="space-y-3">
                  {captaining.map((t) => (
                    <MyHubTeamCard
                      key={t.id}
                      team={t}
                      canEdit={true}
                      onEdit={handleEdit}
                      onPostUpdate={handlePost}
                      onReviewRequests={handleRequests}
                      onJoinSettings={handleJoinSettings}
                      onInvitePlayer={handleInvite}
                      onLogGame={handleLogGame}
                      onManageHighlights={handleHighlights}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <UpgradePromptCard
          title="Run your teams like a pro"
          description="Custom roles, attendance tracking, recruitment and a multi-team dashboard live in SURNA Pro."
        />

        <div className="h-4" />
      </div>

      <EditTeamSheet
        team={editTarget}
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditTarget(null);
        }}
      />
      <PostTeamUpdateSheet
        team={postTarget}
        open={postOpen}
        onOpenChange={(o) => {
          setPostOpen(o);
          if (!o) setPostTarget(null);
        }}
      />
      <TeamJoinRequestsSheet
        team={reqTarget}
        open={reqOpen}
        onOpenChange={(o) => {
          setReqOpen(o);
          if (!o) setReqTarget(null);
        }}
      />
      <ManageHighlightsSheet
        team={highlightsTarget}
        open={highlightsOpen}
        onOpenChange={(o) => {
          setHighlightsOpen(o);
          if (!o) setHighlightsTarget(null);
        }}
      />
      <TeamJoinSettingsSheet
        team={joinSettingsTarget}
        open={joinSettingsOpen}
        onOpenChange={(o) => {
          setJoinSettingsOpen(o);
          if (!o) setJoinSettingsTarget(null);
        }}
      />
      <TeamInvitePlayerSheet
        team={inviteTarget}
        open={inviteOpen}
        onOpenChange={(o) => {
          setInviteOpen(o);
          if (!o) setInviteTarget(null);
        }}
      />
      <LogTeamGameSheet
        team={logGameTarget}
        open={logGameOpen}
        onOpenChange={(o) => {
          setLogGameOpen(o);
          if (!o) setLogGameTarget(null);
        }}
      />
    </div>
  );
}
