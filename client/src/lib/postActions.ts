import type { QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Post } from "@shared/schema";

export const FEED_QUERY_KEY = ["/api/posts/feed-keyset"] as const;

export function invalidateFeedQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
}

export async function createTextPost(payload: {
  content: string;
  sport?: string;
  location?: string;
}): Promise<Post> {
  const res = await apiRequest("POST", "/api/posts", {
    content: payload.content.trim(),
    postType: "text",
    mediaType: "text",
    sport: payload.sport || null,
    location: payload.location?.trim() || null,
  });
  return res.json();
}

export async function updatePost(
  postId: string,
  payload: { content?: string; sport?: string | null; location?: string | null },
): Promise<Post> {
  const res = await apiRequest("PATCH", `/api/posts/${postId}`, payload);
  return res.json();
}

export async function deletePost(postId: string): Promise<void> {
  await apiRequest("DELETE", `/api/posts/${postId}`);
}

export function removePostFromFeedCache(queryClient: QueryClient, postId: string) {
  queryClient.setQueryData(FEED_QUERY_KEY, (old: any) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: { items: { id: string }[] }) => ({
        ...page,
        items: page.items.filter((p) => p.id !== postId),
      })),
    };
  });
}

export function patchPostInFeedCache(
  queryClient: QueryClient,
  postId: string,
  patch: Partial<Post>,
) {
  queryClient.setQueryData(FEED_QUERY_KEY, (old: any) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: { items: { id: string }[] }) => ({
        ...page,
        items: page.items.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
      })),
    };
  });
}
