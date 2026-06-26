export type NotifType =
  | "like"
  | "comment"
  | "follow"
  | "system"
  | "event_reminder"
  | "event_rsvp"
  | "event_cancelled"
  | "team_join_request"
  | "team_join_approved"
  | "team_join_rejected"
  | "team_invite"
  | "team_member_joined"
  | "team_schedule_reminder"
  | "team_schedule_update";

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
