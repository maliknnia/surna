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
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id varchar;`);
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_label varchar;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT false;`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_variants (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id varchar NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        label varchar NOT NULL,
        variant_type varchar NOT NULL DEFAULT 'size',
        sku varchar,
        stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
        price_cents integer CHECK (price_cents IS NULL OR price_cents >= 0),
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS product_variants_product_order_idx
        ON product_variants (product_id, sort_order, label);
    `);

    await db.execute(sql`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id varchar;`);
    await db.execute(sql`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_label varchar;`);
    await db.execute(sql`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_key varchar NOT NULL DEFAULT '';`);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_product_id_key;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$;
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS cart_items_cart_product_variant_uidx
        ON cart_items (cart_id, product_id, variant_key);
    `);

    console.log("[marketplace] schema ensured (carts, cart_items, order columns, product_variants)");
  })().catch((err) => {
    promise = null;
    throw err;
  });
  return promise;
}
