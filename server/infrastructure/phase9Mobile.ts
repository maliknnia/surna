import { sql } from "drizzle-orm";
import { db } from "../db";

export async function ensurePhase9MobileTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS device_push_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL,
      token text NOT NULL,
      platform varchar NOT NULL DEFAULT 'unknown',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, token)
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS device_push_tokens_user_idx ON device_push_tokens (user_id);
  `);
}
