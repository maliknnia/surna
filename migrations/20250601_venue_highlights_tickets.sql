-- Venue highlights + ticket redemption columns
ALTER TABLE places ADD COLUMN IF NOT EXISTS featured_highlight_ids text[] DEFAULT ARRAY[]::text[];

CREATE TABLE IF NOT EXISTS event_tickets (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL,
  user_id varchar NOT NULL,
  code text NOT NULL UNIQUE,
  token_hash text,
  redeemed_at timestamptz,
  scanned_by varchar,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_tickets ADD COLUMN IF NOT EXISTS token_hash text;
ALTER TABLE event_tickets ADD COLUMN IF NOT EXISTS redeemed_at timestamptz;
ALTER TABLE event_tickets ADD COLUMN IF NOT EXISTS scanned_by varchar;
ALTER TABLE event_tickets ADD COLUMN IF NOT EXISTS issued_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_event_tickets_event_id ON event_tickets(event_id, issued_at DESC);
