import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { placeBookings, placeSlotBlocks, places } from "@shared/schema";
import type { PlaceAvailabilitySlot, PlaceSlotCalendarEntry, PlaceSlotCalendarState } from "@shared/placeBooking";
import { ensurePlaceSlotBlocks, ensurePlacesBookingColumns } from "../features/places/places.compat";
import { BadRequest, Forbidden, NotFound } from "../core/errors";

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

function exactSlotMatch(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() === bStart.getTime() && aEnd.getTime() === bEnd.getTime();
}

async function fetchDayBookingsAndBlocks(placeId: string, dayStart: Date, dayEnd: Date) {
  await ensurePlaceSlotBlocks();

  const [bookings, blocks] = await Promise.all([
    db
      .select()
      .from(placeBookings)
      .where(
        and(
          eq(placeBookings.placeId, placeId),
          inArray(placeBookings.status, ["pending", "confirmed"]),
          sql`${placeBookings.startTime} < ${dayEnd}`,
          sql`${placeBookings.endTime} > ${dayStart}`,
        ),
      ),
    db
      .select()
      .from(placeSlotBlocks)
      .where(
        and(
          eq(placeSlotBlocks.placeId, placeId),
          sql`${placeSlotBlocks.startTime} < ${dayEnd}`,
          sql`${placeSlotBlocks.endTime} > ${dayStart}`,
        ),
      ),
  ]);

  return { bookings, blocks };
}

async function assertPlaceOwner(placeId: string, userId: string): Promise<void> {
  const [place] = await db.select({ ownerId: places.ownerId }).from(places).where(eq(places.id, placeId)).limit(1);
  if (!place) throw NotFound("Place not found");
  if (place.ownerId !== userId) throw Forbidden("Owner access only");
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

  const { bookings: existing, blocks } = await fetchDayBookingsAndBlocks(placeId, dayStart, dayEnd);

  const slots: PlaceAvailabilitySlot[] = [];
  const now = new Date();
  for (let startMin = window.startMinutes; startMin + duration <= window.endMinutes; startMin += duration) {
    const start = dateAtLocalMinutes(day, startMin);
    const end = dateAtLocalMinutes(day, startMin + duration);
    const takenByBooking = existing.some((b) =>
      overlaps(start, end, new Date(b.startTime), new Date(b.endTime)),
    );
    const takenByBlock = blocks.some((b) =>
      overlaps(start, end, new Date(b.startTime), new Date(b.endTime)),
    );
    const inPast = end <= now;

    slots.push({
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      label: start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      price: slotPrice,
      available: !takenByBooking && !takenByBlock && !inPast,
    });
  }

  return { slots, bookingMode };
}

/** Owner calendar view — slots enriched with booking/block status for a single day. */
export async function getOwnerSlotCalendar(
  placeId: string,
  dateIso: string,
): Promise<{ entries: PlaceSlotCalendarEntry[]; bookingMode: string; closed: boolean }> {
  await ensurePlacesBookingColumns();

  const [place] = await db.select().from(places).where(eq(places.id, placeId)).limit(1);
  if (!place) throw new Error("Place not found");

  const bookingMode = (place as { bookingMode?: string }).bookingMode ?? "request";
  if (bookingMode !== "slots") {
    return { entries: [], bookingMode, closed: false };
  }

  const day = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(day.getTime())) throw new Error("Invalid date");

  const hours = (place.hours ?? {}) as Record<string, string>;
  const dayKey = DAY_NAMES[day.getDay()];
  const window = parseDayHours(hours[dayKey]);
  if (!window) {
    return { entries: [], bookingMode, closed: true };
  }

  const duration = (place as { slotDurationMinutes?: number }).slotDurationMinutes ?? 60;
  const slotPriceRaw = (place as { slotPrice?: string | null }).slotPrice;
  const slotPrice = slotPriceRaw != null ? parseFloat(String(slotPriceRaw)) : null;

  const dayStart = new Date(`${dateIso}T00:00:00`);
  const dayEnd = new Date(`${dateIso}T23:59:59`);

  const { bookings: existing, blocks } = await fetchDayBookingsAndBlocks(placeId, dayStart, dayEnd);

  const now = new Date();
  const entries: PlaceSlotCalendarEntry[] = [];

  for (let startMin = window.startMinutes; startMin + duration <= window.endMinutes; startMin += duration) {
    const start = dateAtLocalMinutes(day, startMin);
    const end = dateAtLocalMinutes(day, startMin + duration);
    const booking = existing.find((b) =>
      overlaps(start, end, new Date(b.startTime), new Date(b.endTime)),
    );
    const block = !booking
      ? blocks.find((b) => exactSlotMatch(start, end, new Date(b.startTime), new Date(b.endTime)))
      : undefined;
    const inPast = end <= now;

    let state: PlaceSlotCalendarState = "available";
    if (booking) {
      state = inPast
        ? booking.status === "pending"
          ? "pending"
          : "booked"
        : booking.status === "pending"
          ? "pending"
          : "booked";
    } else if (block) {
      state = "blocked";
    } else if (inPast) {
      state = "past";
    }

    entries.push({
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      label: start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      price: slotPrice,
      available: !booking && !block && !inPast,
      state,
      bookingId: booking?.id,
      bookingTitle: booking?.title,
      bookingStatus: booking?.status ?? undefined,
      blockId: block?.id,
      blockReason: block?.reason ?? undefined,
    });
  }

  return { entries, bookingMode, closed: false };
}

export async function blockPlaceSlot(
  placeId: string,
  ownerId: string,
  startTime: Date,
  endTime: Date,
  reason?: string,
) {
  await assertPlaceOwner(placeId, ownerId);

  if (startTime >= endTime) {
    throw BadRequest("End time must be after start time");
  }

  const dateIso = startTime.toISOString().slice(0, 10);
  const { entries } = await getOwnerSlotCalendar(placeId, dateIso);
  const match = entries.find(
    (e) =>
      e.state === "available" &&
      new Date(e.startTime).getTime() === startTime.getTime() &&
      new Date(e.endTime).getTime() === endTime.getTime(),
  );
  if (!match) {
    throw BadRequest("That slot cannot be blocked — it may be booked, already blocked, or in the past");
  }

  const [block] = await db
    .insert(placeSlotBlocks)
    .values({
      placeId,
      createdBy: ownerId,
      startTime,
      endTime,
      reason: reason?.trim() || null,
    })
    .returning();

  return block;
}

export async function unblockPlaceSlot(placeId: string, ownerId: string, blockId: string): Promise<void> {
  await assertPlaceOwner(placeId, ownerId);

  const result = await db
    .delete(placeSlotBlocks)
    .where(and(eq(placeSlotBlocks.id, blockId), eq(placeSlotBlocks.placeId, placeId)));

  if ((result.rowCount ?? 0) === 0) {
    throw NotFound("Block not found");
  }
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
