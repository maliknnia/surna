import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Heart, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PostWithAuthor } from "@shared/schema";
import { PostDetailSheet } from "@/components/feed/PostDetailSheet";
import { FeedVideoViewer } from "@/components/video/FeedVideoViewer";
import { useVideoViewer } from "@/hooks/useVideoViewer";

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted/40 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-muted/40 rounded w-28 mb-1.5" />
                <div className="h-3 bg-muted/40 rounded w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3.5 bg-muted/40 rounded" />
              <div className="h-3.5 bg-muted/40 rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="glass-card text-center py-8">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-[14px]">No posts yet</p>
        <p className="text-muted-foreground text-[12px] mt-1">Member posts will show up here</p>
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
              className="glass-card w-full text-left active:scale-[0.99] transition-transform"
              onClick={() => {
                if (post.videoUrl) {
                  openFromPost(post, posts, "Team feed");
                } else {
                  setDetailPostId(post.id);
                }
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                {avatar ? (
                  <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-muted/40 rounded-full flex items-center justify-center">
                    <MessageSquare size={16} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-foreground truncate">{authorName}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>

              {post.videoUrl ? (
                <div className="rounded-xl overflow-hidden mb-3 aspect-video bg-muted/30">
                  <video src={post.videoUrl} className="w-full h-full object-cover" muted playsInline />
                </div>
              ) : post.imageUrl ? (
                <img src={post.imageUrl} alt="" className="rounded-xl w-full max-h-64 object-cover mb-3" />
              ) : null}

              <p className="text-[14px] text-foreground/70 leading-relaxed mb-4 line-clamp-4">{post.content}</p>

              <div className="flex items-center gap-5 pt-3 border-t border-border pointer-events-none">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Heart size={16} />
                  <span className="text-[12px]">{post.likesCount || 0}</span>
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageSquare size={16} />
                  <span className="text-[12px]">{post.commentsCount || 0}</span>
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Share2 size={16} />
                  <span className="text-[12px]">{post.sharesCount || 0}</span>
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
