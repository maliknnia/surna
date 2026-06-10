import { MessengerService } from "../messenger/messenger.service";
import * as repo from "./events.repo";

export async function createEvent(creatorId: string, e: any) {
  if (new Date(e.endsAt) <= new Date(e.startsAt)) throw new Error("END_BEFORE_START");
  await repo.ensureEventsCompatTables();
  const ev = await repo.insertEvent(creatorId, e);

  try {
    const messengerService = new MessengerService(null);
    const eventId = String((ev as { id: string }).id);
    const eventTitle = String((ev as { title?: string }).title ?? e.title ?? "Event");
    const group = await messengerService.createGroup(creatorId, {
      name: eventTitle,
      description: `Event chat · ${eventId}`,
    });
    const updated = await repo.setEventChatGroupId(eventId, group.id);
    return updated ?? { ...ev, chat_group_id: group.id, chatGroupId: group.id };
  } catch (err) {
    console.error("[Events] Failed to create event group chat:", err);
    return ev;
  }
}

export async function editEvent(creatorId: string, id: string, e: any) {
  if (e.startsAt && e.endsAt && new Date(e.endsAt) <= new Date(e.startsAt)) throw new Error("END_BEFORE_START");
  return await repo.updateEvent(creatorId, id, e);
}

export async function rsvp(eventId: string, userId: string, status: "going"|"interested"|"not_going", issueTicket: boolean) {
  // Block RSVPs on cancelled events so the lifecycle is honored end-to-end.
  const ev = await repo.getEvent(eventId);
  if (!ev) throw new Error("EVENT_NOT_FOUND");
  if ((ev as any).status && (ev as any).status !== "active") {
    throw new Error("EVENT_NOT_ACTIVE");
  }
  if (status === "going") {
    const current = await repo.countGoing(eventId);
    if (ev.capacity && current >= ev.capacity) throw new Error("EVENT_FULL");
  }
  const row = await repo.upsertRSVP(eventId, userId, status);
  let ticket: Awaited<ReturnType<typeof repo.issueTicket>> | null = null;
  if (status === "going" && issueTicket) ticket = await repo.issueTicket(eventId, userId);
  return { rsvp: row, ticket };
}
