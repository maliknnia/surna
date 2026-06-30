import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { initUpload } from "../features/media/media.service";

export const wallpaperRouter = Router();

type WallpaperRequest = Request & {
  user?: { id?: string; claims?: { sub?: string } };
};

function wallpaperUserId(req: WallpaperRequest): string | null {
  return req.user?.claims?.sub ?? req.user?.id ?? null;
}

const UpdateWallpaperSchema = z.object({
  enabled: z.boolean(),
  url: z.string().url().nullable(),
  pages: z.array(z.string()),
});

const WallpaperUploadInitSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive(),
});

wallpaperRouter.get("/", isAuthenticated, async (req: WallpaperRequest, res: Response, next: NextFunction) => {
  try {
    const userId = wallpaperUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const preferences = await storage.getWallpaperPreferences(userId);
    res.json(preferences);
  } catch (error) {
    next(error);
  }
});

wallpaperRouter.put("/", isAuthenticated, async (req: WallpaperRequest, res: Response, next: NextFunction) => {
  try {
    const userId = wallpaperUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const { enabled, url, pages } = UpdateWallpaperSchema.parse(req.body);
    await storage.updateWallpaperPreferences(userId, enabled, url, pages);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

wallpaperRouter.post("/upload", isAuthenticated, async (req: WallpaperRequest, res: Response, next: NextFunction) => {
  try {
    const userId = wallpaperUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const body = WallpaperUploadInitSchema.parse(req.body);
    const result = await initUpload(
      userId,
      "image",
      body.filename,
      body.contentType,
      body.sizeBytes,
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
