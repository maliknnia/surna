import { createPresignedPut, putObjectBuffer, buildUploadKey, isS3Configured } from "./s3";
import { insertPendingMedia, attachMediaToPost, loadMedia } from "./media.repo";
import { mediaQueue } from "../../worker/media.queue";
import type { MediaKind } from "./media.types";
import { compressImageForStorage, isCompressibleImage } from "../../lib/imageCompression";
import {
  isCloudinaryConfigured,
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
} from "../../services/cloudinaryMedia";

const MAX_MB = Number(process.env.UPLOAD_MAX_MB ?? 15);
const VIDEO_MAX_MB = Number(process.env.VIDEO_MAX_MB ?? 100);

function maxBytesForKind(kind: MediaKind): number {
  return (kind === "video" ? VIDEO_MAX_MB : MAX_MB) * 1024 * 1024;
}

export function isMediaStorageConfigured(): boolean {
  return isS3Configured() || isCloudinaryConfigured();
}

export async function uploadImage(
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
  if (!isMediaStorageConfigured()) {
    throw new Error("MEDIA_STORAGE_NOT_CONFIGURED");
  }

  const { buffer: compressed } = await compressImageForStorage(buffer);

  if (isCloudinaryConfigured()) {
    const uploaded = await uploadImageToCloudinary(compressed, filename);
    const media = await insertPendingMedia(userId, "image", uploaded.publicUrl);
    return {
      mediaId: String((media as { id: string }).id),
      publicUrl: uploaded.publicUrl,
      provider: "cloudinary" as const,
    };
  }

  if (isS3Configured()) {
    const key = buildUploadKey(userId, filename);
    const publicUrl = await putObjectBuffer(key, compressed, "image/jpeg");
    const media = await insertPendingMedia(userId, "image", publicUrl);
    const mediaId = String((media as { id: string }).id);
    if (mediaQueue) {
      await mediaQueue.add("resize", { mediaId }, { removeOnComplete: true, removeOnFail: true });
    }
    return { mediaId, publicUrl, provider: "s3" as const };
  }

  throw new Error("MEDIA_STORAGE_NOT_CONFIGURED");
}

/** @deprecated alias */
export const uploadImageToS3 = uploadImage;

export async function uploadVideo(
  userId: string,
  filename: string,
  buffer: Buffer,
  contentType: string,
) {
  if (!contentType.startsWith("video/")) {
    throw new Error("UNSUPPORTED_VIDEO_TYPE");
  }
  if (buffer.length > VIDEO_MAX_MB * 1024 * 1024) {
    throw new Error(`FILE_TOO_LARGE_${VIDEO_MAX_MB}MB`);
  }

  if (isCloudinaryConfigured()) {
    const uploaded = await uploadVideoToCloudinary(buffer, filename);
    const media = await insertPendingMedia(userId, "video", uploaded.videoUrl);
    return {
      mediaId: String((media as { id: string }).id),
      publicUrl: uploaded.videoUrl,
      thumbnailUrl: uploaded.thumbnailUrl,
      provider: "cloudinary" as const,
    };
  }

  if (isS3Configured()) {
    const ts = Date.now();
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `uploads/${userId}/${ts}_${safe}`;
    const publicUrl = await putObjectBuffer(key, buffer, contentType);
    const media = await insertPendingMedia(userId, "video", publicUrl);
    return {
      mediaId: String((media as { id: string }).id),
      publicUrl,
      provider: "s3" as const,
    };
  }

  throw new Error("MEDIA_STORAGE_NOT_CONFIGURED");
}

export async function initUpload(userId: string, kind: MediaKind, filename: string, contentType: string, sizeBytes: number) {
  const limitMb = kind === "video" ? VIDEO_MAX_MB : MAX_MB;
  if (sizeBytes > maxBytesForKind(kind)) {
    throw new Error(`FILE_TOO_LARGE_${limitMb}MB`);
  }

  if (!isMediaStorageConfigured()) {
    throw new Error("MEDIA_STORAGE_NOT_CONFIGURED");
  }

  // Images → server multipart (Sharp → Cloudinary or S3).
  if (kind === "image" && isCompressibleImage(contentType)) {
    return {
      mediaId: null as string | null,
      uploadMode: "multipart" as const,
      uploadEndpoint: "/api/media/upload-image",
      maxBytes: MAX_MB * 1024 * 1024,
      provider: isCloudinaryConfigured() ? "cloudinary" : "s3",
    };
  }

  // Video → Cloudinary multipart when configured (free tier friendly).
  if (kind === "video" && isCloudinaryConfigured()) {
    return {
      mediaId: null as string | null,
      uploadMode: "multipart" as const,
      uploadEndpoint: "/api/media/upload-video",
      maxBytes: VIDEO_MAX_MB * 1024 * 1024,
      provider: "cloudinary" as const,
    };
  }

  if (!isS3Configured()) {
    throw new Error("MEDIA_STORAGE_NOT_CONFIGURED");
  }

  const ts = Date.now();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `uploads/${userId}/${ts}_${safe}`;

  const { uploadUrl, publicUrl, cacheControl } = await createPresignedPut(key, contentType, 900);

  const media = await insertPendingMedia(userId, kind, publicUrl);

  return {
    mediaId: media.id,
    uploadUrl,
    publicUrl,
    cacheControl,
    uploadMode: "presigned" as const,
    provider: "s3" as const,
  };
}

export async function completeUpload(mediaId: string, userId: string) {
  const media = await loadMedia(mediaId);
  if (!media || (media as { userId?: string }).userId !== userId) {
    throw new Error("FORBIDDEN");
  }
  if (mediaQueue && isS3Configured()) {
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
