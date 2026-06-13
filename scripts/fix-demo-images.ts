/**
 * Patch live DB — replace broken Unsplash URLs with reliable avatar/photo CDNs.
 * Run: npm run db:fix:images
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { avatarUrl, actionPhotoUrl } from "./seedImages";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  console.log("Fixing demo profile & media URLs...");

  const users = await db.execute<{ id: string; username: string }>(sql`
    SELECT id, username FROM users WHERE email LIKE '%@surna.app' OR username IS NOT NULL
  `);

  let userCount = 0;
  for (const row of users.rows) {
    const seed = row.username || row.id;
    await db.execute(sql`
      UPDATE users SET profile_image_url = ${avatarUrl(seed)}
      WHERE id = ${row.id}
        AND (profile_image_url IS NULL OR profile_image_url LIKE '%unsplash.com%' OR profile_image_url = '')
    `);
    userCount++;
  }

  const posts = await db.execute<{ id: string }>(sql`
    SELECT id FROM posts
    WHERE image_url IS NOT NULL AND (image_url LIKE '%unsplash.com%' OR image_url = '')
  `);
  for (const row of posts.rows) {
    await db.execute(sql`
      UPDATE posts SET image_url = ${actionPhotoUrl(`post-${row.id}`, 800, 533)} WHERE id = ${row.id}
    `);
  }

  const stories = await db.execute<{ id: string }>(sql`
    SELECT id FROM stories WHERE media_url LIKE '%unsplash.com%'
  `);
  for (const row of stories.rows) {
    await db.execute(sql`
      UPDATE stories SET media_url = ${actionPhotoUrl(`story-${row.id}`, 900, 600)} WHERE id = ${row.id}
    `);
  }

  const products = await db.execute<{ id: string }>(sql`
    SELECT id FROM products WHERE image_url LIKE '%unsplash.com%' OR image_url IS NULL
  `);
  for (const row of products.rows) {
    await db.execute(sql`
      UPDATE products SET image_url = ${actionPhotoUrl(`product-${row.id}`, 600, 600)} WHERE id = ${row.id}
    `);
  }

  const places = await db.execute<{ id: string }>(sql`
    SELECT id FROM places
    WHERE profile_image_url LIKE '%unsplash.com%' OR cover_image_url LIKE '%unsplash.com%'
  `);
  for (const row of places.rows) {
    const img = actionPhotoUrl(`place-${row.id}`, 900, 500);
    await db.execute(sql`
      UPDATE places SET profile_image_url = ${img}, cover_image_url = ${img} WHERE id = ${row.id}
    `);
  }

  const coaches = await db.execute<{ id: string; user_id: string }>(sql`
    SELECT c.id, c.user_id FROM coaches c
    JOIN users u ON u.id = c.user_id
    WHERE u.email LIKE '%@surna.app'
  `);
  for (const row of coaches.rows) {
    const cover = actionPhotoUrl(`coach-${row.id}`, 900, 600);
    await db.execute(sql`
      UPDATE coaches
      SET profile_json = COALESCE(profile_json, '{}'::jsonb)
        || jsonb_build_object('coverImageUrl', ${cover}::text)
      WHERE id = ${row.id}
    `);
  }

  console.log(`✅ Updated ${userCount} users, ${posts.rows.length} posts, ${stories.rows.length} stories, ${products.rows.length} products, ${places.rows.length} places, ${coaches.rows.length} coaches`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
