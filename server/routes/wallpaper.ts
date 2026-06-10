// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { initUpload, completeUpload } from "../features/media/media.service";

export const wallpaperRouter = Router();

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

wallpaperRouter.get("/", isAuthenticated, async (req: any, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const userId = req.user.claims?.sub || req.user.id;
    const preferences = await storage.getWallpaperPreferences(userId);
    res.json(preferences);
  } catch (error) {
    next(error);
  }
});

wallpaperRouter.put("/", isAuthenticated, async (req: any, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const userId = req.user.claims?.sub || req.user.id;
    const { enabled, url, pages } = UpdateWallpaperSchema.parse(req.body);
    await storage.updateWallpaperPreferences(userId, enabled, url, pages);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

wallpaperRouter.post("/upload", isAuthenticated, async (req: any, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const userId = req.user.claims?.sub || req.user.id;
    const body = WallpaperUploadInitSchema.parse(req.body);
    const result = await initUpload(
      userId,
      "image",
      body.filename,
      body.contentType,
      body.sizeBytes
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
