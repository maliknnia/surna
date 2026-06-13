import { db } from "../db";
import { sql } from "drizzle-orm";

let ensured: Promise<void> | null = null;

/** Phase 8 profiles & sport identity tables/columns. */
export function ensurePhase8ProfileTables(): Promise<void> {
  if (!ensured) {
    ensured = db
      .execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_type varchar DEFAULT 'normal';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sport_identity jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS height_cm integer;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_foot varchar;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS club_history text;

      CREATE TABLE IF NOT EXISTS profile_nudge_milestones (
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        milestone varchar NOT NULL,
        triggered_at timestamptz NOT NULL DEFAULT now(),
        dismissed_at timestamptz,
        PRIMARY KEY (user_id, milestone)
      );

      CREATE TABLE IF NOT EXISTS profile_view_events (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        viewer_id varchar REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON profile_view_events(profile_user_id, created_at DESC);
    `)
      .then(() => undefined)
      .catch((err) => {
        ensured = null;
        throw err;
      });
  }
  return ensured;
}
