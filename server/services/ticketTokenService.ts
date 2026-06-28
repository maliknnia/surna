import crypto from "crypto";

function signingSecret(): string {
  return (
    process.env.TICKET_SIGNING_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "dev-ticket-signing-secret"
  );
}

export function hashTicketToken(token: string): string {
  return crypto.createHmac("sha256", signingSecret()).update(token).digest("hex");
}

/** Signed opaque ticket token for QR payloads. */
export function signTicketToken(ticketId: string, eventId: string, userId: string): string {
  const body = `${ticketId}.${eventId}.${userId}`;
  const sig = crypto.createHmac("sha256", signingSecret()).update(body).digest("base64url");
  return `${Buffer.from(body).toString("base64url")}.${sig}`;
}

export function verifyTicketToken(
  token: string,
): { ticketId: string; eventId: string; userId: string } | null {
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
  const [ticketId, eventId, userId] = body.split(".");
  if (!ticketId || !eventId || !userId) return null;
  return { ticketId, eventId, userId };
}

/** Prefix used in QR codes so scanners can distinguish ticket payloads. */
export function ticketQrPayload(scanToken: string): string {
  return `SURNA-TKT:v1:${scanToken}`;
}

export function parseTicketQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  const prefix = "SURNA-TKT:v1:";
  if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  return trimmed.length > 10 ? trimmed : null;
}
