import { sql } from "drizzle-orm";
import { db } from "../db";
import { dbRead } from "../dbRead";
import { ensurePlaceBookingCheckInColumns } from "../features/places/places.compat";
import { parseLegacyBookingQr } from "@shared/placeBookingQr";
import { signBookingToken, verifyBookingToken } from "./placeBookingTokenService";

type BookingRow = {
  id: string;
  place_id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  username?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
};

function guestName(row: BookingRow): string {
  return `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || row.username || "Guest";
}

async function getBookingWithGuest(bookingId: string): Promise<BookingRow | null> {
  await ensurePlaceBookingCheckInColumns();
  const q = await dbRead.execute(sql`
    SELECT b.*,
           u.username, u.first_name, u.last_name, u.profile_image_url
      FROM place_bookings b
      LEFT JOIN users u ON u.id = b.user_id
     WHERE b.id = ${bookingId}
     LIMIT 1;
  `);
  return (q.rows[0] as BookingRow | undefined) ?? null;
}

async function assertPlaceOwner(placeId: string, ownerId: string): Promise<boolean> {
  const q = await dbRead.execute(sql`
    SELECT owner_id FROM places WHERE id = ${placeId} LIMIT 1;
  `);
  const row = q.rows[0] as { owner_id?: string } | undefined;
  return row?.owner_id === ownerId;
}

export function bookingScanTokenForRow(row: {
  id: string;
  placeId: string;
  userId: string;
  status?: string | null;
}): string | undefined {
  if (row.status !== "confirmed") return undefined;
  return signBookingToken(row.id, row.placeId, row.userId);
}

export async function verifyAndCheckInBooking(
  placeId: string,
  scannerUserId: string,
  input: { token?: string; bookingId?: string; raw?: string },
) {
  if (!(await assertPlaceOwner(placeId, scannerUserId))) {
    return { ok: false as const, error: "FORBIDDEN" };
  }

  let bookingId: string | null = input.bookingId ?? null;

  if (input.token) {
    const parsed = verifyBookingToken(input.token);
    if (!parsed) return { ok: false as const, error: "INVALID_TOKEN" };
    if (parsed.placeId !== placeId) return { ok: false as const, error: "WRONG_VENUE" };
    bookingId = parsed.bookingId;
  } else if (input.raw) {
    const legacy = parseLegacyBookingQr(input.raw);
    if (legacy) {
      if (legacy.placeId !== placeId) return { ok: false as const, error: "WRONG_VENUE" };
      bookingId = legacy.bookingId;
    } else {
      const token = input.raw.trim();
      const parsed = verifyBookingToken(token);
      if (!parsed) return { ok: false as const, error: "INVALID_TOKEN" };
      if (parsed.placeId !== placeId) return { ok: false as const, error: "WRONG_VENUE" };
      bookingId = parsed.bookingId;
    }
  }

  if (!bookingId) return { ok: false as const, error: "MISSING_PAYLOAD" };

  const row = await getBookingWithGuest(bookingId);
  if (!row) return { ok: false as const, error: "NOT_FOUND" };
  if (row.place_id !== placeId) return { ok: false as const, error: "WRONG_VENUE" };
  if (row.status !== "confirmed") return { ok: false as const, error: "NOT_CONFIRMED" };

  const attendeeName = guestName(row);

  if (row.checked_in_at) {
    return {
      ok: true as const,
      result: "already_used" as const,
      booking: {
        id: row.id,
        title: row.title,
        attendeeName,
        profileImageUrl: row.profile_image_url ?? null,
        startTime: row.start_time,
        checkedInAt: row.checked_in_at,
      },
    };
  }

  const redeemed = await db.execute(sql`
    UPDATE place_bookings
       SET checked_in_at = COALESCE(checked_in_at, NOW()),
           checked_in_by = COALESCE(checked_in_by, ${scannerUserId}),
           updated_at = NOW()
     WHERE id = ${bookingId}
       AND place_id = ${placeId}
       AND status = 'confirmed'
       AND checked_in_at IS NULL
     RETURNING checked_in_at;
  `);

  const checkedInAt =
    (redeemed.rows[0] as { checked_in_at?: string } | undefined)?.checked_in_at ??
    new Date().toISOString();

  if (!redeemed.rows[0]) {
    const again = await getBookingWithGuest(bookingId);
    if (again?.checked_in_at) {
      return {
        ok: true as const,
        result: "already_used" as const,
        booking: {
          id: row.id,
          title: row.title,
          attendeeName,
          profileImageUrl: row.profile_image_url ?? null,
          startTime: row.start_time,
          checkedInAt: again.checked_in_at,
        },
      };
    }
    return { ok: false as const, error: "CHECKIN_FAILED" };
  }

  return {
    ok: true as const,
    result: "checked_in" as const,
    booking: {
      id: row.id,
      title: row.title,
      attendeeName,
      profileImageUrl: row.profile_image_url ?? null,
      startTime: row.start_time,
      checkedInAt,
    },
  };
}

export async function listPlaceBookingCheckIns(placeId: string, ownerUserId: string) {
  if (!(await assertPlaceOwner(placeId, ownerUserId))) {
    return { forbidden: true as const };
  }

  await ensurePlaceBookingCheckInColumns();

  const q = await dbRead.execute(sql`
    SELECT b.id,
           b.title,
           b.start_time,
           b.end_time,
           b.status,
           b.checked_in_at,
           b.user_id,
           u.username, u.first_name, u.last_name, u.profile_image_url
      FROM place_bookings b
      LEFT JOIN users u ON u.id = b.user_id
     WHERE b.place_id = ${placeId}
       AND b.status = 'confirmed'
       AND b.start_time >= NOW() - INTERVAL '6 hours'
       AND b.start_time <= NOW() + INTERVAL '14 days'
     ORDER BY b.start_time ASC
     LIMIT 200;
  `);

  return {
    items: (q.rows as BookingRow[]).map((r) => ({
      id: r.id,
      title: r.title,
      attendeeName: guestName(r),
      profileImageUrl: r.profile_image_url ?? null,
      startTime: r.start_time,
      endTime: r.end_time,
      checkedInAt: r.checked_in_at ?? null,
      status: r.checked_in_at ? ("checked_in" as const) : ("waiting" as const),
    })),
  };
}
