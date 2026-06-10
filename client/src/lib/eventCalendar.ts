/** Client calendar helpers — ICS download + Google / Outlook / Apple links */

export type CalendarEventInput = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string | Date;
  endsAt?: string | Date | null;
  location?: string | null;
  sport?: string | null;
};

function toDate(v: string | Date): Date {
  return v instanceof Date ? v : new Date(v);
}

function defaultEnd(start: Date): Date {
  return new Date(start.getTime() + 2 * 60 * 60 * 1000);
}

function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatGoogleUtc(date: Date): string {
  return formatIcsUtc(date);
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n").replace(/\r/g, "");
}

export function normalizeCalendarEvent(ev: CalendarEventInput) {
  const start = toDate(ev.startsAt);
  const end = ev.endsAt ? toDate(ev.endsAt) : defaultEnd(start);
  return {
    id: ev.id,
    title: ev.title || "SURNA Event",
    description: ev.description || "",
    location: ev.location || "",
    sport: ev.sport || "",
    start,
    end: end > start ? end : defaultEnd(start),
  };
}

export function buildIcsForEvent(ev: CalendarEventInput): string {
  const e = normalizeCalendarEvent(ev);
  const now = formatIcsUtc(new Date());
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SURNA//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@surna.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsUtc(e.start)}`,
    `DTEND:${formatIcsUtc(e.end)}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    `DESCRIPTION:${escapeIcs(e.description)}`,
    `LOCATION:${escapeIcs(e.location)}`,
    e.sport ? `CATEGORIES:${escapeIcs(e.sport)}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadIcsFile(ev: CalendarEventInput, filename?: string) {
  const ics = buildIcsForEvent(ev);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename || `${(ev.title || "event").replace(/[^\w-]+/g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(href);
}

export function getGoogleCalendarUrl(ev: CalendarEventInput): string {
  const e = normalizeCalendarEvent(ev);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${formatGoogleUtc(e.start)}/${formatGoogleUtc(e.end)}`,
    details: e.description,
    location: e.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function getOutlookCalendarUrl(ev: CalendarEventInput): string {
  const e = normalizeCalendarEvent(ev);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: e.start.toISOString(),
    enddt: e.end.toISOString(),
    body: e.description,
    location: e.location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** Opens .ics — works with Apple Calendar on iOS/macOS */
export function openAppleCalendar(ev: CalendarEventInput) {
  downloadIcsFile(ev);
}

export async function fetchServerCalendarUrls(eventId: string): Promise<{ google?: string; outlook?: string } | null> {
  if (eventId.startsWith("demo-ev-")) return null;
  try {
    const res = await fetch(`/api/calendar/events/${eventId}/external-urls`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { google: data.google, outlook: data.outlook };
  } catch {
    return null;
  }
}

export async function exportMyCalendarIcs(timeframe = "3m"): Promise<void> {
  const res = await fetch(`/api/calendar/export/ical?timeframe=${timeframe}`, { credentials: "include" });
  if (!res.ok) throw new Error("Export failed");
  const text = await res.text();
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "surna-schedule.ics";
  a.click();
  URL.revokeObjectURL(href);
}

export function calendarInputFromApiEvent(ev: Record<string, unknown>): CalendarEventInput {
  return {
    id: String(ev.id),
    title: String(ev.title || "Event"),
    description: (ev.description as string) || "",
    startsAt: (ev.starts_at || ev.startDate) as string,
    endsAt: (ev.ends_at || ev.endDate) as string | undefined,
    location: (ev.location as string) || "",
    sport: (ev.sport as string) || "",
  };
}
