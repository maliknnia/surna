export type NotifType = "like" | "comment" | "follow" | "system" | "event_reminder" | "event_rsvp";

export interface NotificationRow {
  id: string;
  userId: string;        // recipient
  actorId?: string | null;
  type: NotifType;
  postId?: string | null;
  commentId?: string | null;
  message?: string | null;
  metadata?: any;
  readAt?: string | null;
  createdAt: string;     // ISO
}
