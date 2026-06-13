import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const sql = `
ALTER TABLE events ADD COLUMN IF NOT EXISTS creator_id text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_media_id text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS route_coordinates jsonb;

CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id varchar NOT NULL,
  user_id varchar NOT NULL,
  status text NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status
  ON event_rsvps(event_id, status);
`;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("events_columns_ready");
} finally {
  await client.end();
}
