import { Router } from "express";
import { z } from "zod";
import { CreateEvent, UpdateEvent, ListQuery, RSVPBody, SaveEventRoute } from "./events.validation";
import { createEvent, editEvent, rsvp, getEventRoute, saveEventRoute } from "./events.service";
import * as repo from "./events.repo";
import { fetchEventFeedPosts, fetchEventHighlights } from "./events.social";
import { authMiddleware } from "../../middleware/auth";
import { bridgeSessionUser } from "../../middleware/bridgeSessionUser";
import { requireEmailVerified } from "../../middleware/requireEmailVerified";
import { csrfProtection } from "../../middleware/csrfMiddleware";
import { validateBody } from "../../middleware/validate";
import { authUserId } from "../../lib/authUser";

export const eventsRouter = Router();

function sessionUserId(req: { jwtUser?: { id?: string }; user?: { id?: string; claims?: { sub?: string } } }) {
  return req.jwtUser?.id ?? authUserId(req) ?? req.user?.claims?.sub ?? req.user?.id ?? null;
}

// PUBLIC: list events
eventsRouter.get("/", async (req, res, next) => {
  try {
    const q = ListQuery.parse(req.query);
    const rows = await repo.listPublic(q);
    res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    const nextCursor = rows.length
      ? { cursorStartsAt: rows[rows.length - 1].starts_at, cursorId: rows[rows.length - 1].id }
      : null;
    res.json({ items: rows, nextCursor });
  } catch (e) {
    next(e);
  }
});

eventsRouter.get("/:id/route", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const route = await getEventRoute(id);
    if (!route) return res.status(404).json({ error: "NOT_FOUND" });
    if ("forbidden" in route) return res.status(403).json({ error: "FORBIDDEN" });
    res.json(route);
  } catch (e) {
    next(e);
  }
});

eventsRouter.get("/:id/highlights", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const highlights = await fetchEventHighlights(id);
    res.json({ highlights });
  } catch (e) {
    next(e);
  }
});

eventsRouter.get("/:id/photos", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const photos = await repo.getEventPhotos(id);
    res.json(photos);
  } catch (e) {
    next(e);
  }
});

eventsRouter.get("/:id/feed", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const posts = await fetchEventFeedPosts(id);
    res.json({ posts });
  } catch (e) {
    next(e);
  }
});

eventsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const ev = await repo.getEvent(id);
    if (!ev) return res.status(404).json({ error: "NOT_FOUND" });
    if (ev.visibility === "private") return res.status(403).json({ error: "FORBIDDEN" });
    const attendees = await repo.getEventRSVPs(id);
    const publicAttendees = attendees.map((a: Record<string, unknown>) => ({
      status: a.status,
      user_id: a.user_id,
      username: a.username,
      first_name: a.first_name,
      last_name: a.last_name,
      profile_image_url: a.profile_image_url,
    }));
    res.json({
      ...ev,
      attendees: publicAttendees,
      going_count: attendees.filter((a: Record<string, unknown>) => a.status === "going").length,
    });
  } catch (e) {
    next(e);
  }
});

eventsRouter.use(authMiddleware());
eventsRouter.use(bridgeSessionUser);

eventsRouter.get("/me/rsvps", async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const rows = await repo.listMyRSVPs(userId);
    res.json({ items: rows });
  } catch (e) {
    next(e);
  }
});

eventsRouter.get("/me/organized", async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const data = await repo.listOrganizedByUser(userId);
    res.json({ ...data, generatedAt: new Date().toISOString() });
  } catch (e) {
    next(e);
  }
});

eventsRouter.get("/me/mine", async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const data = await repo.listMineForStrip(userId);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

eventsRouter.delete("/photos/:photoId", csrfProtection, async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const ok = await repo.deleteEventPhoto(req.params.photoId, userId);
    if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

eventsRouter.post("/", async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const body = CreateEvent.parse(req.body);
    const ev = await createEvent(userId, body);
    res.status(201).json(ev);
  } catch (e) {
    next(e);
  }
});

eventsRouter.patch("/:id", async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const id = z.string().uuid().parse(req.params.id);
    const body = UpdateEvent.parse(req.body);
    const ev = await editEvent(userId, id, body);
    if (!ev) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(ev);
  } catch (e) {
    next(e);
  }
});

eventsRouter.delete("/:id", async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const id = z.string().uuid().parse(req.params.id);
    const ok = await repo.deleteEvent(userId, id);
    if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

eventsRouter.post("/:id/route", async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const id = z.string().uuid().parse(req.params.id);
    const body = SaveEventRoute.parse(req.body);
    const route = await saveEventRoute(userId, id, body);
    if (!route) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(route);
  } catch (e) {
    next(e);
  }
});

eventsRouter.post("/:id/rsvp", requireEmailVerified, async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const id = z.string().uuid().parse(req.params.id);
    const { status, issueTicket } = RSVPBody.parse(req.body);
    const out = await rsvp(id, userId, status, issueTicket);
    res.status(201).json(out);
  } catch (e) {
    next(e);
  }
});

eventsRouter.post(
  "/:id/photos",
  csrfProtection,
  validateBody(
    z.object({
      imageUrl: z.string().url(),
      caption: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  ),
  async (req: any, res, next) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
      const eventId = z.string().uuid().parse(req.params.id);
      const allowed = await repo.isEventAttendee(eventId, userId);
      if (!allowed) return res.status(403).json({ error: "FORBIDDEN" });
      const photo = await repo.addEventPhoto({
        eventId,
        uploaderId: userId,
        ...req.body,
      });
      res.status(201).json(photo);
    } catch (e) {
      next(e);
    }
  },
);
