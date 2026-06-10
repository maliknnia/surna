import { db } from "../../db";
import { sql } from "drizzle-orm";
import type { MediaKind } from "./media.types";

// Lazily make sure the modern-format URL columns exist. The `media` table is
// not part of the Drizzle schema (raw SQL elsewhere), so the worker writing
// WebP/AVIF URLs would otherwise blow up on a fresh DB. `ADD COLUMN IF NOT
// EXISTS` is idempotent and cheap, so we run it once on first use.
let columnsEnsured: Promise<void> | null = null;
export function ensureModernUrlColumns(): Promise<void> {
  if (!columnsEnsured) {
    columnsEnsured = (async () => {
      try {
        await db.execute(sql`
          ALTER TABLE media
            ADD COLUMN IF NOT EXISTS thumb_webp_url TEXT,
            ADD COLUMN IF NOT EXISTS medium_webp_url TEXT,
            ADD COLUMN IF NOT EXISTS thumb_avif_url TEXT,
            ADD COLUMN IF NOT EXISTS medium_avif_url TEXT;
        `);
      } catch (err) {
        const code = (err as { code?: string } | null)?.code;
        const message = (err as { message?: string } | null)?.message ?? String(err);
        // 42P01 = undefined_table â€” the `media` table simply doesn't exist
        // on this deployment yet; the first INSERT will surface the real
        // error with a clearer message, so swallowing here is intentional.
        if (code === "42P01") return;
        // Anything else (permission denied, lock timeout, syntax) is a real
        // problem we want visibility into; allow the next call to retry by
        // clearing the cached promise.
        columnsEnsured = null;
        console.error("[media.repo] ensureModernUrlColumns failed:", code ?? "", message);
      }
    })();
  }
  return columnsEnsured;
}

/** Legacy post/event media table used by events list joins and upload pipeline. */
let tableEnsured: Promise<void> | null = null;
export function ensureLegacyMediaTable(): Promise<void> {
  if (!tableEnsured) {
    tableEnsured = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS media (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id text NOT NULL,
          post_id uuid NULL,
          kind text NOT NULL DEFAULT 'image',
          status text NOT NULL DEFAULT 'pending',
          original_url text NOT NULL,
          medium_url text NULL,
          thumb_url text NULL,
          medium_webp_url text NULL,
          thumb_webp_url text NULL,
          medium_avif_url text NULL,
          thumb_avif_url text NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_media_post_ready_created
          ON media(post_id, status, created_at DESC);
      `);
    })().catch((err) => {
      tableEnsured = null;
      throw err;
    });
  }
  return tableEnsured;
}

const SELECT_COLS = sql`
  id, user_id AS "userId", post_id AS "postId", kind, status,
  original_url AS "originalUrl",
  thumb_url AS "thumbUrl", medium_url AS "mediumUrl",
  thumb_webp_url AS "thumbWebpUrl", medium_webp_url AS "mediumWebpUrl",
  thumb_avif_url AS "thumbAvifUrl", medium_avif_url AS "mediumAvifUrl",
  created_at AS "createdAt"
`;

export async function insertPendingMedia(userId: string, kind: MediaKind, originalUrl: string) {
  await ensureModernUrlColumns();
  const q = await db.execute(sql`
    INSERT INTO media (user_id, kind, status, original_url)
    VALUES (${userId}, ${kind}, 'pending', ${originalUrl})
    RETURNING ${SELECT_COLS};
  `);
  return q.rows[0];
}

export interface ResizedUrls {
  thumbUrl?: string;
  mediumUrl?: string;
  thumbWebpUrl?: string;
  mediumWebpUrl?: string;
  thumbAvifUrl?: string;
  mediumAvifUrl?: string;
}

export async function markMediaReady(mediaId: string, urls: ResizedUrls) {
  await ensureModernUrlColumns();
  const q = await db.execute(sql`
    UPDATE media
    SET status = 'ready',
        thumb_url        = COALESCE(${urls.thumbUrl       ?? null}, thumb_url),
        medium_url       = COALESCE(${urls.mediumUrl      ?? null}, medium_url),
        thumb_webp_url   = COALESCE(${urls.thumbWebpUrl   ?? null}, thumb_webp_url),
        medium_webp_url  = COALESCE(${urls.mediumWebpUrl  ?? null}, medium_webp_url),
        thumb_avif_url   = COALESCE(${urls.thumbAvifUrl   ?? null}, thumb_avif_url),
        medium_avif_url  = COALESCE(${urls.mediumAvifUrl  ?? null}, medium_avif_url)
    WHERE id = ${mediaId}
    RETURNING ${SELECT_COLS};
  `);
  return q.rows[0];
}

export async function markMediaFailed(mediaId: string) {
  await db.execute(sql`UPDATE media SET status = 'failed' WHERE id = ${mediaId};`);
}

export async function loadMedia(mediaId: string) {
  await ensureModernUrlColumns();
  const q = await db.execute(sql`
    SELECT ${SELECT_COLS}
    FROM media WHERE id = ${mediaId} LIMIT 1;
  `);
  return q.rows[0] ?? null;
}

export async function attachMediaToPost(mediaId: string, postId: string) {
  await db.execute(sql`UPDATE media SET post_id = ${postId} WHERE id = ${mediaId};`);
}
