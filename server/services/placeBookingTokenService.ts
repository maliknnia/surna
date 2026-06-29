import crypto from "crypto";

function signingSecret(): string {
  return (
    process.env.TICKET_SIGNING_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "dev-ticket-signing-secret"
  );
}

/** Signed opaque booking token for QR payloads. */
export function signBookingToken(bookingId: string, placeId: string, userId: string): string {
  const body = `${bookingId}.${placeId}.${userId}`;
  const sig = crypto.createHmac("sha256", signingSecret()).update(body).digest("base64url");
  return `${Buffer.from(body).toString("base64url")}.${sig}`;
}

export function verifyBookingToken(
  token: string,
): { bookingId: string; placeId: string; userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [bodyB64, sig] = parts;
  let body: string;
  try {
    body = Buffer.from(bodyB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", signingSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  const [bookingId, placeId, userId] = body.split(".");
  if (!bookingId || !placeId || !userId) return null;
  return { bookingId, placeId, userId };
}
