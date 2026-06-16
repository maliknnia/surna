import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import type { PostWithAuthor } from "@shared/schema";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { CommentsSheet } from "@/components/comments/CommentsSheet";
import { ShareModal } from "@/components/ShareModal";
import { usePostEngagement } from "@/hooks/usePostEngagement";
import { apiRequest } from "@/lib/queryClient";
import {
  findPostInFeedCache,
  normalizePostDetail,
  postDetailQueryKey,
} from "@/lib/postActions";

type PostDetailSheetProps = {
  postId: string | null;
  open: boolean;
  onClose: () => void;
  onVideoClick?: (post: PostWithAuthor) => void;
};

export function PostDetailSheet({
  postId,
  open,
  onClose,
  onVideoClick,
}: PostDetailSheetProps) {
  const queryClient = useQueryClient();
  const { like, save } = usePostEngagement();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: post, isLoading, isError } = useQuery({
    queryKey: postId ? postDetailQueryKey(postId) : ["post-detail", "none"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/posts/${postId}`);
      return normalizePostDetail(await res.json());
    },
    enabled: open && !!postId,
    staleTime: 30_000,
    initialData: () =>
      postId ? findPostInFeedCache(queryClient, postId) : undefined,
  });

  const handleClose = () => {
    setCommentsOpen(false);
    setShareOpen(false);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !next && handleClose()}>
        <SheetContent
          side="bottom"
          className="h-[92dvh] max-w-[480px] mx-auto p-0 gap-0 border-x overflow-hidden flex flex-col"
          aria-describedby={undefined}
        >
          <div
            className="flex shrink-0 items-center justify-between border-b px-3 py-2"
            style={{ borderColor: "var(--surna-border)" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
              Post
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-1.5 hover:bg-muted/60"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {isLoading && !post ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : isError || !post ? (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                Couldn&apos;t load this post. It may have been removed.
              </div>
            ) : (
              <FeedPostCard
                post={post}
                onLike={like}
                onSave={save}
                onComment={() => setCommentsOpen(true)}
                onShare={() => setShareOpen(true)}
                onVideoClick={onVideoClick}
                onDeleted={handleClose}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {postId && (
        <>
          <CommentsSheet
            isOpen={commentsOpen}
            onClose={() => setCommentsOpen(false)}
            postId={postId}
          />
          <ShareModal postId={postId} open={shareOpen} onOpenChange={setShareOpen} />
        </>
      )}
    </>
  );
}
