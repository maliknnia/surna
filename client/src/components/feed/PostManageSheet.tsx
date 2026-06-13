import { useEffect, useState } from "react";
import {
  Copy,
  Flag,
  Pencil,
  Trash2,
  ChevronLeft,
  Ban,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { PostWithAuthor } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  deletePost,
  invalidateFeedQueries,
  patchPostInFeedCache,
  removePostFromFeedCache,
  updatePost,
} from "@/lib/postActions";
import { PostComposeFields } from "./PostComposeFields";

type Props = {
  post: (PostWithAuthor & { likedByMe?: boolean }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string | null;
};

type Mode = "menu" | "edit";

export function PostManageSheet({ post, open, onOpenChange, currentUserId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("menu");
  const [content, setContent] = useState("");
  const [sport, setSport] = useState("");
  const [location, setLocation] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwn = !!post && !!currentUserId && post.authorId === currentUserId;

  useEffect(() => {
    if (open && post) {
      setMode("menu");
      setConfirmDelete(false);
      setContent(post.content ?? "");
      setSport(post.sport ?? "");
      setLocation(post.location ?? "");
    }
  }, [open, post]);

  const editMutation = useMutation({
    mutationFn: () => {
      if (!post) throw new Error("No post");
      return updatePost(post.id, {
        content: content.trim(),
        sport: sport || null,
        location: location.trim() || null,
      });
    },
    onSuccess: (updated) => {
      patchPostInFeedCache(queryClient, updated.id, updated);
      toast({ title: "Post updated" });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Couldn't save changes",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!post) throw new Error("No post");
      return deletePost(post.id);
    },
    onSuccess: () => {
      if (post) removePostFromFeedCache(queryClient, post.id);
      invalidateFeedQueries(queryClient);
      toast({ title: "Post deleted" });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Couldn't delete post",
        variant: "destructive",
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!post) throw new Error("No post");
      await apiRequest("POST", "/api/reports", {
        contentType: "post",
        contentId: post.id,
        reason: "other",
        description: `Reported post by ${post.authorId}`,
      });
    },
    onSuccess: () => {
      toast({ title: "Report submitted" });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Couldn't submit report",
        variant: "destructive",
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      if (!post?.authorId) throw new Error("No author");
      await apiRequest("POST", `/api/users/${post.authorId}/block`);
    },
    onSuccess: () => {
      if (post) removePostFromFeedCache(queryClient, post.id);
      invalidateFeedQueries(queryClient);
      toast({ title: "User blocked", description: "Their posts won't appear in your feed." });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Couldn't block user", variant: "destructive" });
    },
  });

  const copyLink = async () => {
    const url = `${window.location.origin}/feed?post=${post?.id ?? ""}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
      onOpenChange(false);
    } catch {
      toast({ title: "Couldn't copy link", variant: "destructive" });
    }
  };

  if (!post) return null;

  const menuBtn =
    "w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-medium transition-colors";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surna-border)] max-h-[88vh] overflow-y-auto"
        style={{ background: "var(--surna-elevated)" }}
        data-testid="post-manage-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>
            {mode === "edit" ? "Edit post" : "Post options"}
          </SheetTitle>
        </SheetHeader>

        {mode === "edit" ? (
          <div className="mt-4 space-y-4 pb-4">
            <button
              type="button"
              onClick={() => setMode("menu")}
              className="flex items-center gap-1 text-sm font-medium"
              style={{ color: "var(--surna-text-muted)" }}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <PostComposeFields
              content={content}
              sport={sport}
              location={location}
              onContentChange={setContent}
              onSportChange={setSport}
              onLocationChange={setLocation}
              contentId="post-edit-content"
            />
            <Button
              type="button"
              className="w-full rounded-2xl"
              disabled={!content.trim() || editMutation.isPending}
              onClick={() => editMutation.mutate()}
            >
              {editMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-2 pb-4">
            {isOwn && (
              <button
                type="button"
                className={menuBtn}
                style={{ background: "var(--surna-surface)", color: "var(--surna-text)" }}
                onClick={() => setMode("edit")}
                data-testid="post-manage-edit"
              >
                <Pencil className="h-4 w-4" />
                Edit post
              </button>
            )}

            <button
              type="button"
              className={menuBtn}
              style={{ background: "var(--surna-surface)", color: "var(--surna-text)" }}
              onClick={() => void copyLink()}
            >
              <Copy className="h-4 w-4" />
              Copy link
            </button>

            {!isOwn && (
              <>
                <button
                  type="button"
                  className={menuBtn}
                  style={{ background: "var(--surna-surface)", color: "var(--surna-text)" }}
                  disabled={reportMutation.isPending}
                  onClick={() => reportMutation.mutate()}
                >
                  <Flag className="h-4 w-4" />
                  Report post
                </button>
                <button
                  type="button"
                  className={menuBtn}
                  style={{ background: "var(--surna-surface)", color: "var(--surna-text)" }}
                  disabled={blockMutation.isPending}
                  onClick={() => blockMutation.mutate()}
                >
                  <Ban className="h-4 w-4" />
                  Block author
                </button>
              </>
            )}

            {isOwn && !confirmDelete && (
              <button
                type="button"
                className={menuBtn}
                style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}
                onClick={() => setConfirmDelete(true)}
                data-testid="post-manage-delete"
              >
                <Trash2 className="h-4 w-4" />
                Delete post
              </button>
            )}

            {isOwn && confirmDelete && (
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--surna-text)" }}>
                  Delete this post permanently?
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1 rounded-xl"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
