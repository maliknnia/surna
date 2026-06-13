/**
 * Seed SURNA Gear shop + marketplace products (idempotent).
 * Run: npx tsx scripts/seed-marketplace.ts
 */
import { config } from "dotenv";
config();

const SELLER_EMAIL = "surna-gear@surna.app";
const SHOP_NAME = "SURNA Gear";

const productImages = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1593079831268-3381b0db7845?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1620799140408-edc077b9a938?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1606107557195-0a29cbf1f12b?w=600&h=600&fit=crop",
];

const catalog = [
  { name: "Elite Running Shoes", description: "Lightweight daily trainers with responsive foam for road and track sessions.", price: "89.99", category: "running-shoes", brand: "SURNA" },
  { name: "GAA Sliotar Pack (3)", description: "Match-grade sliotars for hurling and camogie training.", price: "24.99", category: "gaa-gear", brand: "SURNA" },
  { name: "Football Boots Pro FG", description: "Firm-ground boots with knit upper and locked-in heel cup.", price: "119.99", category: "football-boots", brand: "SURNA" },
  { name: "Rugby Headguard", description: "IRB-style headguard with breathable padding for contact sessions.", price: "54.99", category: "rugby-equipment", brand: "SURNA" },
  { name: "Cricket Bat — Junior", description: "Kashmir willow bat sized for U13–U15 club players.", price: "69.99", category: "cricket-kit", brand: "SURNA" },
  { name: "Cycling Jersey — Club", description: "Moisture-wicking race-fit jersey with rear pockets.", price: "44.99", category: "cycling-gear", brand: "SURNA" },
  { name: "Adjustable Dumbbells 20kg", description: "Quick-change dumbbell set for home gym strength work.", price: "149.99", category: "gym-equipment", brand: "SURNA" },
  { name: "Sports Water Bottle 750ml", description: "BPA-free bottle with flip lid — fits standard cage mounts.", price: "14.99", category: "general-sports", brand: "SURNA" },
];

async function main() {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("../server/db.js");
  const { ensureMarketplaceSchema } = await import("../server/features/marketplace/ensureMarketplaceSchema.js");

  await ensureMarketplaceSchema();

  let sellerId: string;
  const existingSeller = await db.execute(sql`
    SELECT id FROM users WHERE email = ${SELLER_EMAIL} LIMIT 1;
  `);
  if (existingSeller.rows[0]) {
    sellerId = (existingSeller.rows[0] as { id: string }).id;
    console.log("Seller exists:", SELLER_EMAIL);
  } else {
    const ins = await db.execute(sql`
      INSERT INTO users (id, email, username, first_name, last_name, display_name, sport, primary_sport, verified)
      VALUES (
        gen_random_uuid(),
        ${SELLER_EMAIL},
        'surna_gear',
        'SURNA',
        'Gear',
        'SURNA Gear',
        'General',
        'General',
        true
      )
      RETURNING id;
    `);
    sellerId = (ins.rows[0] as { id: string }).id;
    console.log("Created seller:", SELLER_EMAIL);
  }

  const shopCheck = await db.execute(sql`
    SELECT id FROM product_sellers WHERE seller_id = ${sellerId} LIMIT 1;
  `);
  if (!shopCheck.rows[0]) {
    await db.execute(sql`
      INSERT INTO product_sellers (
        seller_id, business_name, business_type, description, city, country, is_active, is_verified
      ) VALUES (
        ${sellerId},
        ${SHOP_NAME},
        'retailer',
        'Official SURNA marketplace — gear for GAA, football, rugby, running, and more.',
        'Dublin',
        'Ireland',
        true,
        true
      );
    `);
    console.log("Created shop:", SHOP_NAME);
  }

  await db.execute(sql`DELETE FROM products WHERE seller_id = ${sellerId};`);

  for (let i = 0; i < catalog.length; i++) {
    const p = catalog[i];
    await db.execute(sql`
      INSERT INTO products (seller_id, name, description, price, category, brand, image_url, stock, is_active)
      VALUES (
        ${sellerId},
        ${p.name},
        ${p.description},
        ${p.price},
        ${p.category},
        ${p.brand},
        ${productImages[i % productImages.length]},
        ${20 + i * 5},
        true
      );
    `);
  }

  const count = await db.execute(sql`
    SELECT COUNT(*)::int AS c FROM products WHERE is_active = true AND stock > 0;
  `);
  console.log(`Seeded ${catalog.length} products for ${SHOP_NAME}. Active catalog: ${(count.rows[0] as { c: number }).c}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
