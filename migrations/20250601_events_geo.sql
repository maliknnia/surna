ALTER TABLE events ADD COLUMN IF NOT EXISTS lat numeric(10, 7);
ALTER TABLE events ADD COLUMN IF NOT EXISTS lng numeric(10, 7);
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_detail jsonb;
