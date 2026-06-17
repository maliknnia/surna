import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Heart, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PostWithAuthor } from "@shared/schema";
import { PostDetailSheet } from "@/components/feed/PostDetailSheet";
import { FeedVideoViewer } from "@/components/video/FeedVideoViewer";
import { useVideoViewer } from "@/hooks/useVideoViewer";

export function EventFeedSection({ eventId }: { eventId: string }) {
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const { videoViewer, openFromPost, close } = useVideoViewer();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/events", eventId, "feed"],
    enabled: !!eventId,
  });

  const posts = (data as { posts?: PostWithAuthor[] })?.posts ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: "var(--surna-elevated)" }} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-10 px-4 rounded-2xl" style={{ background: "var(--surna-elevated)" }}>
        <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-[14px] text-muted-foreground">No moments yet</p>
        <p className="text-[12px] text-muted-foreground mt-1">Posts from attendees will show here</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {posts.map((post: any) => {
          const author = post.author ?? {};
          const authorName =
            post.authorName ||
            author.displayName ||
            `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() ||
            "Member";
          const avatar = author.profileImageUrl;
          return (
            <button
              key={post.id}
              type="button"
              className="w-full text-left rounded-2xl p-4 active:scale-[0.99] transition-transform"
              style={{ background: "var(--surna-elevated)" }}
              onClick={() => {
                if (post.videoUrl) openFromPost(post, posts, "Event moments");
                else setDetailPostId(post.id);
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                {avatar ? (
                  <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 bg-muted/40 rounded-full" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate">{authorName}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="" className="rounded-xl w-full max-h-56 object-cover mb-3" />
              ) : post.videoUrl ? (
                <div className="rounded-xl overflow-hidden mb-3 aspect-video bg-muted/30">
                  <video src={post.videoUrl} className="w-full h-full object-cover" muted playsInline />
                </div>
              ) : null}
              {post.content ? (
                <p className="text-[14px] leading-relaxed line-clamp-4 text-muted-foreground">{post.content}</p>
              ) : null}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 pointer-events-none">
                <span className="flex items-center gap-1 text-muted-foreground text-[12px]">
                  <Heart size={14} /> {post.likesCount || 0}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground text-[12px]">
                  <MessageSquare size={14} /> {post.commentsCount || 0}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground text-[12px]">
                  <Share2 size={14} /> {post.sharesCount || 0}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <PostDetailSheet
        postId={detailPostId}
        open={!!detailPostId}
        onClose={() => setDetailPostId(null)}
        onVideoClick={(post) => openFromPost(post, posts, "Event moments")}
      />

      {videoViewer ? (
        <FeedVideoViewer videos={videoViewer.videos} initialIndex={videoViewer.startIndex} contextLabel={videoViewer.label} mode={videoViewer.mode} onClose={close} />
      ) : null}
    </>
  );
}
