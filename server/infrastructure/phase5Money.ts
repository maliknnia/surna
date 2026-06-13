import { db } from "../db";
import { sql } from "drizzle-orm";

let ensured: Promise<void> | null = null;

/** Phase 5 money & marketplace tables. */
export function ensurePhase5MoneyTables(): Promise<void> {
  if (!ensured) {
    ensured = db
      .execute(sql`
      CREATE TABLE IF NOT EXISTS team_bills (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id varchar NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        created_by varchar NOT NULL REFERENCES users(id),
        title varchar NOT NULL,
        total_amount numeric(12,2) NOT NULL,
        split_count integer NOT NULL DEFAULT 1,
        status varchar NOT NULL DEFAULT 'open',
        messenger_group_id varchar,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_team_bills_team ON team_bills(team_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS team_bill_payments (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        bill_id varchar NOT NULL REFERENCES team_bills(id) ON DELETE CASCADE,
        user_id varchar NOT NULL REFERENCES users(id),
        amount numeric(12,2) NOT NULL,
        status varchar NOT NULL DEFAULT 'pending',
        stripe_payment_intent_id varchar,
        paid_at timestamptz,
        UNIQUE (bill_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_team_bill_payments_bill ON team_bill_payments(bill_id);

      CREATE TABLE IF NOT EXISTS coach_availability (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        coach_id varchar NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
        day_of_week integer NOT NULL,
        start_time varchar NOT NULL,
        end_time varchar NOT NULL,
        hourly_rate numeric(10,2),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_coach_availability_coach ON coach_availability(coach_id);

      ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS platform_fee numeric(10,2);
      ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS coach_payout numeric(10,2);
      ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS review_rating integer;
      ALTER TABLE coach_bookings ADD COLUMN IF NOT EXISTS review_text text;

      CREATE TABLE IF NOT EXISTS tournament_entries (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id varchar NOT NULL,
        team_id varchar,
        user_id varchar NOT NULL REFERENCES users(id),
        entry_fee_cents integer NOT NULL DEFAULT 0,
        platform_fee_cents integer NOT NULL DEFAULT 0,
        payment_intent_id varchar,
        status varchar NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tournament_id, team_id)
      );
      CREATE INDEX IF NOT EXISTS idx_tournament_entries_user ON tournament_entries(user_id, created_at DESC);
    `)
      .then(() => undefined)
      .catch((err) => {
        ensured = null;
        throw err;
      });
  }
  return ensured;
}
