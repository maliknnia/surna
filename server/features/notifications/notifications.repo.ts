import { db } from "../../db";
import { sql } from "drizzle-orm";
import type { NotifType } from "./notifications.types";

export async function insertNotification(row: {
  userId: string; actorId?: string | null; type: NotifType;
  postId?: string | null; commentId?: string | null;
  message?: string | null; metadata?: any;
}) {
  const q = await db.execute(sql`
    INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, message, metadata)
    VALUES (${row.userId}, ${row.actorId ?? null}, ${row.type},
            ${row.postId ?? null}, ${row.commentId ?? null}, ${row.message ?? null}, ${JSON.stringify(row.metadata ?? null)})
    RETURNING id, user_id AS "userId", actor_id AS "actorId", type, post_id AS "postId",
              comment_id AS "commentId", message, metadata, read_at AS "readAt", created_at AS "createdAt";
  `);
  return q.rows[0];
}

export async function listNotifications(userId: string, cursorCreatedAt?: string, cursorId?: string, limit = 20) {
  const where =
    cursorCreatedAt && cursorId
      ? sql`AND (created_at, id) < (${cursorCreatedAt}::timestamptz, ${cursorId}::uuid)`
      : sql``;

  const q = await db.execute(sql`
    SELECT id, user_id AS "userId", actor_id AS "actorId", type, post_id AS "postId",
           comment_id AS "commentId", message, metadata, read_at AS "readAt", created_at AS "createdAt"
    FROM notifications
    WHERE user_id = ${userId}
    ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit};
  `);
  return q.rows;
}

export async function markRead(userId: string, id: string) {
  const q = await db.execute(sql`
    UPDATE notifications
    SET read_at = now()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, read_at AS "readAt";
  `);
  return q.rows[0] ?? null;
}

export async function markAllRead(userId: string) {
  await db.execute(sql`
    UPDATE notifications SET read_at = now()
    WHERE user_id = ${userId} AND read_at IS NULL;
  `);
}

export async function unreadCount(userId: string) {
  const q = await db.execute(sql`
    SELECT count(*)::int AS count
    FROM notifications
    WHERE user_id = ${userId} AND read_at IS NULL;
  `);
  return (q.rows[0]?.count as number) ?? 0;
}
