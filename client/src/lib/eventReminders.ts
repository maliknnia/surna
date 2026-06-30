const STORAGE_KEY = "surna-event-reminders";

export type EventReminder = {
  eventId: string;
  title: string;
  startsAt: string;
  location?: string;
  createdAt: string;
};

function readAll(): EventReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EventReminder[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: EventReminder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getEventReminders(): EventReminder[] {
  return readAll().sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export function hasEventReminder(eventId: string): boolean {
  return readAll().some((r) => r.eventId === eventId);
}

export function toggleEventReminder(input: {
  eventId: string;
  title: string;
  startsAt: string;
  location?: string;
}): boolean {
  const items = readAll();
  const idx = items.findIndex((r) => r.eventId === input.eventId);
  if (idx >= 0) {
    items.splice(idx, 1);
    writeAll(items);
    return false;
  }
  items.push({
    eventId: input.eventId,
    title: input.title,
    startsAt: input.startsAt,
    location: input.location,
    createdAt: new Date().toISOString(),
  });
  writeAll(items);
  return true;
}
