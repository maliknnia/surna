import { createPresignedPut, putObjectBuffer, buildUploadKey, isS3Configured } from "./s3";
import { insertPendingMedia, attachMediaToPost, loadMedia } from "./media.repo";
import { mediaQueue } from "../../worker/media.queue";
import type { MediaKind } from "./media.types";
import { compressImageForStorage, isCompressibleImage } from "../../lib/imageCompression";

const MAX_MB = Number(process.env.UPLOAD_MAX_MB ?? 15);

export async function uploadImageToS3(
  userId: string,
  filename: string,
  buffer: Buffer,
  contentType: string,
) {
  if (!isCompressibleImage(contentType)) {
    throw new Error("UNSUPPORTED_IMAGE_TYPE");
  }
  if (buffer.length > MAX_MB * 1024 * 1024) {
    throw new Error(`FILE_TOO_LARGE_${MAX_MB}MB`);
  }
  if (!isS3Configured()) {
    throw new Error("S3_NOT_CONFIGURED");
  }

  const { buffer: compressed } = await compressImageForStorage(buffer);
  const key = buildUploadKey(userId, filename);
  const publicUrl = await putObjectBuffer(key, compressed, "image/jpeg");

  const media = await insertPendingMedia(userId, "image", publicUrl);
  const mediaId = String((media as { id: string }).id);
  if (mediaQueue) {
    await mediaQueue.add("resize", { mediaId }, { removeOnComplete: true, removeOnFail: true });
  }
  return { mediaId, publicUrl };
}

export async function initUpload(userId: string, kind: MediaKind, filename: string, contentType: string, sizeBytes: number) {
  if (sizeBytes > MAX_MB * 1024 * 1024) {
    throw new Error(`FILE_TOO_LARGE_${MAX_MB}MB`);
  }

  // Images must go through server-side Sharp compression before S3.
  if (kind === "image" && isCompressibleImage(contentType)) {
    return {
      mediaId: null as string | null,
      uploadMode: "multipart" as const,
      uploadEndpoint: "/api/media/upload-image",
      maxBytes: MAX_MB * 1024 * 1024,
    };
  }

  const ts = Date.now();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `uploads/${userId}/${ts}_${safe}`;

  const { uploadUrl, publicUrl, cacheControl } = await createPresignedPut(key, contentType, 900);

  const media = await insertPendingMedia(userId, kind, publicUrl);

  return { mediaId: media.id, uploadUrl, publicUrl, cacheControl, uploadMode: "presigned" as const };
}

export async function completeUpload(mediaId: string, userId: string) {
  const media = await loadMedia(mediaId);
  if (!media || (media as { userId?: string }).userId !== userId) {
    throw new Error("FORBIDDEN");
  }
  if (mediaQueue) {
    await mediaQueue.add("resize", { mediaId }, { removeOnComplete: true, removeOnFail: true });
  }
}

export async function attach(mediaId: string, postId: string, userId: string) {
  const media = await loadMedia(mediaId);
  if (!media || (media as { userId?: string }).userId !== userId) {
    throw new Error("FORBIDDEN");
  }
  await attachMediaToPost(mediaId, postId);
}
