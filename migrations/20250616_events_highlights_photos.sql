ALTER TABLE events ADD COLUMN IF NOT EXISTS featured_highlight_ids text[] DEFAULT ARRAY[]::text[];

CREATE TABLE IF NOT EXISTS event_photos (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL,
  uploader_id varchar NOT NULL,
  image_url varchar NOT NULL,
  caption text,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id, created_at DESC);
