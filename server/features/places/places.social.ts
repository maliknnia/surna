import { db } from "../../db";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { placePosts, places, users } from "@shared/schema";
import { toPublicUser } from "../../lib/publicData";
import { ensurePlaceHighlightsColumn } from "./places.compat";

function authorDisplayName(user: typeof users.$inferSelect) {
  const display = (user as { displayName?: string | null }).displayName;
  if (display?.trim()) return display.trim();
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || "Member";
}

function mapPlacePostRows(
  rows: { post: typeof placePosts.$inferSelect; author: typeof users.$inferSelect }[],
) {
  return rows.map(({ post, author }) => ({
    id: post.id,
    content: post.content,
    videoUrl: post.videoUrl,
    imageUrl: post.imageUrl,
    author: toPublicUser(author),
    authorName: authorDisplayName(author),
    createdAt: post.createdAt,
  }));
}

export async function fetchPlaceHighlights(placeId: string) {
  await ensurePlaceHighlightsColumn();

  const [place] = await db
    .select({ featuredHighlightIds: places.featuredHighlightIds, ownerId: places.ownerId })
    .from(places)
    .where(eq(places.id, placeId))
    .limit(1);
  if (!place) return [];

  const featuredIds = (place.featuredHighlightIds ?? []).filter(Boolean);
  const seen = new Set<string>();
  const highlights: ReturnType<typeof mapPlacePostRows> = [];

  if (featuredIds.length > 0) {
    const featuredRows = await db
      .select({ post: placePosts, author: users })
      .from(placePosts)
      .innerJoin(users, eq(placePosts.authorId, users.id))
      .where(
        and(
          eq(placePosts.placeId, placeId),
          inArray(placePosts.id, featuredIds),
          isNotNull(placePosts.videoUrl),
        ),
      );
    const byId = new Map(featuredRows.map((r) => [r.post.id, r]));
    for (const id of featuredIds) {
      const row = byId.get(id);
      if (row) {
        highlights.push(...mapPlacePostRows([row]));
        seen.add(id);
      }
    }
  }

  if (highlights.length < 12) {
    const rows = await db
      .select({ post: placePosts, author: users })
      .from(placePosts)
      .innerJoin(users, eq(placePosts.authorId, users.id))
      .where(
        and(
          eq(placePosts.placeId, placeId),
          isNotNull(placePosts.videoUrl),
          eq(placePosts.visibility, "public"),
        ),
      )
      .orderBy(desc(placePosts.createdAt))
      .limit(24);

    for (const row of rows) {
      if (highlights.length >= 12) break;
      if (seen.has(row.post.id)) continue;
      highlights.push(...mapPlacePostRows([row]));
      seen.add(row.post.id);
    }
  }

  return highlights;
}

export async function setPlaceFeaturedHighlights(
  placeId: string,
  ownerId: string,
  featuredHighlightIds: string[],
) {
  await ensurePlaceHighlightsColumn();
  const ids = featuredHighlightIds.filter(Boolean).slice(0, 12);
  const r = await db.execute(sql`
    UPDATE places
       SET featured_highlight_ids = ${ids}::text[],
           updated_at = NOW()
     WHERE id = ${placeId}
       AND owner_id = ${ownerId}
     RETURNING id;
  `);
  return (r.rows?.length ?? 0) > 0;
}
