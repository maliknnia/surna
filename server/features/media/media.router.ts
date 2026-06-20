import { Router, Request } from "express";
import multer from "multer";
import { InitUploadSchema, CompleteUploadSchema, AttachSchema } from "./media.validation";
import { initUpload, completeUpload, attach, uploadImage, uploadVideo } from "./media.service";
import { authMiddleware } from "../../middleware/auth";
import { validateFile } from "../../media/mediaStorage";

const MAX_MB = Number(process.env.UPLOAD_MAX_MB ?? 15);
const VIDEO_MAX_MB = Number(process.env.VIDEO_MAX_MB ?? 100);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VIDEO_MAX_MB * 1024 * 1024 },
});

interface SessionUser {
  id?: string;
  claims?: { sub?: string };
}
interface MediaAuthedRequest extends Request {
  user?: SessionUser;
}

function getMediaUserId(req: MediaAuthedRequest): string | null {
  if (req.jwtUser?.id) return req.jwtUser.id;
  const u = req.user as { id?: string; claims?: { sub?: string }; dbUser?: { id?: string } } | undefined;
  if (u?.dbUser?.id) return u.dbUser.id;
  if (u?.id) return u.id;
  if (u?.claims?.sub) return u.claims.sub;
  const local = (req as { session?: { localUser?: { dbUser?: { id?: string } } } }).session?.localUser;
  if (local?.dbUser?.id) return local.dbUser.id;
  return null;
}

function storageErrorResponse(e: unknown, res: import("express").Response): boolean {
  if (!(e instanceof Error)) return false;
  if (e.message === "MEDIA_STORAGE_NOT_CONFIGURED") {
    res.status(503).json({
      error: "MEDIA_STORAGE_NOT_CONFIGURED",
      message:
        "Media storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (Cloudinary alone is enough).",
    });
    return true;
  }
  if (e.message.startsWith("FILE_TOO_LARGE_")) {
    res.status(413).json({ error: e.message });
    return true;
  }
  return false;
}

export const mediaRouter = Router();

mediaRouter.use(authMiddleware());

mediaRouter.post("/init", async (req: MediaAuthedRequest, res, next) => {
  try {
    const userId = getMediaUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const body = InitUploadSchema.parse(req.body);
    const result = await initUpload(
      userId,
      body.kind,
      body.filename,
      body.contentType,
      body.sizeBytes,
    );
    res.status(201).json(result);
  } catch (e) {
    if (storageErrorResponse(e, res)) return;
    next(e);
  }
});

mediaRouter.post(
  "/upload-image",
  imageUpload.single("file"),
  async (req: MediaAuthedRequest, res, next) => {
    try {
      const userId = getMediaUserId(req);
      if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
      const file = req.file;
      if (!file) return res.status(400).json({ error: "NO_FILE" });
      const validation = validateFile(file);
      if (!validation.valid) return res.status(400).json({ error: validation.error });
      const result = await uploadImage(
        userId,
        file.originalname,
        file.buffer,
        file.mimetype,
      );
      res.status(201).json({ ...result, queued: result.provider === "s3" });
    } catch (e) {
      if (storageErrorResponse(e, res)) return;
      next(e);
    }
  },
);

mediaRouter.post(
  "/upload-video",
  videoUpload.single("file"),
  async (req: MediaAuthedRequest, res, next) => {
    try {
      const userId = getMediaUserId(req);
      if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
      const file = req.file;
      if (!file) return res.status(400).json({ error: "NO_FILE" });
      if (!file.mimetype.startsWith("video/")) {
        return res.status(400).json({ error: "UNSUPPORTED_VIDEO_TYPE" });
      }
      const result = await uploadVideo(
        userId,
        file.originalname,
        file.buffer,
        file.mimetype,
      );
      res.status(201).json({
        mediaId: result.mediaId,
        publicUrl: result.publicUrl,
        thumbnailUrl: "thumbnailUrl" in result ? result.thumbnailUrl : undefined,
        provider: result.provider,
      });
    } catch (e) {
      if (storageErrorResponse(e, res)) return;
      next(e);
    }
  },
);

mediaRouter.post("/complete", async (req: MediaAuthedRequest, res, next) => {
  try {
    const userId = getMediaUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const { mediaId } = CompleteUploadSchema.parse(req.body);
    await completeUpload(mediaId, userId);
    res.status(202).json({ queued: true });
  } catch (e) { next(e); }
});

mediaRouter.post("/attach", async (req: MediaAuthedRequest, res, next) => {
  try {
    const userId = getMediaUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const { mediaId, postId } = AttachSchema.parse(req.body);
    await attach(mediaId, postId, userId);
    res.status(204).end();
  } catch (e) { next(e); }
});
