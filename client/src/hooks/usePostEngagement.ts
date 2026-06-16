import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  FEED_QUERY_KEY,
  findPostInFeedCache,
  patchPostEngagementInCaches,
} from "@/lib/postActions";

/**
 * Like/save with optimistic updates across feed timeline, post detail, and profile grids.
 */
export function usePostEngagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const like = useCallback(
    async (postId: string, currentlyLiked: boolean) => {
      const likeDelta = currentlyLiked ? -1 : 1;
      const seed =
        findPostInFeedCache(queryClient, postId) ??
        (queryClient.getQueryData(["/api/posts", postId]) as { likesCount?: number } | undefined);
      const nextPatch = {
        likedByMe: !currentlyLiked,
        likesCount: Math.max(0, (seed?.likesCount || 0) + likeDelta),
      };

      await queryClient.cancelQueries({ queryKey: FEED_QUERY_KEY });
      const previousFeed = queryClient.getQueryData(FEED_QUERY_KEY);
      const previousDetail = queryClient.getQueryData(["/api/posts", postId]);

      queryClient.setQueryData(FEED_QUERY_KEY, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: { items: { id: string; likesCount?: number }[] }) => ({
            ...page,
            items: page.items.map((post) =>
              post.id === postId ? { ...post, ...nextPatch } : post,
            ),
          })),
        };
      });

      patchPostEngagementInCaches(queryClient, postId, nextPatch);

      try {
        if (currentlyLiked) {
          await apiRequest("POST", `/api/posts/${postId}/unlike`);
        } else {
          await apiRequest("POST", `/api/posts/${postId}/like`);
        }
      } catch {
        if (previousFeed !== undefined) {
          queryClient.setQueryData(FEED_QUERY_KEY, previousFeed);
        }
        if (previousDetail !== undefined) {
          queryClient.setQueryData(["/api/posts", postId], previousDetail);
        }
        toast({
          title: "Could not update like",
          description: "Please check your connection and try again.",
          variant: "destructive",
        });
      }
    },
    [queryClient, toast],
  );

  const save = useCallback(
    async (postId: string, currentlySaved: boolean) => {
      await queryClient.cancelQueries({ queryKey: FEED_QUERY_KEY });
      const previousFeed = queryClient.getQueryData(FEED_QUERY_KEY);
      const previousDetail = queryClient.getQueryData(["/api/posts", postId]);
      const nextSaved = !currentlySaved;

      queryClient.setQueryData(FEED_QUERY_KEY, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: { items: { id: string; savedByMe?: boolean }[] }) => ({
            ...page,
            items: page.items.map((post) =>
              post.id === postId ? { ...post, savedByMe: nextSaved } : post,
            ),
          })),
        };
      });

      patchPostEngagementInCaches(queryClient, postId, { savedByMe: nextSaved });

      try {
        if (currentlySaved) {
          await apiRequest("DELETE", `/api/posts/${postId}/save`);
        } else {
          await apiRequest("POST", `/api/posts/${postId}/save`);
        }
      } catch {
        if (previousFeed !== undefined) {
          queryClient.setQueryData(FEED_QUERY_KEY, previousFeed);
        }
        if (previousDetail !== undefined) {
          queryClient.setQueryData(["/api/posts", postId], previousDetail);
        }
        toast({
          title: "Could not update save",
          description: "Please check your connection and try again.",
          variant: "destructive",
        });
      }
    },
    [queryClient, toast],
  );

  return { like, save };
}
