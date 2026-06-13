import { sql } from "drizzle-orm";
import { db } from "../../db";

let promise: Promise<void> | null = null;

/** Align notifications table with notifications.repo (actor_id, read_at, etc.). */
export function ensureNotificationsSchema(): Promise<void> {
  if (promise) return promise;
  promise = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type varchar NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_id varchar;`);
    await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS post_id varchar;`);
    await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS comment_id varchar;`);
    await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message text;`);
    await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb;`);
    await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;`);
    await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title varchar;`);
    await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_type varchar;`);
    await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_id varchar;`);
    await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;`);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS notifications_user_created_idx
      ON notifications (user_id, created_at DESC);
    `);
    console.log("[notifications] schema ensured (actor_id, read_at, metadata)");
  })().catch((err) => {
    promise = null;
    throw err;
  });
  return promise;
}
