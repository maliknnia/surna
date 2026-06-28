ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_price numeric(10, 2);

CREATE TABLE IF NOT EXISTS event_ticket_orders (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL,
  user_id varchar NOT NULL,
  amount_cents integer NOT NULL,
  currency varchar NOT NULL DEFAULT 'eur',
  status varchar NOT NULL DEFAULT 'pending',
  stripe_checkout_session_id varchar,
  stripe_payment_intent_id varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_event_ticket_orders_event ON event_ticket_orders(event_id, created_at DESC);
