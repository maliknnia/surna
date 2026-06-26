import { sql } from "drizzle-orm";
import { db } from "../db";

let promise: Promise<void> | null = null;

/** Moderation columns used by GET /api/admin/dashboard/stats queue counts. */
export function ensureAdminDashboardSchema(): Promise<void> {
  if (promise) return promise;
  promise = (async () => {
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false;`);
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS removed boolean DEFAULT false;`);
    await db.execute(sql`ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false;`);
    await db.execute(sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;`);
    await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS approved boolean DEFAULT true;`);
    await db.execute(sql`
      ALTER TABLE product_sellers ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
    `);
    console.log("[admin] dashboard moderation schema ensured");
  })().catch((err) => {
    promise = null;
    throw err;
  });
  return promise;
}
