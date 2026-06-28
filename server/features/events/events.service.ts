import { MessengerService } from "../messenger/messenger.service";
import * as repo from "./events.repo";
import { signTicketToken } from "../../services/ticketTokenService";
import {
  buildOccurrenceTimes,
  normalizeRecurrenceRule,
  type EventRecurrenceRule,
} from "@shared/eventRecurrence";
import { getEventTicketPrice } from "@shared/eventTicketPricing";
import type { z } from "zod";
import type { SaveEventRoute } from "./events.validation";

type RoutePoint = z.infer<typeof SaveEventRoute>["routeCoordinates"][number];

function normalizeRoutePoints(coords: RoutePoint[]): [number, number][] {
  return coords.map((p) => (Array.isArray(p) ? [p[0], p[1]] : [p.lat, p.lng]));
}

export async function createEvent(creatorId: string, e: any) {
  if (new Date(e.endsAt) <= new Date(e.startsAt)) throw new Error("END_BEFORE_START");
  await repo.ensureEventsCompatTables();

  const recurrenceRule = normalizeRecurrenceRule(e.recurrenceRule as EventRecurrenceRule | undefined);
  const occurrences = buildOccurrenceTimes(
    new Date(e.startsAt),
    new Date(e.endsAt),
    recurrenceRule,
  );

  const basePayload = { ...e };
  delete basePayload.recurrenceRule;

  const master = await repo.insertEvent(creatorId, {
    ...basePayload,
    startsAt: occurrences[0].startsAt.toISOString(),
    endsAt: occurrences[0].endsAt.toISOString(),
    isSeriesMaster: recurrenceRule.frequency !== "once",
    recurrenceRule: recurrenceRule.frequency !== "once" ? recurrenceRule : null,
  });

  const masterId = String((master as { id: string }).id);
  const createdIds = [masterId];

  if (recurrenceRule.frequency !== "once") {
    await repo.markEventSeriesMaster(masterId, masterId, recurrenceRule);

    for (let i = 1; i < occurrences.length; i++) {
      const child = await repo.insertEvent(creatorId, {
        ...basePayload,
        startsAt: occurrences[i].startsAt.toISOString(),
        endsAt: occurrences[i].endsAt.toISOString(),
        seriesId: masterId,
        isSeriesMaster: false,
      });
      createdIds.push(String((child as { id: string }).id));
    }
  }

  let ev = master;

  let recommendations: Record<string, unknown> | null = null;
  try {
    const { getEventCreationRecommendations, suggestNearbyReferees } = await import(
      "../../services/phase6SportService"
    );
    const baseRecs = await getEventCreationRecommendations({
      sport: e.sport ?? e.category,
      lat: e.lat ?? e.latitude,
      lng: e.lng ?? e.longitude,
    });
    const refereeSuggestions = await suggestNearbyReferees({
      sport: e.sport ?? e.category,
      lat: e.lat ?? e.latitude,
      lng: e.lng ?? e.longitude,
      limit: 3,
    });
    recommendations = { ...baseRecs, refereeSuggestions };
    console.log("[Phase6-3] Event referee suggestions attached:", refereeSuggestions.length);
  } catch (recErr) {
    console.warn("[Phase6-6] Event recommendations skipped:", recErr);
  }

  try {
    const messengerService = new MessengerService(null);
    const eventId = String((ev as { id: string }).id);
    const eventTitle = String((ev as { title?: string }).title ?? e.title ?? "Event");
    const group = await messengerService.createGroup(creatorId, {
      name: eventTitle,
      description: `Event chat · ${eventId}`,
      eventId,
    });
    await repo.setEventChatGroupId(eventId, group.id);
    if (recurrenceRule.frequency !== "once") {
      await repo.setSeriesChatGroup(masterId, group.id);
    }
    return {
      ...ev,
      chat_group_id: group.id,
      chatGroupId: group.id,
      recommendations,
      seriesId: recurrenceRule.frequency !== "once" ? masterId : null,
      occurrenceCount: occurrences.length,
      occurrenceIds: createdIds,
    };
  } catch (err) {
    console.error("[Events] Failed to create event group chat:", err);
    return {
      ...ev,
      recommendations,
      seriesId: recurrenceRule.frequency !== "once" ? masterId : null,
      occurrenceCount: occurrences.length,
      occurrenceIds: createdIds,
    };
  }
}

