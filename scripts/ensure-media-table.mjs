import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const sql = `
CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  post_id uuid NULL,
  kind text NOT NULL DEFAULT 'image',
  status text NOT NULL DEFAULT 'pending',
  original_url text NOT NULL,
  medium_url text NULL,
  thumb_url text NULL,
  medium_webp_url text NULL,
  thumb_webp_url text NULL,
  medium_avif_url text NULL,
  thumb_avif_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_post_ready_created
  ON media(post_id, status, created_at DESC);
`;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("media_table_ready");
} finally {
  await client.end();
}
