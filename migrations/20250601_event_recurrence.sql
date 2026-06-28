-- Event recurrence series (once / daily / weekly)
ALTER TABLE events ADD COLUMN IF NOT EXISTS series_id varchar;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_series_master boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule jsonb;
CREATE INDEX IF NOT EXISTS idx_events_series_id ON events(series_id);
