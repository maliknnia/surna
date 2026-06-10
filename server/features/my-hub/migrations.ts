import { sql } from "drizzle-orm";
import { db } from "../../db";

/**
 * Idempotent in-DB migration for the My Hub events lifecycle.
 *
 * Adds soft-cancel + draft state to the existing `events` table without a
 * parallel data model. Extends the existing event entity rather than
 * duplicating it. Safe to run on every boot â€” uses IF NOT EXISTS guards.
 *
 * Writes go through the primary `db` client (not `dbRead`) so this works
 * when a read replica is configured.
 */
let promise: Promise<void> | null = null;

export function ensureMyHubEventLifecycleColumns(): Promise<void> {
  if (promise) return promise;
  promise = (async () => {
    try {
      await db.execute(sql`
        ALTER TABLE events
          ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
      `);
      await db.execute(sql`
        ALTER TABLE events
          ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
      `);
    } catch (err) {
      console.error("[my-hub] failed to ensure event lifecycle columns", err);
      promise = null;
      throw err;
    }
  })();
  return promise;
}
