import { db } from "../db";
import { sql } from "drizzle-orm";

let ensured: Promise<void> | null = null;

/** Phase 7 health & activity tracking tables. */
export function ensurePhase7HealthTables(): Promise<void> {
  if (!ensured) {
    ensured = db
      .execute(sql`
      CREATE TABLE IF NOT EXISTS activities (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type varchar NOT NULL,
        distance_km numeric(10,3),
        duration_seconds integer,
        calories integer,
        avg_heart_rate integer,
        route_coordinates jsonb,
        started_at timestamptz NOT NULL,
        finished_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_activities_user_started ON activities(user_id, started_at DESC);

      CREATE TABLE IF NOT EXISTS personal_bests (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        metric_type varchar NOT NULL,
        value numeric(12,4) NOT NULL,
        activity_id varchar REFERENCES activities(id) ON DELETE SET NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, metric_type)
      );
      CREATE INDEX IF NOT EXISTS idx_personal_bests_user ON personal_bests(user_id);

      CREATE TABLE IF NOT EXISTS fixture_readiness_reports (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id varchar NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        event_id varchar NOT NULL,
        generated_at timestamptz NOT NULL DEFAULT now(),
        report_json jsonb NOT NULL,
        notified boolean NOT NULL DEFAULT false,
        UNIQUE (team_id, event_id)
      );
      CREATE INDEX IF NOT EXISTS idx_fixture_readiness_team ON fixture_readiness_reports(team_id, generated_at DESC);
    `)
      .then(() => undefined)
      .catch((err) => {
        ensured = null;
        throw err;
      });
  }
  return ensured;
}
