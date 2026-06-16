import type { PostWithAuthor } from "@shared/schema";
import { inferVideoFormat } from "@/components/video/FeedVideoViewer";
import type { VideoPost } from "@/components/video/FeedVideoViewer";

/** Map a feed/profile post row into the immersive video viewer shape. */
export function mapPostToVideoPost(p: PostWithAuthor | Record<string, unknown>): VideoPost {
  const row = p as Record<string, unknown>;
  const eventData = row.eventData as { videoFormat?: string; durationSec?: number } | null | undefined;
  const a = (row.author ?? {}) as Record<string, unknown>;
  const item: VideoPost = {
    id: String(row.id),
    videoUrl: (row.videoUrl as string) ?? undefined,
    imageUrl: (row.imageUrl as string) ?? undefined,
    content: (row.content as string) ?? undefined,
    sport: (row.sport as string) ?? undefined,
    format: (row.videoFormat as VideoPost["format"]) ?? (eventData?.videoFormat as VideoPost["format"]),
    durationSec: (row.durationSec as number) ?? eventData?.durationSec,
    likesCount: (row.likesCount as number) ?? 0,
    commentsCount: (row.commentsCount as number) ?? 0,
    sharesCount: (row.sharesCount as number) ?? 0,
    likedByMe: !!(row.likedByMe ?? row.isLiked),
    savedByMe: !!row.savedByMe,
    entityType: (row.entityType as VideoPost["entityType"]) ??
      (row.teamId ? "team" : row.eventId ? "event" : undefined),
    entityId: (row.entityId as string) ?? (row.teamId as string) ?? (row.eventId as string),
    author: {
      id: a.id as string,
      firstName: a.firstName as string | undefined,
      lastName: a.lastName as string | undefined,
      profileImageUrl: a.profileImageUrl as string | null | undefined,
      email: a.email as string | undefined,
    },
  };
  return { ...item, format: inferVideoFormat(item) };
}
