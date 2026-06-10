import { db } from "../../db";
import { readWithFallback } from "../../dbRead";
import { sql } from "drizzle-orm";
import { cacheAside, cacheDel, cacheKey, TTL } from "../../infrastructure/cache";

type ProfileRow = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarThumbUrl: string | null;
  createdAt: string;
};

export async function selectProfileByUsername(username: string) {
  return cacheAside(cacheKey('profile:username', username), TTL.PROFILE, async () => {
    // Route through readWithFallback so a Neon read replica (when configured)
    // serves this query, with automatic retry on the primary if the replica
    // is unhealthy. Falls back to a single primary call when no replica is set.
    const q = await readWithFallback((client) => client.execute(sql`
      SELECT id,
             username,
             display_name   AS "displayName",
             bio,
             profile_image_url AS "avatarThumbUrl",
             created_at     AS "createdAt"
      FROM users
      WHERE username = ${username}
      LIMIT 1;
    `));
    return q.rows[0] ?? null;
  });
}

export async function updateMe(userId: string, data: {
  displayName?: string;
  bio?: string;
  avatarThumbUrl?: string;
}) {
  const q = await db.execute(sql`
    UPDATE users
    SET display_name    = COALESCE(${data.displayName}, display_name),
        bio             = COALESCE(${data.bio}, bio),
        profile_image_url= COALESCE(${data.avatarThumbUrl}, profile_image_url)
    WHERE id = ${userId}
    RETURNING id, username, display_name AS "displayName", bio,
              profile_image_url AS "avatarThumbUrl",
              created_at AS "createdAt";
  `);
  const row = q.rows[0] as ProfileRow | undefined;
  // Invalidate the username-keyed profile cache so next read sees fresh data.
  if (row?.username) await cacheDel(cacheKey('profile:username', row.username));
  return row;
}
