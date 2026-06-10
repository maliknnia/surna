import { Worker, Job } from "bullmq";
import sharp from "sharp";
import { s3 } from "../features/media/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { loadMedia, markMediaReady, markMediaFailed } from "../features/media/media.repo";
import { recordJobFailed } from "./metrics";
import { IMAGE_JPEG_QUALITY, IMAGE_MAX_WIDTH } from "../lib/imageCompression";

const bucket = process.env.S3_BUCKET!;
const publicBase = process.env.S3_PUBLIC_BASE_URL!;

const MEDIA_CACHE_CONTROL = process.env.MEDIA_CACHE_CONTROL || "public, max-age=31536000, immutable";

// Modern formats are emitted alongside the JPEG fallback so the frontend can
// pick the smallest one a browser supports via <picture>/<source>:
//   - WebP: ~25-35% smaller than JPEG, supported everywhere except very old iOS.
//   - AVIF: ~50% smaller than JPEG, supported on all evergreen browsers.
// Skipping AVIF is opt-in via MEDIA_DISABLE_AVIF=1 (AVIF encode is the slowest
// path through libsharp; on tiny instances it can dominate worker time).
const ENABLE_AVIF = process.env.MEDIA_DISABLE_AVIF !== "1";

async function uploadBuffer(key: string, buf: Buffer, contentType: string) {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buf,
    ContentType: contentType,
    CacheControl: MEDIA_CACHE_CONTROL,
    ACL: "public-read",
  });
  await s3.send(cmd);
  return `${publicBase}/${key}`;
}

async function processImage(mediaId: string, originalUrl: string) {
  // Fetch original file
  const res = await fetch(originalUrl);
  if (!res.ok) throw new Error(`Fetch original failed: ${res.status}`);
  const arr = await res.arrayBuffer();
  const input = Buffer.from(arr);

  const baseKey = `media/${mediaId}`;

  // Build a single rotated/resized base for each size, then re-encode to each
  // output format from that base. Reusing the resized pixel buffer is cheaper
  // than running sharp() three times per size from the original bytes.
  const thumbBase = sharp(input).rotate().resize({ width: 256, withoutEnlargement: true });
  const mediumBase = sharp(input).rotate().resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true });

  const encodes: Array<Promise<{ kind: string; key: string; buf: Buffer; contentType: string }>> = [
    thumbBase.clone().jpeg({ quality: 74 }).toBuffer().then(buf => ({ kind: "thumb",  key: `${baseKey}_thumb.jpg`,   buf, contentType: "image/jpeg" })),
    mediumBase.clone().jpeg({ quality: IMAGE_JPEG_QUALITY }).toBuffer().then(buf => ({ kind: "medium", key: `${baseKey}_medium.jpg`,  buf, contentType: "image/jpeg" })),
    thumbBase.clone().webp({ quality: 72 }).toBuffer().then(buf => ({ kind: "thumbWebp",  key: `${baseKey}_thumb.webp`,  buf, contentType: "image/webp" })),
    mediumBase.clone().webp({ quality: 78 }).toBuffer().then(buf => ({ kind: "mediumWebp", key: `${baseKey}_medium.webp`, buf, contentType: "image/webp" })),
  ];
  if (ENABLE_AVIF) {
    encodes.push(
      thumbBase.clone().avif({ quality: 50 }).toBuffer().then(buf => ({ kind: "thumbAvif",  key: `${baseKey}_thumb.avif`,  buf, contentType: "image/avif" })),
      mediumBase.clone().avif({ quality: 55 }).toBuffer().then(buf => ({ kind: "mediumAvif", key: `${baseKey}_medium.avif`, buf, contentType: "image/avif" })),
    );
  }

  const encoded = await Promise.all(encodes);

  // Upload all variants in parallel — S3 PUTs are independent.
  const uploads = await Promise.all(
    encoded.map(async (e) => ({ kind: e.kind, url: await uploadBuffer(e.key, e.buf, e.contentType) }))
  );
  const urlByKind: Record<string, string> = {};
  for (const u of uploads) urlByKind[u.kind] = u.url;

  await markMediaReady(mediaId, {
    thumbUrl: urlByKind.thumb,
    mediumUrl: urlByKind.medium,
    thumbWebpUrl: urlByKind.thumbWebp,
    mediumWebpUrl: urlByKind.mediumWebp,
    thumbAvifUrl: urlByKind.thumbAvif,
    mediumAvifUrl: urlByKind.mediumAvif,
  });
}

export async function closeMediaWorker(): Promise<void> {
  try {
    await mediaWorker.close();
    console.log("[worker:media] closed");
  } catch (err: any) {
    console.error(`[worker:media] close failed: ${err?.message || err}`);
  }
}

export const mediaWorker = new Worker("media", async (job: Job) => {
  if (job.name === "resize") {
    const { mediaId } = job.data as { mediaId: string };
    const media = await loadMedia(mediaId);
    if (!media) throw new Error("media not found");
    if (media.kind !== "image") return; // skip for now
    await processImage(mediaId, String(media.originalUrl ?? ""));
  }
}, { connection: { url: process.env.REDIS_URL! } });

mediaWorker.on("failed", async (job, err) => {
  // BullMQ fires `failed` once per attempt. Marking the media row as failed
  // on the first error breaks the retry contract — a transient S3 blip
  // would leave the user looking at a permanently broken upload while
  // BullMQ silently re-runs the job and succeeds. Only flip the row and
  // bump the terminal-failure metric once every retry has been exhausted.
  const mediaId = job?.data?.mediaId as string | undefined;
  const attemptsMade = job?.attemptsMade ?? 0;
  const maxAttempts = job?.opts?.attempts ?? 1;
  const willRetry = attemptsMade < maxAttempts;

  if (willRetry) {
    console.warn(
      `[worker:media] resize attempt ${attemptsMade}/${maxAttempts} failed for media=${mediaId}; will retry. ${err.message}`,
    );
    return;
  }
  recordJobFailed("media");
  if (mediaId) await markMediaFailed(mediaId);
  console.error(
    `[worker:media] resize giving up after ${attemptsMade}/${maxAttempts} attempts for media=${mediaId}: ${err.message}`,
  );
});
