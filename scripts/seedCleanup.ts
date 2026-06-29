import { db } from "../server/db";
import { sql } from "drizzle-orm";

/** Remove FK rows pointing at @surna.app users (handles tables added after seed was written). */
export async function purgeRemainingSeedUserReferences() {
  for (let pass = 0; pass < 30; pass++) {
    const { rows } = await db.execute<{ table_name: string; column_name: string }>(sql`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users' AND ccu.column_name = 'id'
        AND tc.table_name <> 'users'
    `);
    let changed = 0;
    for (const { table_name, column_name } of rows) {
      const del = await db.execute(sql.raw(
        `DELETE FROM "${table_name}" WHERE "${column_name}" IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`,
      ));
      changed += del.rowCount ?? 0;
      try {
        const upd = await db.execute(sql.raw(
          `UPDATE "${table_name}" SET "${column_name}" = NULL WHERE "${column_name}" IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`,
        ));
        changed += upd.rowCount ?? 0;
      } catch {
        /* column not nullable */
      }
    }
    if (changed === 0) break;
  }
}

/** Wipe all demo seed accounts and their content (@surna.app emails). */
export async function cleanupSeedUsers() {
  console.log("Cleaning existing @surna.app demo data...");
  await db.execute(sql`DELETE FROM post_likes WHERE post_id IN (SELECT id FROM posts WHERE author_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM post_comments WHERE post_id IN (SELECT id FROM posts WHERE author_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM rating_history WHERE entity_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR entity_id IN (SELECT id FROM teams WHERE captain_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM event_participants WHERE event_id IN (SELECT id FROM events WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM match_participants WHERE match_id IN (SELECT id FROM competitive_matches WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM competitive_matches WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM events WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM posts WHERE author_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM order_items WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM product_answers WHERE question_id IN (SELECT id FROM product_questions WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')))`);
  await db.execute(sql`DELETE FROM product_questions WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM product_reviews WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM wishlist_items WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM product_attributes WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM product_pricing WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM inventory_tracking WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM product_views WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM product_recommendations WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`UPDATE product_searches SET clicked_product_id = NULL WHERE clicked_product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM shop_followers WHERE shop_id IN (SELECT id FROM product_sellers WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM product_sellers WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM team_members WHERE team_id IN (SELECT id FROM teams WHERE captain_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM team_stats WHERE team_id IN (SELECT id FROM teams WHERE captain_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM teams WHERE captain_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM coaches WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM places WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM story_viewers WHERE story_id IN (SELECT id FROM stories WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM story_replies WHERE story_id IN (SELECT id FROM stories WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM stories WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM instant_team_members WHERE team_id IN (SELECT id FROM instant_teams WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM instant_teams WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM messages WHERE sender_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR receiver_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR related_entity_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM saved_posts WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM point_transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM user_follows WHERE follower_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR followed_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM user_levels WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM post_shares WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM event_rsvps WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM team_join_requests WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR reviewed_by IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR blocked_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM user_referrals WHERE referrer_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR referred_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`UPDATE team_stats SET top_player_id = NULL WHERE top_player_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM community_routes WHERE discovered_by IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM free_play_spots WHERE discovered_by IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await purgeRemainingSeedUserReferences();
  await db.execute(sql`DELETE FROM users WHERE email LIKE '%@surna.app'`);
  console.log("  Cleaned @surna.app accounts and content.");
}