export async function editEvent(creatorId: string, id: string, e: any) {
  if (e.startsAt && e.endsAt && new Date(e.endsAt) <= new Date(e.startsAt)) throw new Error("END_BEFORE_START");
  const prev = await repo.getEvent(id);
  const ev = await repo.updateEvent(creatorId, id, e);
  if (ev && e.status === "cancelled" && (prev as { status?: string })?.status !== "cancelled") {
    try {
      const { notifyEventCancelled } = await import("../../services/eventNotificationService");
      await notifyEventCancelled(id);
    } catch (err) {
      console.warn("[Events] Cancel notification skipped:", err);
    }
  }
  return ev;
}

export async function rsvpAfterTicketPayment(eventId: string, userId: string, _orderId: string) {
  return rsvp(eventId, userId, "going", true, { skipPaymentGate: true });
}

export async function rsvp(
  eventId: string,
  userId: string,
  status: "going" | "interested" | "not_going" | "waitlist",
  issueTicket: boolean,
  opts?: { skipPaymentGate?: boolean },
) {
  const ev = await repo.getEvent(eventId);
  if (!ev) throw new Error("EVENT_NOT_FOUND");
  if ((ev as { status?: string }).status && (ev as { status?: string }).status !== "active") {
    throw new Error("EVENT_NOT_ACTIVE");
  }

  const ticketPrice = getEventTicketPrice(ev as Record<string, unknown>);
  if (
    !opts?.skipPaymentGate &&
    status === "going" &&
    ticketPrice != null &&
    issueTicket
  ) {
    throw new Error("TICKET_PAYMENT_REQUIRED");
  }

  const capacity = (ev as { capacity?: number }).capacity;
  const currentGoing = await repo.countGoing(eventId);

  if (status === "going") {
    if (capacity && currentGoing >= capacity) {
      throw new Error("EVENT_FULL");
    }
  }

  if (status === "waitlist") {
    if (!capacity) throw new Error("NO_WAITLIST");
    if (currentGoing < capacity) {
      status = "going";
    }
  }

  const previous = await repo.getUserRSVP(eventId, userId);
  const wasGoing = previous?.status === "going";

  const row = await repo.upsertRSVP(eventId, userId, status);

  if (status === "waitlist") {
    await repo.assignWaitlistPosition(eventId, userId);
    console.log("[Phase3-6] User added to waitlist:", userId, eventId);
  }

  let ticket: Awaited<ReturnType<typeof repo.issueTicket>> | null = null;
  if (status === "going") {
    ticket = await repo.issueTicket(eventId, userId);
    if (ticket) {
      const row = ticket as { id: string; event_id: string; user_id: string; code: string };
      ticket = {
        ...row,
        scanToken: signTicketToken(row.id, row.event_id, row.user_id),
      };
    }
  }

  if (wasGoing && status !== "going") {
    const promoted = await repo.promoteNextWaitlisted(eventId);
    if (promoted) {
      console.log("[Phase3-6] Waitlist promoted to going:", promoted, eventId);
      try {
        const { notifyWaitlistPromoted } = await import("../../services/eventNotificationService");
        await notifyWaitlistPromoted(eventId, promoted);
      } catch (err) {
        console.warn("[Events] Waitlist promotion notification skipped:", err);
      }
    }
  }

  if (status === "going" || status === "interested" || status === "waitlist") {
    try {
      const { notifyOrganizerOfRsvp } = await import("../../services/eventNotificationService");
      await notifyOrganizerOfRsvp(eventId, userId, status);
    } catch (err) {
      console.warn("[Events] RSVP notification skipped:", err);
    }
  }

  if (status === "going" || status === "interested") {
    try {
      const messengerService = new MessengerService(null);
      const title = String((ev as { title?: string }).title ?? "Event");
      await messengerService.createGroup(userId, {
        name: title,
        description: `Event chat · ${eventId}`,
        eventId,
      });
    } catch (err) {
      console.warn("[Events] RSVP event chat join skipped:", err);
    }
  }

  return { rsvp: row, ticket, waitlisted: status === "waitlist" };
}

export async function getEventRoute(eventId: string) {
  const row = await repo.getEventRoute(eventId);
  if (!row) return null;
  if (row.visibility === "private") return { forbidden: true as const };
  const coords = Array.isArray(row.route_coordinates) ? row.route_coordinates : [];
  return {
    eventId: row.id,
    sport: row.sport ?? null,
    routeCoordinates: coords,
  };
}

export async function saveEventRoute(
  creatorId: string,
  eventId: string,
  body: z.infer<typeof SaveEventRoute>,
) {
  const routeCoordinates = normalizeRoutePoints(body.routeCoordinates);
  const row = await repo.saveEventRoute(creatorId, eventId, routeCoordinates);
  if (!row) return null;
  return {
    eventId: row.id,
    sport: row.sport ?? null,
    routeCoordinates: row.route_coordinates ?? routeCoordinates,
  };
}
