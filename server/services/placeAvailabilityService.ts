import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { placeBookings, places } from "@shared/schema";
import type { PlaceAvailabilitySlot } from "@shared/placeBooking";
import { ensurePlacesBookingColumns } from "../features/places/places.compat";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

type DayWindow = { startMinutes: number; endMinutes: number };

function parseTimeToMinutes(token: string): number | null {
  const t = token.trim().toUpperCase();
  const m12 = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2] ?? "0", 10);
    const ap = m12[3];
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h * 60 + min;
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
  }
  return null;
}

/** Parse "9:00 AM - 9:00 PM" style venue hours. */
export function parseDayHours(hoursStr: string | undefined | null): DayWindow | null {
  if (!hoursStr || /closed/i.test(hoursStr)) return null;
  const parts = hoursStr.split(/\s*[-–—]\s*/);
  if (parts.length < 2) return null;
  const startMinutes = parseTimeToMinutes(parts[0]);
  const endMinutes = parseTimeToMinutes(parts[1]);
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return null;
  return { startMinutes, endMinutes };
}

function dateAtLocalMinutes(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export async function getPlaceAvailability(
  placeId: string,
  dateIso: string,
): Promise<{ slots: PlaceAvailabilitySlot[]; bookingMode: string }> {
  await ensurePlacesBookingColumns();

  const [place] = await db.select().from(places).where(eq(places.id, placeId)).limit(1);
  if (!place) throw new Error("Place not found");

  const bookingMode = (place as { bookingMode?: string }).bookingMode ?? "request";
  if (bookingMode !== "slots") {
    return { slots: [], bookingMode };
  }

  const day = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(day.getTime())) throw new Error("Invalid date");

  const hours = (place.hours ?? {}) as Record<string, string>;
  const dayKey = DAY_NAMES[day.getDay()];
  const window = parseDayHours(hours[dayKey]) ?? { startMinutes: 8 * 60, endMinutes: 22 * 60 };

  const duration = (place as { slotDurationMinutes?: number }).slotDurationMinutes ?? 60;
  const slotPriceRaw = (place as { slotPrice?: string | null }).slotPrice;
  const slotPrice = slotPriceRaw != null ? parseFloat(String(slotPriceRaw)) : null;

  const dayStart = new Date(`${dateIso}T00:00:00`);
  const dayEnd = new Date(`${dateIso}T23:59:59`);

  const existing = await db
    .select()
    .from(placeBookings)
    .where(
      and(
        eq(placeBookings.placeId, placeId),
        inArray(placeBookings.status, ["pending", "confirmed"]),
        sql`${placeBookings.startTime} < ${dayEnd}`,
        sql`${placeBookings.endTime} > ${dayStart}`,
      ),
    );

  const slots: PlaceAvailabilitySlot[] = [];
  for (let startMin = window.startMinutes; startMin + duration <= window.endMinutes; startMin += duration) {
    const start = dateAtLocalMinutes(day, startMin);
    const end = dateAtLocalMinutes(day, startMin + duration);
    const taken = existing.some((b) =>
      overlaps(start, end, new Date(b.startTime), new Date(b.endTime)),
    );
    const now = new Date();
    const inPast = end <= now;

    slots.push({
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      label: start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      price: slotPrice,
      available: !taken && !inPast,
    });
  }

  return { slots, bookingMode };
}

export async function assertSlotAvailable(
  placeId: string,
  startTime: Date,
  endTime: Date,
): Promise<void> {
  await ensurePlacesBookingColumns();

  const [place] = await db.select().from(places).where(eq(places.id, placeId)).limit(1);
  if (!place) throw new Error("Place not found");

  const bookingMode = (place as { bookingMode?: string }).bookingMode ?? "request";
  if (bookingMode === "none") {
    throw new Error("This venue does not accept online bookings");
  }

  if (startTime >= endTime) {
    throw new Error("End time must be after start time");
  }

  if (bookingMode === "slots") {
    const dateIso = startTime.toISOString().slice(0, 10);
    const { slots } = await getPlaceAvailability(placeId, dateIso);
    const match = slots.find(
      (s) =>
        s.available &&
        new Date(s.startTime).getTime() === startTime.getTime() &&
        new Date(s.endTime).getTime() === endTime.getTime(),
    );
    if (!match) {
      throw new Error("That time slot is no longer available");
    }
  }
}
