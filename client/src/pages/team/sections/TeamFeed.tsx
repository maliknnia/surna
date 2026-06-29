import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid } from "lucide-react";
import type { PostWithAuthor } from "@shared/schema";
import { EntityEmptyState, EntityListSkeleton, entityCardStyle } from "@/components/entity";
import { PostDetailSheet } from "@/components/feed/PostDetailSheet";
import { FeedVideoViewer } from "@/components/video/FeedVideoViewer";
import { useVideoViewer } from "@/hooks/useVideoViewer";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TeamFeedProps {
  teamId: string;
}

export default function TeamFeed({ teamId }: TeamFeedProps) {
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const { videoViewer, openFromPost, close } = useVideoViewer();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/teams", teamId, "feed"],
  });

  const posts = (data as { posts?: PostWithAuthor[] })?.posts ?? [];

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      if (currentlyLiked) {
        await apiRequest("DELETE", `/api/posts/${postId}/like`);
      } else {
        await apiRequest("POST", `/api/posts/${postId}/like`, {});
      }
      void queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "feed"] });
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
      void queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "feed"] });
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

  if (posts.length === 0) {
    return (
      <EntityEmptyState
        icon={LayoutGrid}
        title="No posts yet"
        description="When members share updates, they'll show up here."
        actionLabel="Go to feed"
        actionHref="/feed"
      />
    );
  }

  return (
    <>
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
