/** Prefix used in venue booking QR codes so scanners can distinguish payloads. */
export const BOOKING_QR_PREFIX = "SURNA-BKG:v1:";

export function bookingQrPayload(scanToken: string): string {
  return `${BOOKING_QR_PREFIX}${scanToken}`;
}

/** Returns the signed token portion, or null if legacy JSON payload. */
export function parseBookingQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith(BOOKING_QR_PREFIX)) {
    return trimmed.slice(BOOKING_QR_PREFIX.length);
  }
  if (trimmed.startsWith("{")) return null;
  return trimmed.length > 10 ? trimmed : null;
}

export type LegacyBookingQr = {
  bookingId: string;
  placeId: string;
  title?: string;
  startTime?: string;
};

export function parseLegacyBookingQr(raw: string): LegacyBookingQr | null {
  try {
    const parsed = JSON.parse(raw.trim()) as LegacyBookingQr;
    if (parsed?.bookingId && parsed?.placeId) return parsed;
  } catch {
    /* not JSON */
  }
  return null;
}
