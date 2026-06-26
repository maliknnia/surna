import { getIO } from "../../realtime/io";
import { insertNotification, listNotifications, markRead, markAllRead, unreadCount } from "./notifications.repo";
import type { NotifType } from "./notifications.types";

export async function notifyUser(row: {
  userId: string; actorId?: string | null; type: NotifType;
  postId?: string | null; commentId?: string | null;
  title?: string | null;
  message?: string | null; metadata?: any;
}) {
  const rec = await insertNotification(row);
  // push to socket room
  try {
    const io = getIO();
    io.to(`user:${row.userId}`).emit("notification:new", rec);
    console.log(`📬 [notifications] Sent to user:${row.userId} - ${row.type}`);
  } catch {
    // IO not initialized (e.g., during tests) — ignore
    console.log(`📬 [notifications] Created notification (no socket) - ${row.type}`);
  }
  return rec;
}

export async function getNotificationFeed(userId: string, opts: {
  cursorCreatedAt?: string; cursorId?: string; limit: number;
}) {
  const rows = await listNotifications(userId, opts.cursorCreatedAt, opts.cursorId, opts.limit);
  const next = rows.length
    ? { createdAt: rows[rows.length - 1].createdAt, id: rows[rows.length - 1].id }
    : null;
  return { items: rows, nextCursor: next };
}

export async function markNotificationRead(userId: string, id: string) {
  return await markRead(userId, id);
}

export async function markNotificationsAllRead(userId: string) {
  await markAllRead(userId);
}

export async function getUnreadCount(userId: string) {
  return await unreadCount(userId);
}
