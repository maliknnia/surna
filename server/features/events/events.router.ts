import { Router } from "express";
import { z } from "zod";
import { CreateEvent, UpdateEvent, ListQuery, RSVPBody, SaveEventRoute } from "./events.validation";
import { createEvent, editEvent, rsvp, getEventRoute, saveEventRoute } from "./events.service";
import * as repo from "./events.repo";
import { authMiddleware } from "../../middleware/auth";
import { bridgeSessionUser } from "../../middleware/bridgeSessionUser";
import { requireEmailVerified } from "../../middleware/requireEmailVerified";

export const eventsRouter = Router();

// PUBLIC: list events (future window)
eventsRouter.get("/", async (req, res, next) => {
  try {
    const q = ListQuery.parse(req.query);
    const rows = await repo.listPublic(q);
    // Anonymous public list â€” let CDN/edge cache for 60s and serve stale for
    // up to 5 minutes while we revalidate on origin.
    res.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
    const nextCursor = rows.length ? { cursorStartsAt: rows[rows.length-1].starts_at, cursorId: rows[rows.length-1].id } : null;
    res.json({ items: rows, nextCursor });
  } catch (e) { next(e); }
});

// PUBLIC: GPS route for an event (public/unlisted if you know id)
eventsRouter.get("/:id/route", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const route = await getEventRoute(id);
    if (!route) return res.status(404).json({ error: "NOT_FOUND" });
    if ("forbidden" in route) return res.status(403).json({ error: "FORBIDDEN" });
    res.json(route);
  } catch (e) { next(e); }
});

// PUBLIC: get one event (public/unlisted if you know id)
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
      profile_image_url: a.profile_image_url,
    }));
    res.json({ ...ev, attendees: publicAttendees, going_count: attendees.filter((a: Record<string, unknown>) => a.status === "going").length });
  } catch (e) { next(e); }
});

// Apply JWT auth middleware to protected routes
eventsRouter.use(authMiddleware());
eventsRouter.use(bridgeSessionUser);

// AUTH: create
eventsRouter.post("/", async (req: any, res, next) => {
  try {
    // Check JWT authentication 
    const userId = req.jwtUser?.id;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const body = CreateEvent.parse(req.body);
    const ev = await createEvent(userId, body);
    res.status(201).json(ev);
  } catch (e) { next(e); }
});

// AUTH: update (creator only)
eventsRouter.patch("/:id", async (req: any, res, next) => {
  try {
    const userId = req.jwtUser?.id;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const id = z.string().uuid().parse(req.params.id);
    const body = UpdateEvent.parse(req.body);
    const ev = await editEvent(userId, id, body);
    if (!ev) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(ev);
  } catch (e) { next(e); }
});

// AUTH: delete (creator only)
eventsRouter.delete("/:id", async (req: any, res, next) => {
  try {
    const userId = req.jwtUser?.id;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const id = z.string().uuid().parse(req.params.id);
    const ok = await repo.deleteEvent(userId, id);
    if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
    res.status(204).end();
  } catch (e) { next(e); }
});

// AUTH: save GPS route (creator only)
eventsRouter.post("/:id/route", async (req: any, res, next) => {
  try {
    const userId = req.jwtUser?.id;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const id = z.string().uuid().parse(req.params.id);
    const body = SaveEventRoute.parse(req.body);
    const route = await saveEventRoute(userId, id, body);
    if (!route) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(route);
  } catch (e) { next(e); }
});

// AUTH: RSVP
eventsRouter.post("/:id/rsvp", requireEmailVerified, async (req: any, res, next) => {
  try {
    const userId = req.jwtUser?.id;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const id = z.string().uuid().parse(req.params.id);
    const { status, issueTicket } = RSVPBody.parse(req.body);
    const out = await rsvp(id, userId, status, issueTicket);
    res.status(201).json(out);
  } catch (e) { next(e); }
});

// AUTH: my RSVPs
eventsRouter.get("/me/rsvps", async (req: any, res, next) => {
  try {
    const userId = req.jwtUser?.id;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const rows = await repo.listMyRSVPs(userId);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// AUTH: events the current user organizes (creator) â€” backs My Hub.
// Lives in the events module so list/edit/cancel all flow through the
// canonical /api/events backend.
eventsRouter.get("/me/organized", async (req: any, res, next) => {
  try {
    const userId = req.jwtUser?.id;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const data = await repo.listOrganizedByUser(userId);
    res.json({ ...data, generatedAt: new Date().toISOString() });
  } catch (e) { next(e); }
});
