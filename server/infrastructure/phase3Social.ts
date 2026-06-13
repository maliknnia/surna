import { db } from "../db";
import { sql } from "drizzle-orm";

let ensured: Promise<void> | null = null;

/** Phase 3 social tables: follows, user_blocks, content_reports, event waitlist reminders. */
export function ensurePhase3SocialTables(): Promise<void> {
  if (!ensured) {
    ensured = db
      .execute(sql`
      CREATE TABLE IF NOT EXISTS follows (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id varchar NOT NULL,
        following_type varchar NOT NULL DEFAULT 'user',
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (follower_id, following_id, following_type)
      );
      CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
      CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id, following_type);

      INSERT INTO follows (follower_id, following_id, following_type, created_at)
      SELECT uf.follower_id, uf.followed_id, 'user', COALESCE(uf.created_at, now())
      FROM user_follows uf
      WHERE NOT EXISTS (
        SELECT 1 FROM follows f
        WHERE f.follower_id = uf.follower_id
          AND f.following_id = uf.followed_id
          AND f.following_type = 'user'
      );

      CREATE TABLE IF NOT EXISTS user_blocks (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (blocker_id, blocked_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);

      CREATE TABLE IF NOT EXISTS content_reports (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_type varchar NOT NULL,
        content_id varchar NOT NULL,
        reason varchar NOT NULL,
        description text,
        status varchar NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status, created_at DESC);

      ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS waitlist_position integer;
      ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean NOT NULL DEFAULT false;
      ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS reminder_1h_sent boolean NOT NULL DEFAULT false;
    `)
      .then(() => undefined)
      .catch((err) => {
        ensured = null;
        throw err;
      });
  }
  return ensured;
}

export async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  await ensurePhase3SocialTables();
  const q = await db.execute(sql`
    SELECT blocked_id FROM user_blocks WHERE blocker_id = ${userId}
    UNION
    SELECT blocker_id AS blocked_id FROM user_blocks WHERE blocked_id = ${userId}
  `);
  return new Set(q.rows.map((r: { blocked_id: string }) => r.blocked_id).filter(Boolean));
}

export async function getFollowingUserIds(userId: string): Promise<Set<string>> {
  await ensurePhase3SocialTables();
  const q = await db.execute(sql`
    SELECT following_id FROM follows
    WHERE follower_id = ${userId} AND following_type IN ('user', 'coach')
  `);
  return new Set(q.rows.map((r: { following_id: string }) => r.following_id));
}
