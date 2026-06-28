import { db } from "../../db";
import { sql } from "drizzle-orm";

let ensured: Promise<void> | null = null;

export function ensurePlacesBookingColumns(): Promise<void> {
  if (!ensured) {
    ensured = db
      .execute(sql`
        ALTER TABLE places ADD COLUMN IF NOT EXISTS booking_mode text NOT NULL DEFAULT 'request';
        ALTER TABLE places ADD COLUMN IF NOT EXISTS slot_duration_minutes integer NOT NULL DEFAULT 60;
        ALTER TABLE places ADD COLUMN IF NOT EXISTS slot_price numeric(10, 2);
      `)
      .then(() => undefined);
  }
  return ensured;
}
