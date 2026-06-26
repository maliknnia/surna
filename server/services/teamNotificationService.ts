import { db } from "../db";
import { eq, and, or, sql } from "drizzle-orm";
import { teams, teamMembers, users } from "@shared/schema";
import { notifyUser } from "../features/notifications/notifications.service";

async function teamManagerUserIds(teamId: string): Promise<string[]> {
  const [team] = await db
    .select({ captainId: teams.captainId, name: teams.name })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) return [];

  const ids = new Set<string>();
  if (team.captainId) ids.add(team.captainId);

  const managers = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.status, "active"),
        or(
          eq(teamMembers.role, "captain"),
          eq(teamMembers.role, "co-captain"),
          eq(teamMembers.role, "admin"),
        ),
      ),
    );
  for (const m of managers) ids.add(m.userId);
  return [...ids];
}

async function displayName(userId: string): Promise<string> {
  const [u] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      displayName: users.displayName,
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return "Someone";
  const dn = (u as { displayName?: string | null }).displayName;
  if (dn?.trim()) return dn.trim();
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return full || u.username || "Someone";
}

async function teamName(teamId: string): Promise<string> {
  const [t] = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1);
  return t?.name ?? "your team";
}

function teamMeta(teamId: string, extra?: Record<string, unknown>) {
  return {
    teamId,
    relatedEntityType: "team",
    relatedEntityId: teamId,
    route: `/teams/${teamId}`,
    ...extra,
  };
}

export async function notifyTeamJoinRequest(
  teamId: string,
  requesterId: string,
  requestId?: string,
): Promise<void> {
  const [name, requester, managerIds] = await Promise.all([
    teamName(teamId),
    displayName(requesterId),
    teamManagerUserIds(teamId),
  ]);

  const message = `${requester} requested to join ${name}`;
  await Promise.all(
    managerIds
      .filter((id) => id !== requesterId)
      .map((userId) =>
        notifyUser({
          userId,
          actorId: requesterId,
          type: "team_join_request",
          message,
          metadata: teamMeta(teamId, { requestId, requesterId }),
        }),
      ),
  );
}

export async function notifyJoinRequestReviewed(
  teamId: string,
  requesterId: string,
  decision: "approved" | "rejected",
  reviewerId: string,
): Promise<void> {
  const [name, reviewer] = await Promise.all([teamName(teamId), displayName(reviewerId)]);
  const approved = decision === "approved";
  const type = approved ? "team_join_approved" : "team_join_rejected";
  const message = approved
    ? `${reviewer} approved your request to join ${name}`
    : `${reviewer} declined your request to join ${name}`;

  await notifyUser({
    userId: requesterId,
    actorId: reviewerId,
    type,
    message,
    metadata: teamMeta(teamId, { decision }),
  });
}

export async function notifyTeamMemberInvite(
  teamId: string,
  inviterId: string,
  inviteeId: string,
  inviteId: string,
): Promise<void> {
  const [name, inviter] = await Promise.all([teamName(teamId), displayName(inviterId)]);
  const message = `${inviter} invited you to join ${name}`;

  await notifyUser({
    userId: inviteeId,
    actorId: inviterId,
    type: "team_invite",
    message,
    metadata: teamMeta(teamId, {
      inviteId,
      join: true,
      route: `/teams/${teamId}?join=1`,
    }),
  });
}

export async function notifyTeamMemberJoined(
  teamId: string,
  memberId: string,
): Promise<void> {
  const [name, member, managerIds] = await Promise.all([
    teamName(teamId),
    displayName(memberId),
    teamManagerUserIds(teamId),
  ]);

  const message = `${member} joined ${name}`;
  await Promise.all(
    managerIds
      .filter((id) => id !== memberId)
      .map((userId) =>
        notifyUser({
          userId,
          actorId: memberId,
          type: "team_member_joined",
          message,
          metadata: teamMeta(teamId, { memberId }),
        }),
      ),
  );
}

export async function notifyTeamScheduleCreated(
  teamId: string,
  sessionId: string,
  title: string,
  dateTime: Date,
  creatorId: string,
): Promise<void> {
  const [name, creator, memberRows] = await Promise.all([
    teamName(teamId),
    displayName(creatorId),
    db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, "active"))),
  ]);

  const when = dateTime.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const message = `${creator} scheduled "${title}" for ${name} on ${when}`;

  await Promise.all(
    memberRows
      .map((r) => r.userId)
      .filter((id) => id !== creatorId)
      .map((userId) =>
        notifyUser({
          userId,
          actorId: creatorId,
          type: "team_schedule_update",
          message,
          metadata: teamMeta(teamId, { sessionId, title, dateTime: dateTime.toISOString() }),
        }),
      ),
  );
}

async function alreadyReminded(
  userId: string,
  sessionId: string,
  reminderWindow: string,
): Promise<boolean> {
  const q = await db.execute(sql`
    SELECT 1 FROM notifications
    WHERE user_id = ${userId}
      AND type = 'team_schedule_reminder'
      AND metadata->>'sessionId' = ${sessionId}
      AND metadata->>'reminderWindow' = ${reminderWindow}
    LIMIT 1
  `);
  return (q.rows?.length ?? 0) > 0;
}

export async function sendTeamScheduleReminders(): Promise<number> {
  const q = await db.execute(sql`
    SELECT s.id AS session_id, s.team_id, s.focus, s.date_time, t.name AS team_name,
           tm.user_id
    FROM pro_training_sessions s
    JOIN teams t ON t.id = s.team_id
    JOIN team_members tm ON tm.team_id = s.team_id AND tm.status = 'active'
    WHERE s.date_time BETWEEN NOW() + interval '23 hours 30 minutes' AND NOW() + interval '24 hours 30 minutes'
  `);

  let count = 0;
  for (const row of q.rows as Array<{
    session_id: string;
    team_id: string;
    focus: string | null;
    date_time: string;
    team_name: string;
    user_id: string;
  }>) {
    if (await alreadyReminded(row.user_id, row.session_id, "24h")) continue;

    const title = row.focus || "Training session";
    const when = new Date(row.date_time).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    await notifyUser({
      userId: row.user_id,
      type: "team_schedule_reminder",
      message: `"${title}" with ${row.team_name} is tomorrow (${when}).`,
      metadata: teamMeta(row.team_id, {
        sessionId: row.session_id,
        reminderWindow: "24h",
        title,
      }),
    });
    count++;
  }
  return count;
}

export function startTeamScheduleReminderJob(): void {
  import("node-cron")
    .then(({ default: cron }) => {
      cron.schedule("*/15 * * * *", async () => {
        try {
          const sent = await sendTeamScheduleReminders();
          if (sent > 0) console.log("[teams] Schedule reminders sent:", sent);
        } catch (err) {
          console.error("[teams] Schedule reminder job failed:", err);
        }
      });
      console.log("[teams] Schedule reminder scheduler active (24h before training)");
    })
    .catch((err) => console.warn("[teams] Schedule reminder job deferred:", err));
}
