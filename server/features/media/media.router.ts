import { Router, Request } from "express";
import multer from "multer";
import { InitUploadSchema, CompleteUploadSchema, AttachSchema } from "./media.validation";
import { initUpload, completeUpload, attach, uploadImageToS3 } from "./media.service";
import { authMiddleware } from "../../middleware/auth";
import { validateFile } from "../../media/mediaStorage";

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.UPLOAD_MAX_MB ?? 15) * 1024 * 1024 },
});

interface SessionUser {
  id?: string;
  claims?: { sub?: string };
}
interface MediaAuthedRequest extends Request {
  user?: SessionUser;
}

// The mounted media pipeline historically only accepted JWT bearer tokens
// (req.jwtUser). To make the existing flow usable from cookie/session-based
// surfaces like My Hub, we also accept the standard Replit OIDC session
// (req.user.claims.sub) that the rest of the app already uses. Either auth
// path yields a userId; the underlying service treats it identically.
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

export const mediaRouter = Router();

// Apply JWT auth middleware to all media routes (no-op when no Bearer header,
// so cookie/session auth still works alongside it).
mediaRouter.use(authMiddleware());

// 1) Init: presigned PUT (non-images) or multipart hint (images → upload-image)
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
    if (e instanceof Error) {
      if (e.message === "S3_NOT_CONFIGURED") {
        return res.status(503).json({
          error: "S3_NOT_CONFIGURED",
          message: "Image storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, and S3_PUBLIC_BASE_URL.",
        });
      }
      if (e.message.startsWith("FILE_TOO_LARGE_")) {
        return res.status(413).json({ error: e.message });
      }
    }
    next(e);
  }
});

// 1b) Server-side image upload: Sharp compress → S3 (images only)
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
      const result = await uploadImageToS3(
        userId,
        file.originalname,
        file.buffer,
        file.mimetype,
      );
      res.status(201).json({ ...result, queued: true });
    } catch (e) {
      if (e instanceof Error && e.message === "S3_NOT_CONFIGURED") {
        return res.status(503).json({
          error: "S3_NOT_CONFIGURED",
          message: "Image storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, and S3_PUBLIC_BASE_URL.",
        });
      }
      next(e);
    }
  },
);

// 2) Complete: client calls after successful PUT to S3
mediaRouter.post("/complete", async (req: MediaAuthedRequest, res, next) => {
  try {
    const userId = getMediaUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const { mediaId } = CompleteUploadSchema.parse(req.body);
    await completeUpload(mediaId, userId);
    res.status(202).json({ queued: true });
  } catch (e) { next(e); }
});

// 3) Attach to a post
mediaRouter.post("/attach", async (req: MediaAuthedRequest, res, next) => {
  try {
    const userId = getMediaUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const { mediaId, postId } = AttachSchema.parse(req.body);
    await attach(mediaId, postId, userId);
    res.status(204).end();
  } catch (e) { next(e); }
});
