import { Router } from "express";
import { ListQuery, MarkOneParams } from "./notifications.validation";
import { getNotificationFeed, markNotificationRead, markNotificationsAllRead, getUnreadCount } from "./notifications.service";
import { authMiddleware } from "../../middleware/auth";
import { bridgeSessionUser } from "../../middleware/bridgeSessionUser";

export const notificationsRouter = Router();

// Apply JWT auth middleware to all notifications routes (JWT bearer and/or cookie session)
notificationsRouter.use(authMiddleware());
notificationsRouter.use(bridgeSessionUser);

// GET /api/notifications?cursorCreatedAt&cursorId&limit
notificationsRouter.get("/", async (req: any, res, next) => {
  try {
    if (!req.jwtUser?.id) return res.status(401).json({ error: "UNAUTHORIZED" });
    const q = ListQuery.parse(req.query);
    const data = await getNotificationFeed(req.jwtUser.id, q);
    res.json(data);
  } catch (e) { next(e); }
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch("/:id/read", async (req: any, res, next) => {
  try {
    if (!req.jwtUser?.id) return res.status(401).json({ error: "UNAUTHORIZED" });
    const { id } = MarkOneParams.parse(req.params);
    const updated = await markNotificationRead(req.jwtUser.id, id);
    if (!updated) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(updated);
  } catch (e) { next(e); }
});

// PATCH /api/notifications/read-all
notificationsRouter.patch("/read-all", async (req: any, res, next) => {
  try {
    if (!req.jwtUser?.id) return res.status(401).json({ error: "UNAUTHORIZED" });
    await markNotificationsAllRead(req.jwtUser.id);
    res.status(204).end();
  } catch (e) { next(e); }
});

// GET /api/notifications/unread-count
notificationsRouter.get("/unread-count", async (req: any, res, next) => {
  try {
    if (!req.jwtUser?.id) return res.status(401).json({ error: "UNAUTHORIZED" });
    const count = await getUnreadCount(req.jwtUser.id);
    res.json({ count });
  } catch (e) { next(e); }
});
