-- Event GPS routes (cycling / running / hiking) — array of [lat, lng] pairs
ALTER TABLE events ADD COLUMN IF NOT EXISTS route_coordinates jsonb;
