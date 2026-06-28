import * as repo from "./events.repo";
import {
  parseTicketQrPayload,
  signTicketToken,
  verifyTicketToken,
} from "../../services/ticketTokenService";

export async function getMyEventTicket(eventId: string, userId: string) {
  const ticket = await repo.getEventTicket(eventId, userId);
  if (!ticket) return null;
  const row = ticket as {
    id: string;
    event_id: string;
    user_id: string;
    code: string;
    redeemed_at?: string | null;
    scanned_by?: string | null;
    issued_at?: string;
  };
  const scanToken = signTicketToken(row.id, row.event_id, row.user_id);
  return {
    id: row.id,
    code: row.code,
    eventId: row.event_id,
    redeemedAt: row.redeemed_at ?? null,
    scannedBy: row.scanned_by ?? null,
    issuedAt: row.issued_at ?? null,
    scanToken,
    status: row.redeemed_at ? "used" : "valid",
  };
}

export async function verifyAndRedeemTicket(
  eventId: string,
  scannerUserId: string,
  input: { token?: string; code?: string },
) {
  const ev = await repo.getEvent(eventId);
  if (!ev) return { ok: false as const, error: "EVENT_NOT_FOUND" };
  const creatorId = (ev as { creator_id?: string }).creator_id;
  if (creatorId !== scannerUserId) {
    return { ok: false as const, error: "FORBIDDEN" };
  }

  let ticketId: string | null = null;
  let lookupEventId = eventId;

  if (input.token) {
    const raw = parseTicketQrPayload(input.token);
    if (!raw) return { ok: false as const, error: "INVALID_TOKEN" };
    const parsed = verifyTicketToken(raw);
    if (!parsed) return { ok: false as const, error: "INVALID_TOKEN" };
    if (parsed.eventId !== eventId) return { ok: false as const, error: "WRONG_EVENT" };
    ticketId = parsed.ticketId;
    lookupEventId = parsed.eventId;
  } else if (input.code) {
    const ticket = await repo.getEventTicketByCode(eventId, input.code.trim().toUpperCase());
    if (!ticket) return { ok: false as const, error: "NOT_FOUND" };
    ticketId = String((ticket as { id: string }).id);
  } else {
    return { ok: false as const, error: "MISSING_PAYLOAD" };
  }

  const ticket = await repo.getEventTicketById(ticketId!, lookupEventId);
  if (!ticket) return { ok: false as const, error: "NOT_FOUND" };

  const row = ticket as {
    id: string;
    code: string;
    user_id: string;
    redeemed_at?: string | null;
    username?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };

  const attendeeName =
    `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || row.username || "Guest";

  if (row.redeemed_at) {
    return {
      ok: true as const,
      result: "already_used" as const,
      ticket: {
        id: row.id,
        code: row.code,
        attendeeName,
        profileImageUrl: row.profile_image_url ?? null,
        redeemedAt: row.redeemed_at,
      },
    };
  }

  const redeemed = await repo.redeemEventTicket(row.id, eventId, scannerUserId);
  if (!redeemed) return { ok: false as const, error: "REDEEM_FAILED" };

  return {
    ok: true as const,
    result: "checked_in" as const,
    ticket: {
      id: row.id,
      code: row.code,
      attendeeName,
      profileImageUrl: row.profile_image_url ?? null,
      redeemedAt: (redeemed as { redeemed_at?: string }).redeemed_at ?? new Date().toISOString(),
    },
  };
}

export async function listEventCheckIns(eventId: string, organizerUserId: string) {
  const ev = await repo.getEvent(eventId);
  if (!ev) return null;
  if ((ev as { creator_id?: string }).creator_id !== organizerUserId) return { forbidden: true as const };
  const rows = await repo.listEventTickets(eventId);
  return {
    items: rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      code: r.code,
      userId: r.user_id,
      attendeeName:
        `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || r.username || "Guest",
      profileImageUrl: r.profile_image_url ?? null,
      redeemedAt: r.redeemed_at ?? null,
      issuedAt: r.issued_at ?? null,
      status: r.redeemed_at ? "checked_in" : "valid",
    })),
  };
}
