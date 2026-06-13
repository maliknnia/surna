import { Router } from "express";
import { FeedQuerySchema } from "./feed.validation";
import { getFeed } from "./feed.service";
import { authMiddleware } from "../../middleware/auth";
import { bridgeSessionUser } from "../../middleware/bridgeSessionUser";
import { resolveRequestUserId } from "../../lib/authUser";

export const feedRouter = Router();

feedRouter.use(authMiddleware());
feedRouter.use(bridgeSessionUser);

// GET /api/feed?scope=following|global&cursorCreatedAt&cursorId&limit
feedRouter.get("/", async (req: any, res, next) => {
  try {
    const q = FeedQuerySchema.parse(req.query);
    const userId = q.scope === "following" ? resolveRequestUserId(req) : undefined;
    if (q.scope === "following" && !userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const data = await getFeed({
      scope: q.scope,
      userId,
      cursorCreatedAt: q.cursorCreatedAt,
      cursorId: q.cursorId,
      limit: q.limit,
    });
    res.json(data);
  } catch (e) { next(e); }
});
