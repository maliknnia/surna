import { db } from "../db";
import { sql } from "drizzle-orm";

let ensured: Promise<void> | null = null;

/** Phase 6 sport ecosystem tables and columns. */
export function ensurePhase6SportTables(): Promise<void> {
  if (!ensured) {
    ensured = db
      .execute(sql`
      ALTER TABLE challenges ADD COLUMN IF NOT EXISTS challenge_type varchar DEFAULT 'open';
      ALTER TABLE competitive_matches ADD COLUMN IF NOT EXISTS challenge_type varchar DEFAULT 'open';

      ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_class varchar;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS fight_record_wins integer DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS fight_record_losses integer DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS fight_record_draws integer DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS fight_record_kos integer DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS stance varchar;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS amateur_or_pro varchar;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS iaba_number varchar;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_clearance_expiry timestamptz;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gym_affiliation varchar;

      ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS manager_consent boolean DEFAULT false;

      CREATE TABLE IF NOT EXISTS referee_profiles (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        sports text[] NOT NULL DEFAULT '{}',
        location varchar,
        lat numeric(10,7),
        lng numeric(10,7),
        hourly_rate numeric(10,2),
        availability jsonb,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_referee_profiles_sports ON referee_profiles USING gin (sports);

      CREATE TABLE IF NOT EXISTS free_play_spots (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        sport varchar NOT NULL,
        lat numeric(10,7) NOT NULL,
        lng numeric(10,7) NOT NULL,
        discovered_by varchar NOT NULL REFERENCES users(id),
        like_count integer NOT NULL DEFAULT 0,
        save_count integer NOT NULL DEFAULT 0,
        checkin_count integer NOT NULL DEFAULT 0,
        verified_status varchar NOT NULL DEFAULT 'pending',
        discoverer_points_awarded boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_free_play_spots_sport ON free_play_spots(sport);
      CREATE INDEX IF NOT EXISTS idx_free_play_spots_coords ON free_play_spots(lat, lng);

      CREATE TABLE IF NOT EXISTS free_play_spot_likes (
        spot_id varchar NOT NULL REFERENCES free_play_spots(id) ON DELETE CASCADE,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (spot_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS free_play_spot_saves (
        spot_id varchar NOT NULL REFERENCES free_play_spots(id) ON DELETE CASCADE,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (spot_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS free_play_spot_checkins (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        spot_id varchar NOT NULL REFERENCES free_play_spots(id) ON DELETE CASCADE,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lat numeric(10,7) NOT NULL,
        lng numeric(10,7) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_free_play_spot_checkins_spot ON free_play_spot_checkins(spot_id);

      CREATE TABLE IF NOT EXISTS community_routes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        sport varchar NOT NULL,
        coordinates jsonb NOT NULL,
        lat numeric(10,7) NOT NULL,
        lng numeric(10,7) NOT NULL,
        discovered_by varchar NOT NULL REFERENCES users(id),
        like_count integer NOT NULL DEFAULT 0,
        save_count integer NOT NULL DEFAULT 0,
        checkin_count integer NOT NULL DEFAULT 0,
        verified_status varchar NOT NULL DEFAULT 'pending',
        discoverer_points_awarded boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_community_routes_sport ON community_routes(sport);

      CREATE TABLE IF NOT EXISTS community_route_likes (
        route_id varchar NOT NULL REFERENCES community_routes(id) ON DELETE CASCADE,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (route_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS community_route_saves (
        route_id varchar NOT NULL REFERENCES community_routes(id) ON DELETE CASCADE,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (route_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS community_route_checkins (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id varchar NOT NULL REFERENCES community_routes(id) ON DELETE CASCADE,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lat numeric(10,7) NOT NULL,
        lng numeric(10,7) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)
      .then(() => undefined)
      .catch((err) => {
        ensured = null;
        throw err;
      });
  }
  return ensured;
}
