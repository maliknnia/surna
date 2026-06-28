import { Router } from "express";
import { z } from "zod";
import { CreateEvent, UpdateEvent, ListQuery, RSVPBody, SaveEventRoute } from "./events.validation";
import { createEvent, editEvent, rsvp, getEventRoute, saveEventRoute } from "./events.service";
import * as repo from "./events.repo";
import { fetchEventFeedPosts, fetchEventHighlights } from "./events.social";
import * as ticketService from "./events.tickets";
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

eventsRouter.get("/ticket-checkout/status", async (_req, res) => {
  const { isEventTicketCheckoutAvailable } = await import("../../services/eventTicketCheckoutService");
  res.json({ available: isEventTicketCheckoutAvailable() });
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

const VerifyTicketBody = z.object({
  eventId: z.string().uuid(),
  token: z.string().optional(),
  code: z.string().optional(),
});

eventsRouter.get("/:id/tickets/mine", async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const eventId = z.string().uuid().parse(req.params.id);
    const ticket = await ticketService.getMyEventTicket(eventId, userId);
    if (!ticket) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ ticket });
  } catch (e) {
    next(e);
  }
});

eventsRouter.get("/:id/check-ins", async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const eventId = z.string().uuid().parse(req.params.id);
    const out = await ticketService.listEventCheckIns(eventId, userId);
    if (!out) return res.status(404).json({ error: "NOT_FOUND" });
    if ("forbidden" in out) return res.status(403).json({ error: "FORBIDDEN" });
    res.json(out);
  } catch (e) {
    next(e);
  }
});

eventsRouter.post("/tickets/verify", async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const body = VerifyTicketBody.parse(req.body ?? {});
    if (!body.token && !body.code) {
      return res.status(400).json({ error: "MISSING_PAYLOAD" });
    }
    const out = await ticketService.verifyAndRedeemTicket(body.eventId, userId, {
      token: body.token,
      code: body.code,
    });
    if (!out.ok) {
      const status =
        out.error === "FORBIDDEN" ? 403 : out.error === "NOT_FOUND" ? 404 : 400;
      return res.status(status).json({ error: out.error });
    }
    res.json(out);
  } catch (e) {
    next(e);
  }
});

const TicketCheckoutBody = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const TicketActivateBody = z.object({
  sessionId: z.string().min(1),
  eventId: z.string().uuid().optional(),
  orderId: z.string().optional(),
});

eventsRouter.post("/ticket-checkout/activate", async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const body = TicketActivateBody.parse(req.body ?? {});
    const { activateEventTicketFromCheckout } = await import("../../services/eventTicketCheckoutService");
    const result = await activateEventTicketFromCheckout(
      body.sessionId,
      userId,
      body.eventId,
      body.orderId,
    );
    res.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Activation failed";
    const status = message.includes("not configured") ? 503 : 400;
    res.status(status).json({ error: message, message });
  }
});

eventsRouter.post("/:id/ticket-checkout", requireEmailVerified, async (req: any, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const eventId = z.string().uuid().parse(req.params.id);
    const body = TicketCheckoutBody.parse(req.body ?? {});
    const { createEventTicketCheckout } = await import("../../services/eventTicketCheckoutService");
    const result = await createEventTicketCheckout({
      eventId,
      userId,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
    res.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    const status =
      message.includes("not configured") || message.includes("not sell")
        ? 400
        : message.includes("sold out") || message.includes("already")
          ? 409
          : 500;
    res.status(status).json({ error: message, message });
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
    if (e instanceof Error && e.message === "TICKET_PAYMENT_REQUIRED") {
      return res.status(402).json({ error: "TICKET_PAYMENT_REQUIRED", message: "Pay for a ticket before RSVP" });
    }
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
