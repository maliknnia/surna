import { db } from "../db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { enqueue, QUEUE_NAMES } from "./jobQueue";
import { purgeMediaUrls } from "../features/media/cdn";

export type MediaVisibility = "public" | "private" | "team" | "friends";
export type MediaStatus = "pending" | "processing" | "ready" | "failed";

export interface MediaRecord {
  id: string;
  ownerId: string;
  ownerType: string;
  entityId: string | null;
  entityType: string | null;
  mimeType: string;
  originalFilename: string;
  fileSize: number;
  fileHash: string | null;
  originalUrl: string;
  thumbUrl: string | null;
  mediumUrl: string | null;
  // Modern-format variants (WebP + AVIF) for both sizes. The frontend can
  // wrap these in a <picture> with the JPEG fallback to serve the smallest
  // file each browser supports.
  thumbWebpUrl: string | null;
  mediumWebpUrl: string | null;
  thumbAvifUrl: string | null;
  mediumAvifUrl: string | null;
  cdnUrl: string | null;
  visibility: MediaVisibility;
  status: MediaStatus;
  metadata: Record<string, any>;
  createdAt: Date;
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ALLOWED_DOC_TYPES = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const MAGIC_BYTES: Record<string, Buffer> = {
  "image/jpeg": Buffer.from([0xFF, 0xD8, 0xFF]),
  "image/png": Buffer.from([0x89, 0x50, 0x4E, 0x47]),
  "image/gif": Buffer.from([0x47, 0x49, 0x46]),
  "image/webp": Buffer.from([0x52, 0x49, 0x46, 0x46]),
  "application/pdf": Buffer.from([0x25, 0x50, 0x44, 0x46]),
};

export async function ensureMediaTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS media_assets (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id VARCHAR NOT NULL,
      owner_type VARCHAR NOT NULL DEFAULT 'user',
      entity_id VARCHAR,
      entity_type VARCHAR,
      mime_type VARCHAR NOT NULL,
      original_filename VARCHAR NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      file_hash VARCHAR,
      original_url TEXT NOT NULL,
      thumb_url TEXT,
      medium_url TEXT,
      thumb_webp_url TEXT,
      medium_webp_url TEXT,
      thumb_avif_url TEXT,
      medium_avif_url TEXT,
      cdn_url TEXT,
      visibility VARCHAR NOT NULL DEFAULT 'public',
      status VARCHAR NOT NULL DEFAULT 'pending',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_media_owner ON media_assets(owner_id, owner_type);
    CREATE INDEX IF NOT EXISTS idx_media_entity ON media_assets(entity_id, entity_type);
    CREATE INDEX IF NOT EXISTS idx_media_status ON media_assets(status);
  `);
  // Idempotent ADDs in case media_assets pre-existed without the new columns.
  await db.execute(sql`
    ALTER TABLE media_assets
      ADD COLUMN IF NOT EXISTS thumb_webp_url TEXT,
      ADD COLUMN IF NOT EXISTS medium_webp_url TEXT,
      ADD COLUMN IF NOT EXISTS thumb_avif_url TEXT,
      ADD COLUMN IF NOT EXISTS medium_avif_url TEXT;
  `);
}

export function validateFile(mimeType: string, fileSize: number, buffer?: Buffer): { valid: boolean; error?: string } {
  const allAllowed = new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOC_TYPES]);
  if (!allAllowed.has(mimeType)) {
    return { valid: false, error: `File type ${mimeType} is not allowed` };
  }

  const maxSize = ALLOWED_IMAGE_TYPES.has(mimeType) ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (fileSize > maxSize) {
    return { valid: false, error: `File exceeds maximum size of ${maxSize / 1024 / 1024}MB` };
  }

  if (buffer && MAGIC_BYTES[mimeType]) {
    const magic = MAGIC_BYTES[mimeType];
    if (!buffer.subarray(0, magic.length).equals(magic)) {
      return { valid: false, error: "File content does not match declared type" };
    }
  }

  return { valid: true };
}

export function computeFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function createMediaRecord(data: {
  ownerId: string;
  ownerType?: string;
  entityId?: string;
  entityType?: string;
  mimeType: string;
  originalFilename: string;
  fileSize: number;
  fileHash?: string;
  originalUrl: string;
  visibility?: MediaVisibility;
  metadata?: Record<string, any>;
}): Promise<MediaRecord> {
  const result = await db.execute(sql`
    INSERT INTO media_assets (owner_id, owner_type, entity_id, entity_type, mime_type,
      original_filename, file_size, file_hash, original_url, visibility, status, metadata)
    VALUES (${data.ownerId}, ${data.ownerType || "user"}, ${data.entityId || null},
      ${data.entityType || null}, ${data.mimeType}, ${data.originalFilename},
      ${data.fileSize}, ${data.fileHash || null}, ${data.originalUrl},
      ${data.visibility || "public"}, 'pending', ${JSON.stringify(data.metadata || {})}::jsonb)
    RETURNING *
  `);

  const record = result.rows[0] as any;

  if (ALLOWED_IMAGE_TYPES.has(data.mimeType)) {
    // 5 attempts (vs the global default of 3) â€” image resize jobs touch
    // remote S3 + remote source URLs and so are disproportionately exposed
    // to transient network blips. With 2s exponential backoff that's roughly
    // 2s, 4s, 8s, 16s between attempts, ~30s of headroom before the row is
    // marked failed.
    await enqueue(QUEUE_NAMES.MEDIA, "resize", { mediaId: record.id }, {
      idempotencyKey: `resize:${record.id}`,
      attempts: 5,
    });
  }

  return record;
}

export async function getMediaByOwner(ownerId: string, ownerType: string = "user"): Promise<MediaRecord[]> {
  const result = await db.execute(sql`
    SELECT * FROM media_assets WHERE owner_id = ${ownerId} AND owner_type = ${ownerType}
    ORDER BY created_at DESC LIMIT 100
  `);
  return result.rows as unknown as MediaRecord[];
}

export async function getMediaByEntity(entityId: string, entityType: string): Promise<MediaRecord[]> {
  const result = await db.execute(sql`
    SELECT * FROM media_assets WHERE entity_id = ${entityId} AND entity_type = ${entityType}
    ORDER BY created_at DESC
  `);
  return result.rows as unknown as MediaRecord[];
}

export async function updateMediaStatus(
  id: string,
  status: MediaStatus,
  urls?: {
    thumbUrl?: string; mediumUrl?: string; cdnUrl?: string;
    thumbWebpUrl?: string; mediumWebpUrl?: string;
    thumbAvifUrl?: string; mediumAvifUrl?: string;
  }
) {
  await db.execute(sql`
    UPDATE media_assets SET status = ${status},
      thumb_url       = COALESCE(${urls?.thumbUrl       || null}, thumb_url),
      medium_url      = COALESCE(${urls?.mediumUrl      || null}, medium_url),
      thumb_webp_url  = COALESCE(${urls?.thumbWebpUrl   || null}, thumb_webp_url),
      medium_webp_url = COALESCE(${urls?.mediumWebpUrl  || null}, medium_webp_url),
      thumb_avif_url  = COALESCE(${urls?.thumbAvifUrl   || null}, thumb_avif_url),
      medium_avif_url = COALESCE(${urls?.mediumAvifUrl  || null}, medium_avif_url),
      cdn_url         = COALESCE(${urls?.cdnUrl         || null}, cdn_url)
    WHERE id = ${id}
  `);
}

export async function deleteMedia(id: string, ownerId: string): Promise<boolean> {
  // Fetch the URLs before deleting so we can purge them from the CDN edge.
  // Without this, the 1-year immutable Cache-Control means deleted/moderated
  // media keeps being served from the edge until the TTL expires.
  const result = await db.execute(sql`
    DELETE FROM media_assets WHERE id = ${id} AND owner_id = ${ownerId}
    RETURNING id, original_url, thumb_url, medium_url,
              thumb_webp_url, medium_webp_url,
              thumb_avif_url, medium_avif_url, cdn_url
  `);
  if (result.rows.length === 0) return false;

  const row = result.rows[0] as any;
  // Fire-and-forget so a CDN outage can't block takedowns. Errors are logged
  // inside purgeMediaUrls.
  void purgeMediaUrls([
    row.original_url, row.thumb_url, row.medium_url,
    row.thumb_webp_url, row.medium_webp_url,
    row.thumb_avif_url, row.medium_avif_url, row.cdn_url,
  ]);

  return true;
}

export function generateSignedUrl(key: string, expiresIn: number = 3600): string {
  const base = process.env.S3_PUBLIC_BASE_URL || "";
  return `${base}/${key}?expires=${Date.now() + expiresIn * 1000}`;
}
