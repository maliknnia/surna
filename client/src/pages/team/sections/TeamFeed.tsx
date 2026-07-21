import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Pencil } from "lucide-react";
import type { PostWithAuthor } from "@shared/schema";
import { EntityEmptyState, EntityListSkeleton, entityCardStyle } from "@/components/entity";
import { PostDetailSheet } from "@/components/feed/PostDetailSheet";
import { FeedVideoViewer } from "@/components/video/FeedVideoViewer";
import { useVideoViewer } from "@/hooks/useVideoViewer";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import {
  CreateMediaSection,
  type CreateMediaValue,
} from "@/components/create/CreateMediaSection";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { invalidateTeamFeedQueries } from "@/lib/hubQueries";
import { useToast } from "@/hooks/use-toast";

interface TeamFeedProps {
  teamId: string;
  canManage?: boolean;
}

export default function TeamFeed({ teamId, canManage = false }: TeamFeedProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [coverMedia, setCoverMedia] = useState<CreateMediaValue>(null);
  const [showComposer, setShowComposer] = useState(false);
  const { videoViewer, openFromPost, close } = useVideoViewer();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/teams", teamId, "feed"],
  });

  const posts = (data as { posts?: PostWithAuthor[] })?.posts ?? [];

  const resetComposer = () => {
    setDraft("");
    setCoverMedia(null);
    setShowComposer(false);
  };

  const postMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/teams/${teamId}/feed`, {
        content: draft.trim(),
        imageUrl: coverMedia?.publicUrl ?? null,
      });
      return res.json();
    },
    onSuccess: () => {
      resetComposer();
      void invalidateTeamFeedQueries(qc, teamId);
      toast({ title: "Posted to team feed" });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not post",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const canSubmit = Boolean(draft.trim() || coverMedia?.publicUrl);

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      if (currentlyLiked) {
        await apiRequest("DELETE", `/api/posts/${postId}/like`);
      } else {
        await apiRequest("POST", `/api/posts/${postId}/like`, {});
      }
      void invalidateTeamFeedQueries(queryClient, teamId);
    } catch {
      /* ignore */
    }
  };

  const handleSave = async (postId: string, currentlySaved: boolean) => {
    try {
      if (currentlySaved) {
        await apiRequest("DELETE", `/api/posts/${postId}/save`);
      } else {
        await apiRequest("POST", `/api/posts/${postId}/save`, {});
      }
      void invalidateTeamFeedQueries(queryClient, teamId);
    } catch {
      /* ignore */
    }
  };

  if (isLoading) {
    return (
      <div className="px-1">
        <EntityListSkeleton rows={3} rowHeight={220} />
      </div>
    );
  }

  return (
    <>
      {canManage ? (
        <div className="px-1 mb-4 space-y-2">
          {!showComposer ? (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setShowComposer(true)}
            >
              <Pencil className="h-4 w-4" />
              Post a team update
            </Button>
          ) : (
            <div
              className="rounded-2xl p-3 space-y-3"
              style={{ ...entityCardStyle, background: "var(--surna-elevated)" }}
            >
              <CreateMediaSection
                cover={coverMedia}
                onCoverChange={setCoverMedia}
                coverLabel="Photo"
                coverHint="Optional — shows in the team feed with your update."
              />
              <Textarea
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Share news, results, or training notes…"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={resetComposer}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!canSubmit || postMutation.isPending}
                  onClick={() => postMutation.mutate()}
                >
                  {postMutation.isPending ? "Posting…" : "Post"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {posts.length === 0 ? (
        <EntityEmptyState
          icon={LayoutGrid}
          title="No posts yet"
          description={
            canManage
              ? "Post an update for members and fans to see here."
              : "When members share updates, they'll show up here."
          }
          actionLabel={canManage ? undefined : "Go to feed"}
          actionHref={canManage ? undefined : "/feed"}
        />
      ) : (
        <div className="space-y-3 px-1">
          {posts.map((post) => (
            <div key={post.id} className="rounded-2xl overflow-hidden" style={entityCardStyle}>
              <FeedPostCard
                post={post}
                onLike={handleLike}
                onSave={handleSave}
                onComment={(id) => setDetailPostId(id)}
                onShare={() => {}}
                onVideoClick={(p) => openFromPost(p, posts, "Team feed")}
              />
            </div>
          ))}
        </div>
      )}

      <PostDetailSheet
        postId={detailPostId}
        open={!!detailPostId}
        onClose={() => setDetailPostId(null)}
        onVideoClick={(post) => openFromPost(post, posts, "Team feed")}
      />

      {videoViewer ? (
        <FeedVideoViewer
          videos={videoViewer.videos}
          initialIndex={videoViewer.startIndex}
          contextLabel={videoViewer.label}
          mode={videoViewer.mode}
          onClose={close}
        />
      ) : null}
    </>
  );
}
