import { db } from "../../db";
import { sql } from "drizzle-orm";
import { storage } from "../../storage";
import { EmailCampaignService } from "../../services/emailCampaignService";
import { isPhoneOnlyEmail } from "../../lib/emailVerification";

const CODE_TTL_MS = 15 * 60 * 1000;

export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function setEmailVerificationCode(
  userId: string,
  code: string,
  expiresAt: Date,
): Promise<void> {
  await db.execute(sql`
    UPDATE users
    SET
      email_verification_code = ${code},
      email_verification_expires_at = ${expiresAt},
      email_verified = false,
      updated_at = NOW()
    WHERE id = ${userId}
  `);
}

export async function markEmailVerified(userId: string): Promise<void> {
  await db.execute(sql`
    UPDATE users
    SET
      email_verified = true,
      email_verification_code = NULL,
      email_verification_expires_at = NULL,
      updated_at = NOW()
    WHERE id = ${userId}
  `);
}

export async function issueEmailVerificationCode(userId: string): Promise<{ sent: boolean; devCode?: string }> {
  const user = await storage.getUser(userId);
  if (!user?.email || isPhoneOnlyEmail(user.email)) {
    return { sent: false };
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await setEmailVerificationCode(userId, code, expiresAt);

  const firstName = user.firstName || user.displayName || "Athlete";
  const sent = await EmailCampaignService.sendVerificationEmail(user.email, firstName, code);

  const payload: { sent: boolean; devCode?: string; autoVerified?: boolean } = { sent };
  if (process.env.NODE_ENV !== "production" && !process.env.SENDGRID_API_KEY) {
    payload.devCode = code;
  }
  // Railway / early deploy: no SMTP — don't trap users behind un-sendable verification emails.
  if (!sent && !process.env.SENDGRID_API_KEY?.trim()) {
    await markEmailVerified(userId);
    payload.autoVerified = true;
  }
  return payload;
}

export async function verifyEmailWithCode(userId: string, rawCode: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const code = rawCode.trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code from your email" };
  }

  const result = await db.execute(sql`
    SELECT
      email,
      email_verified AS "emailVerified",
      email_verification_code AS "emailVerificationCode",
      email_verification_expires_at AS "emailVerificationExpiresAt"
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `);

  const row = result.rows[0] as {
    email?: string;
    emailVerified?: boolean;
    emailVerificationCode?: string;
    emailVerificationExpiresAt?: Date | string;
  } | undefined;

  if (!row?.email || isPhoneOnlyEmail(row.email)) {
    return { ok: false, error: "No email address to verify" };
  }
  if (row.emailVerified) {
    return { ok: true };
  }
  if (!row.emailVerificationCode || row.emailVerificationCode !== code) {
    return { ok: false, error: "Invalid verification code" };
  }

  const expiresAt = row.emailVerificationExpiresAt
    ? new Date(row.emailVerificationExpiresAt)
    : null;
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Verification code expired. Request a new one." };
  }

  await markEmailVerified(userId);
  return { ok: true };
}
