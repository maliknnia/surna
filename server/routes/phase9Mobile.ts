import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { authUserId, resolveRequestUserId } from "../lib/authUser";
import {
  registerPushToken,
  removePushToken,
  uploadVideoToCloudinary,
  createVideoPost,
  isCloudinaryConfigured,
} from "../services/phase9MobileService";

export const mobilePhase9Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

function requireUserId(req: any, res: any): string | null {
  const id = resolveRequestUserId(req) ?? authUserId(req);
  if (!id) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
  return id;
}

/** POST /api/push/register — Capacitor FCM/APNs token */
mobilePhase9Router.post("/push/register", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z
      .object({
        token: z.string().min(1),
        platform: z.enum(["ios", "android", "web"]).default("android"),
      })
      .parse(req.body);
    const result = await registerPushToken(userId, body.token, body.platform);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to register push token" });
  }
});

/** POST /api/push/unregister */
mobilePhase9Router.post("/push/unregister", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z.object({ token: z.string().min(1) }).parse(req.body);
    const result = await removePushToken(userId, body.token);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to unregister" });
  }
});

/** POST /api/posts/video — Cloudinary video upload + post creation */
mobilePhase9Router.post("/posts/video", upload.single("video"), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    if (!req.file) return res.status(400).json({ message: "No video file provided" });
    if (!req.file.mimetype.startsWith("video/")) {
      return res.status(400).json({ message: "File must be a video" });
    }

    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";

    if (!isCloudinaryConfigured()) {
      const isProd = process.env.NODE_ENV === "production";
      return res.status(isProd ? 503 : 400).json({
        message: isProd
          ? "Video uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
          : "Cloudinary is not configured for local video uploads.",
      });
    }

    const uploaded = await uploadVideoToCloudinary(req.file.buffer, req.file.originalname);
    const videoUrl = uploaded.videoUrl;
    const thumbnailUrl = uploaded.thumbnailUrl;

    const post = await createVideoPost(userId, {
      content,
      videoUrl,
      thumbnailUrl,
      sport: typeof req.body.sport === "string" ? req.body.sport : undefined,
      location: typeof req.body.location === "string" ? req.body.location : undefined,
      videoFormat:
        req.body.videoFormat === "reel" || req.body.videoFormat === "video"
          ? req.body.videoFormat
          : undefined,
      durationSec:
        typeof req.body.durationSec === "string" && !Number.isNaN(Number(req.body.durationSec))
          ? Number(req.body.durationSec)
          : undefined,
    });

    res.status(201).json({ post, videoUrl, thumbnailUrl });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Video upload failed" });
  }
});
