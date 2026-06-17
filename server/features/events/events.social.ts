import { db } from "../../db";
import { and, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { posts, users } from "@shared/schema";
import { toPublicUser } from "../../lib/publicData";
import * as repo from "./events.repo";

function authorDisplayName(user: typeof users.$inferSelect) {
  const display = (user as { displayName?: string | null }).displayName;
  if (display?.trim()) return display.trim();
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || "Member";
}

export function mapEventPostRows(
  rows: { post: typeof posts.$inferSelect; author: typeof users.$inferSelect }[],
) {
  return rows.map(({ post, author }) => ({
    ...post,
    author: toPublicUser(author),
    authorName: authorDisplayName(author),
  }));
}

export async function fetchEventHighlights(eventId: string) {
  await repo.ensureEventsCompatTables();
  const ev = await repo.getEvent(eventId);
  if (!ev) return [];

  const featuredRaw = (ev as { featured_highlight_ids?: string[] }).featured_highlight_ids ?? [];
  const featuredIds = featuredRaw.filter(Boolean);
  const attendeeIds = await repo.getEventAttendeeUserIds(eventId);

  const seen = new Set<string>();
  const highlights: ReturnType<typeof mapEventPostRows> = [];

  if (featuredIds.length > 0) {
    const featuredRows = await db
      .select({ post: posts, author: users })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          inArray(posts.id, featuredIds),
          eq(posts.removed, false),
          isNotNull(posts.videoUrl),
        ),
      );
    const byId = new Map(featuredRows.map((r) => [r.post.id, r]));
    for (const id of featuredIds) {
      const row = byId.get(id);
      if (row) {
        highlights.push(...mapEventPostRows([row]));
        seen.add(id);
      }
    }
  }

  if (attendeeIds.length > 0 && highlights.length < 12) {
    const rows = await db
      .select({ post: posts, author: users })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          inArray(posts.authorId, attendeeIds),
          eq(posts.removed, false),
          isNotNull(posts.videoUrl),
          or(eq(posts.visibility, "public"), eq(posts.visibility, "friends")),
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(24);

    for (const row of rows) {
      if (highlights.length >= 12) break;
      if (seen.has(row.post.id)) continue;
      highlights.push(...mapEventPostRows([row]));
      seen.add(row.post.id);
    }
  }

  return highlights;
}

export async function fetchEventFeedPosts(eventId: string) {
  const attendeeIds = await repo.getEventAttendeeUserIds(eventId);

  const rows = await db
    .select({ post: posts, author: users })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(
        eq(posts.removed, false),
        or(
          sql`(event_data->>'eventId' = ${eventId} OR event_data->>'id' = ${eventId})`,
          attendeeIds.length > 0 ? inArray(posts.authorId, attendeeIds) : sql`false`,
        ),
        or(eq(posts.visibility, "public"), eq(posts.visibility, "friends")),
      ),
    )
    .orderBy(desc(posts.createdAt))
    .limit(40);

  return mapEventPostRows(rows);
}
