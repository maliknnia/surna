import { db } from "../../db";
import { sql } from "drizzle-orm";
import { ensureModernUrlColumns } from "../media/media.repo";

import type { FeedItem } from "./feed.types";

type Row = FeedItem;

// Drizzle's raw `db.execute` returns `Record<string, unknown>[]`. Our SQL
// uses explicit AS aliases that match the FeedItem field names, so we coerce
// at this single boundary rather than peppering casts at every call site.
const coerceRows = (rows: readonly Record<string, unknown>[]): Row[] =>
  rows.map((r) => r as unknown as Row);

// Selects post columns and LEFT JOINs the most recent ready `media` row for
// the post so the API can return the small `_thumb` URL to feed cards and the
// larger `_medium` URL to detail surfaces. The DISTINCT ON keeps each post
// to a single media row (newest first) â€” multi-image posts aren't supported
// in the feed view today and would need a follow-up to fan out.
const POST_COLS = sql`
  p.id,
  p.author_id AS "userId",
  p.content   AS "caption",
  p.created_at AS "createdAt",
  COALESCE(m.thumb_url,        p.image_url) AS "thumbUrl",
  COALESCE(m.medium_url,       p.image_url) AS "mediumUrl",
  m.thumb_webp_url   AS "thumbWebpUrl",
  m.medium_webp_url  AS "mediumWebpUrl",
  m.thumb_avif_url   AS "thumbAvifUrl",
  m.medium_avif_url  AS "mediumAvifUrl",
  u.username,
  u.profile_image_url AS "avatarThumbUrl",
  COALESCE(p.likes_count,0)    AS "likeCount",
  COALESCE(p.comments_count,0) AS "commentCount"
`;

// LEFT JOIN against the latest ready media row per post. Done as a lateral
// subquery so posts with no media row (text-only or pre-worker uploads)
// still appear, and posts with multiple uploads get a deterministic pick.
const MEDIA_JOIN = sql`
  LEFT JOIN LATERAL (
    SELECT thumb_url, medium_url,
           thumb_webp_url, medium_webp_url,
           thumb_avif_url, medium_avif_url
    FROM media
    WHERE media.post_id = p.id AND media.status = 'ready'
    ORDER BY media.created_at DESC
    LIMIT 1
  ) m ON TRUE
`;

export async function fetchGlobalFeedPage(q: {
  cursorCreatedAt?: string;
  cursorId?: string;
  limit: number;
}): Promise<Row[]> {
  // The modern WebP/AVIF URL columns are added lazily by the media module.
  // Calling this here guarantees the JOIN below sees them on a fresh DB
  // even if no media row has been inserted yet (idempotent + memoised).
  await ensureModernUrlColumns();
  const where =
    q.cursorCreatedAt && q.cursorId
      ? sql`WHERE p.created_at < ${q.cursorCreatedAt} OR (p.created_at = ${q.cursorCreatedAt} AND p.id < ${q.cursorId})`
      : sql``;

  const rows = await db.execute(sql`
    SELECT ${POST_COLS}
    FROM posts p
    JOIN users u ON u.id = p.author_id
    ${MEDIA_JOIN}
    ${where}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${q.limit};
  `);
  return coerceRows(rows.rows);
}


export async function fetchFollowingFeedPage(q: {
  userId: string;
  cursorCreatedAt?: string;
  cursorId?: string;
  limit: number;
}): Promise<Row[]> {
  await ensureModernUrlColumns();
  const boundary =
    q.cursorCreatedAt && q.cursorId
      ? sql`AND (p.created_at < ${q.cursorCreatedAt} OR (p.created_at = ${q.cursorCreatedAt} AND p.id < ${q.cursorId}))`
      : sql``;

  const rows = await db.execute(sql`
    SELECT ${POST_COLS}
    FROM follows f
    JOIN posts p ON p.author_id = f.following_id
    JOIN users u ON u.id = p.author_id
    ${MEDIA_JOIN}
    WHERE f.follower_id = ${q.userId}
      AND f.following_type = 'user'
    ${boundary}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${q.limit};
  `);
  return coerceRows(rows.rows);
}
