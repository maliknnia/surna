import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import { users } from "@shared/schema";
import { notifyUser } from "../features/notifications/notifications.service";
import * as repo from "../features/events/events.repo";

async function displayName(userId: string): Promise<string> {
  const [u] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      displayName: users.displayName,
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return "Someone";
  const dn = (u as { displayName?: string | null }).displayName;
  if (dn?.trim()) return dn.trim();
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return full || u.username || "Someone";
}

function eventMeta(eventId: string, title: string, extra?: Record<string, unknown>) {
  return {
    eventId,
    relatedEntityType: "event",
    relatedEntityId: eventId,
    route: `/events/${eventId}`,
    ...extra,
  };
}

export async function notifyOrganizerOfRsvp(
  eventId: string,
  attendeeId: string,
  status: string,
): Promise<void> {
  const ev = await repo.getEvent(eventId);
  if (!ev) return;
  const organizerId = String((ev as { creator_id?: string }).creator_id ?? "");
  if (!organizerId || organizerId === attendeeId) return;

  const name = await displayName(attendeeId);
  const title = String((ev as { title?: string }).title ?? "your event");
  const verb =
    status === "going"
      ? "is going to"
      : status === "interested"
        ? "is interested in"
        : status === "waitlist"
          ? "joined the waitlist for"
          : "updated RSVP for";

  await notifyUser({
    userId: organizerId,
    type: "event_rsvp",
    message: `${name} ${verb} ${title}`,
    metadata: eventMeta(eventId, title, { attendeeId, status }),
  });
}

export async function notifyWaitlistPromoted(eventId: string, userId: string): Promise<void> {
  const ev = await repo.getEvent(eventId);
  const title = String((ev as { title?: string })?.title ?? "the event");
  await notifyUser({
    userId,
    type: "event_rsvp",
    message: `A spot opened up — you're now going to ${title}!`,
    metadata: eventMeta(eventId, title, { promotedFromWaitlist: true }),
  });
}

export async function notifyEventCancelled(eventId: string): Promise<void> {
  const ev = await repo.getEvent(eventId);
  if (!ev) return;
  const title = String((ev as { title?: string }).title ?? "Event");
  const attendees = await repo.getEventRSVPs(eventId);
  const goingIds = attendees
    .filter((a: Record<string, unknown>) => a.status === "going" || a.status === "interested")
    .map((a: Record<string, unknown>) => String(a.user_id))
    .filter(Boolean);

  await Promise.all(
    goingIds.map((userId) =>
      notifyUser({
        userId,
        type: "event_cancelled",
        message: `${title} has been cancelled`,
        metadata: eventMeta(eventId, title),
      }),
    ),
  );
}
