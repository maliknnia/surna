import { db } from "../../db";
import { sql } from "drizzle-orm";
import type { NotifType } from "./notifications.types";

const NOTIF_TYPE_TITLES: Record<NotifType, string> = {
  like: "New like",
  comment: "New comment",
  follow: "New follower",
  system: "SURNA",
  event_reminder: "Event reminder",
  event_rsvp: "Event RSVP",
  event_cancelled: "Event cancelled",
  team_join_request: "Join request",
  team_join_approved: "Join approved",
  team_join_rejected: "Join declined",
  team_invite: "Team invite",
  team_member_joined: "New team member",
  team_schedule_reminder: "Training reminder",
  team_schedule_update: "Schedule update",
};

function resolveNotificationTitle(
  type: NotifType,
  message?: string | null,
  title?: string | null,
): string {
  if (title?.trim()) return title.trim().slice(0, 140);
  if (message?.trim()) {
    const m = message.trim();
    return m.length <= 140 ? m : `${m.slice(0, 137)}...`;
  }
  return NOTIF_TYPE_TITLES[type] ?? "SURNA";
}

function resolveNotificationMessage(message?: string | null, title?: string): string {
  if (message?.trim()) return message.trim();
  return title ?? "You have a new notification";
}

export async function insertNotification(row: {
  userId: string; actorId?: string | null; type: NotifType;
  postId?: string | null; commentId?: string | null;
  title?: string | null;
  message?: string | null; metadata?: any;
}) {
  const title = resolveNotificationTitle(row.type, row.message, row.title);
  const message = resolveNotificationMessage(row.message, title);

  const q = await db.execute(sql`
    INSERT INTO notifications (user_id, actor_id, type, title, post_id, comment_id, message, metadata)
    VALUES (${row.userId}, ${row.actorId ?? null}, ${row.type}, ${title},
            ${row.postId ?? null}, ${row.commentId ?? null}, ${message}, ${JSON.stringify(row.metadata ?? null)})
    RETURNING id, user_id AS "userId", actor_id AS "actorId", type, post_id AS "postId",
              comment_id AS "commentId", message, metadata, read_at AS "readAt", created_at AS "createdAt";
  `);
  const rec = q.rows[0];

  // Phase 9: dispatch mobile push when a notification row is created
  try {
    const { sendPushToUser } = await import("../../services/phase9MobileService");
    await sendPushToUser(row.userId, {
      title: "SURNA",
      body: row.message ?? `New ${row.type} notification`,
      data: {
        type: row.type,
        ...(row.postId ? { postId: row.postId } : {}),
      },
    });
  } catch {
    // push optional in dev
  }

  return rec;
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
