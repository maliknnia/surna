import type { QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Post, PostWithAuthor } from "@shared/schema";

export const FEED_QUERY_KEY = ["/api/posts/feed-keyset"] as const;

export function postDetailQueryKey(postId: string) {
  return ["/api/posts", postId] as const;
}

export function invalidateFeedQueries(queryClient: QueryClient, authorId?: string) {
  queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
  if (authorId) {
    queryClient.invalidateQueries({ queryKey: ["/api/profile", authorId, "feed"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users", authorId] });
  } else {
    queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
  }
}

export function findPostInFeedCache(
  queryClient: QueryClient,
  postId: string,
): (PostWithAuthor & { likedByMe?: boolean; savedByMe?: boolean }) | undefined {
  const old = queryClient.getQueryData(FEED_QUERY_KEY) as
    | { pages?: { items: { id: string }[] }[] }
    | undefined;
  if (!old?.pages) return undefined;
  for (const page of old.pages) {
    const found = page.items?.find((p) => p.id === postId);
    if (found) return found as PostWithAuthor & { likedByMe?: boolean; savedByMe?: boolean };
  }
  return undefined;
}

export function normalizePostDetail(raw: Record<string, unknown>) {
  return {
    ...raw,
    likedByMe: !!(raw.likedByMe ?? raw.isLiked),
    savedByMe: !!raw.savedByMe,
  } as PostWithAuthor & { likedByMe?: boolean; savedByMe?: boolean };
}

export function patchPostEngagementInCaches(
  queryClient: QueryClient,
  postId: string,
  patch: Record<string, unknown>,
) {
  patchPostInFeedCache(queryClient, postId, patch as Partial<Post>);
  queryClient.setQueryData(postDetailQueryKey(postId), (old: unknown) =>
    old && typeof old === "object" ? { ...old, ...patch } : old,
  );
  queryClient.setQueriesData<{ posts?: { id: string }[] }>(
    { queryKey: ["/api/profile"] },
    (old) => {
      if (!old?.posts) return old;
      return {
        ...old,
        posts: old.posts.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
      };
    },
  );
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
