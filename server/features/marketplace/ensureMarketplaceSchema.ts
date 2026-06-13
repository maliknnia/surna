import { sql } from "drizzle-orm";
import { db } from "../../db";

let promise: Promise<void> | null = null;

/** Idempotent carts / checkout columns for the marketplace feature module. */
export function ensureMarketplaceSchema(): Promise<void> {
  if (promise) return promise;
  promise = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS carts (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cart_items (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        cart_id varchar NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        product_id varchar NOT NULL REFERENCES products(id),
        qty integer NOT NULL CHECK (qty > 0),
        unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
        currency text NOT NULL DEFAULT 'USD',
        UNIQUE(cart_id, product_id)
      );
    `);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_cents integer;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_cents integer;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_cents integer;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency varchar DEFAULT 'USD';`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount numeric(10, 2);`);
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS seller_id varchar;`);
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS title varchar;`);
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS qty integer;`);
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price_cents integer;`);
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS currency varchar;`);
    console.log("[marketplace] schema ensured (carts, cart_items, order columns)");
  })().catch((err) => {
    promise = null;
    throw err;
  });
  return promise;
}
