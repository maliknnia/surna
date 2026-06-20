import { z } from "zod";

export const InitUploadSchema = z.object({
  kind: z.enum(["image","video","audio"]),
  filename: z.string().min(1),
  contentType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/mpeg",
    "video/ogg",
    "audio/mp3",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/m4a",
  ]),
  sizeBytes: z.number().int().positive(), // client known size
});

export const CompleteUploadSchema = z.object({
  mediaId: z.string().uuid(),
});

export const AttachSchema = z.object({
  mediaId: z.string().uuid(),
  postId: z.string().uuid(),
});
