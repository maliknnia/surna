import { db } from "../../db";
import { sql } from "drizzle-orm";

/** Idempotent boot migration for email verification and password auth fields. */
export async function ensureEmailVerificationColumns(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR
  `);
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false
  `);
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(6)
  `);
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP
  `);
  // Existing accounts with a real email are grandfathered as verified.
  await db.execute(sql`
    UPDATE users
    SET email_verified = true
    WHERE email_verified IS NOT TRUE
      AND email IS NOT NULL
      AND email NOT LIKE '%@phone.surna.local'
      AND email_verification_code IS NULL
  `);
}
