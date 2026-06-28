import { db } from "../../db";
import { sql } from "drizzle-orm";

let ensured: Promise<void> | null = null;
let membershipEnsured: Promise<void> | null = null;

export function ensurePlacesBookingColumns(): Promise<void> {
  if (!ensured) {
    ensured = db
      .execute(sql`
        ALTER TABLE places ADD COLUMN IF NOT EXISTS booking_mode text NOT NULL DEFAULT 'request';
        ALTER TABLE places ADD COLUMN IF NOT EXISTS slot_duration_minutes integer NOT NULL DEFAULT 60;
        ALTER TABLE places ADD COLUMN IF NOT EXISTS slot_price numeric(10, 2);
      `)
      .then(() => undefined);
  }
  return ensured;
}

export function ensurePlaceMembershipPlans(): Promise<void> {
  if (!membershipEnsured) {
    membershipEnsured = ensurePlacesBookingColumns()
      .then(() =>
        db.execute(sql`
          CREATE TABLE IF NOT EXISTS place_membership_plans (
            id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
            place_id varchar NOT NULL REFERENCES places(id) ON DELETE CASCADE,
            name varchar NOT NULL,
            description text,
            price numeric(10, 2) NOT NULL,
            billing_interval varchar NOT NULL DEFAULT 'monthly',
            features text[] DEFAULT ARRAY[]::text[],
            is_active boolean DEFAULT true,
            display_order integer DEFAULT 0,
            stripe_price_id varchar,
            created_at timestamp DEFAULT now(),
            updated_at timestamp DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS place_membership_plans_place_order_idx
            ON place_membership_plans (place_id, display_order);
          ALTER TABLE place_bookings ADD COLUMN IF NOT EXISTS membership_plan_id varchar
            REFERENCES place_membership_plans(id) ON DELETE SET NULL;
        `),
      )
      .then(() => undefined);
  }
  return membershipEnsured;
}
