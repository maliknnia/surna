/**
 * Quick sanity check after investor seed — exits 1 if anything critical is missing.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

type CountRow = { n: string };

async function count(query: ReturnType<typeof sql>): Promise<number> {
  const { rows } = await db.execute<CountRow>(query);
  return Number(rows[0]?.n ?? 0);
}

async function main() {
  const viewerEmail = process.env.INVESTOR_VIEWER_EMAIL || process.env.LOCAL_DEV_USER_EMAIL || "dev@surna.local";

  const athletes = await count(sql`SELECT COUNT(*)::text AS n FROM users WHERE email LIKE '%@surna.app'`);
  const posts = await count(sql`SELECT COUNT(*)::text AS n FROM posts WHERE author_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  const videos = await count(sql`SELECT COUNT(*)::text AS n FROM posts WHERE author_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') AND video_url IS NOT NULL`);
  const stories = await count(sql`SELECT COUNT(*)::text AS n FROM stories WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  const storyVideos = await count(sql`SELECT COUNT(*)::text AS n FROM stories WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') AND media_type = 'video'`);
  const teams = await count(sql`SELECT COUNT(*)::text AS n FROM teams WHERE captain_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  const teamsWithHighlights = await count(sql`SELECT COUNT(*)::text AS n FROM teams WHERE captain_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') AND featured_highlight_ids IS NOT NULL AND array_length(featured_highlight_ids, 1) > 0`);
  const places = await count(sql`SELECT COUNT(*)::text AS n FROM places WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  const events = await count(sql`SELECT COUNT(*)::text AS n FROM events WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  const coaches = await count(sql`SELECT COUNT(*)::text AS n FROM coaches WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  const matches = await count(sql`
    SELECT COUNT(*)::text AS n FROM competitive_matches
    WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')
       OR creator_id IN (SELECT id FROM teams WHERE captain_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))
  `);
  const products = await count(sql`SELECT COUNT(*)::text AS n FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR seller_id IN (SELECT seller_id FROM product_sellers WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);

  const { rows: viewerRows } = await db.execute<{ id: string }>(sql`SELECT id FROM users WHERE email = ${viewerEmail} LIMIT 1`);
  const viewerId = viewerRows[0]?.id;
  let viewerFollows = 0;
  let viewerStoryCount = 0;
  if (viewerId) {
    viewerFollows = await count(sql`SELECT COUNT(*)::text AS n FROM user_follows WHERE follower_id = ${viewerId} AND followed_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
    viewerStoryCount = await count(sql`SELECT COUNT(*)::text AS n FROM stories WHERE user_id IN (SELECT followed_id FROM user_follows WHERE follower_id = ${viewerId}) AND expires_at > NOW()`);
  }

  const checks: Array<{ label: string; got: number; min: number }> = [
    { label: "athletes", got: athletes, min: 18 },
    { label: "feed posts", got: posts, min: 24 },
    { label: "video posts", got: videos, min: 8 },
    { label: "stories", got: stories, min: 36 },
    { label: "story videos", got: storyVideos, min: 18 },
    { label: "teams", got: teams, min: 6 },
    { label: "teams with highlight reels", got: teamsWithHighlights, min: 4 },
    { label: "venues", got: places, min: 6 },
    { label: "events", got: events, min: 8 },
    { label: "coaches", got: coaches, min: 4 },
    { label: "challenges", got: matches, min: 8 },
    { label: "marketplace products", got: products, min: 1 },
    { label: `viewer follows (${viewerEmail})`, got: viewerFollows, min: 18 },
    { label: "viewer visible stories", got: viewerStoryCount, min: 36 },
  ];

  console.log("\nInvestor demo verification\n");
  let failed = false;
  for (const c of checks) {
    const ok = c.got >= c.min;
    if (!ok) failed = true;
    console.log(`  ${ok ? "✓" : "✗"} ${c.label}: ${c.got} (need ≥ ${c.min})`);
  }

  if (failed) {
    console.error("\nVerification FAILED — re-run db:seed:investor with INVESTOR_VIEWER_EMAIL set.\n");
    process.exit(1);
  }
  console.log("\nAll checks passed.\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
