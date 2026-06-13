import { db } from "../db";
import { sql } from "drizzle-orm";

let ensured: Promise<void> | null = null;

/** Phase 4 competitive engine: points, badges, streaks, weekly challenges. */
export function ensurePhase4CompetitiveTables(): Promise<void> {
  if (!ensured) {
    ensured = db
      .execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS current_win_streak integer NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_win_streak integer NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_streak integer NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_activity_streak integer NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_date date;

      ALTER TABLE teams ADD COLUMN IF NOT EXISTS current_win_streak integer NOT NULL DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS longest_win_streak integer NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS badges (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_type varchar NOT NULL,
        awarded_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, badge_type)
      );
      CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(user_id);
      CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(badge_type);

      CREATE TABLE IF NOT EXISTS weekly_challenges (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar NOT NULL,
        description text,
        sport varchar,
        requirement jsonb NOT NULL DEFAULT '{}',
        bonus_points integer NOT NULL DEFAULT 75,
        week_start timestamptz NOT NULL,
        week_end timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_weekly_challenges_week ON weekly_challenges(week_start DESC);

      CREATE TABLE IF NOT EXISTS weekly_challenge_completions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        weekly_challenge_id varchar NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        completed_at timestamptz NOT NULL DEFAULT now(),
        points_awarded integer NOT NULL DEFAULT 0,
        UNIQUE (weekly_challenge_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_weekly_completions_challenge ON weekly_challenge_completions(weekly_challenge_id, points_awarded DESC);
    `)
      .then(() => undefined)
      .catch((err) => {
        ensured = null;
        throw err;
      });
  }
  return ensured;
}
