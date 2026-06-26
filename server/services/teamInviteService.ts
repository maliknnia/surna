import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { teamMemberInvites, teamMembers, teams, users } from "@shared/schema";
import { teamManagementService } from "./teamManagementService";

export async function getPendingInviteForUser(teamId: string, userId: string) {
  const [row] = await db
    .select()
    .from(teamMemberInvites)
    .where(
      and(
        eq(teamMemberInvites.teamId, teamId),
        eq(teamMemberInvites.userId, userId),
        eq(teamMemberInvites.status, "pending"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listMyPendingInvites(userId: string) {
  const rows = await db
    .select({
      invite: teamMemberInvites,
      team: {
        id: teams.id,
        name: teams.name,
        sport: teams.sport,
        logo: teams.logo,
      },
      inviter: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        profileImageUrl: users.profileImageUrl,
      },
    })
    .from(teamMemberInvites)
    .innerJoin(teams, eq(teamMemberInvites.teamId, teams.id))
    .innerJoin(users, eq(teamMemberInvites.invitedBy, users.id))
    .where(and(eq(teamMemberInvites.userId, userId), eq(teamMemberInvites.status, "pending")));

  return rows.map(({ invite, team, inviter }) => ({
    id: invite.id,
    teamId: invite.teamId,
    message: invite.message,
    createdAt: invite.createdAt,
    team,
    invitedBy: inviter,
  }));
}

export async function createTeamMemberInvite(
  teamId: string,
  invitedBy: string,
  targetUserId: string,
  message?: string,
) {
  if (invitedBy === targetUserId) {
    throw new Error("You cannot invite yourself");
  }

  const canManage = await teamManagementService.hasPermission(teamId, invitedBy, "canManageMembers");
  if (!canManage) throw new Error("Insufficient permissions to invite members");

  const [existingMember] = await db
    .select({ status: teamMembers.status })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)))
    .limit(1);
  if (existingMember?.status === "active") {
    throw new Error("User is already on this team");
  }

  const [existingInvite] = await db
    .select({ id: teamMemberInvites.id })
    .from(teamMemberInvites)
    .where(
      and(
        eq(teamMemberInvites.teamId, teamId),
        eq(teamMemberInvites.userId, targetUserId),
        eq(teamMemberInvites.status, "pending"),
      ),
    )
    .limit(1);
  if (existingInvite) {
    throw new Error("An invite is already pending for this person");
  }

  const [inserted] = await db
    .insert(teamMemberInvites)
    .values({
      teamId,
      userId: targetUserId,
      invitedBy,
      message: message?.trim() || null,
      status: "pending",
    })
    .returning();

  try {
    const { notifyTeamMemberInvite } = await import("./teamNotificationService");
    await notifyTeamMemberInvite(teamId, invitedBy, targetUserId, inserted.id);
  } catch (err) {
    console.warn("[teams] Invite notification skipped:", err);
  }

  return inserted;
}

export async function declineTeamMemberInvite(inviteId: string, userId: string) {
  const [invite] = await db
    .select()
    .from(teamMemberInvites)
    .where(eq(teamMemberInvites.id, inviteId))
    .limit(1);
  if (!invite) throw new Error("Invite not found");
  if (invite.userId !== userId) throw new Error("Not your invite");
  if (invite.status !== "pending") throw new Error("Invite is no longer pending");

  await db
    .update(teamMemberInvites)
    .set({ status: "declined", respondedAt: new Date() })
    .where(eq(teamMemberInvites.id, inviteId));

  return { success: true };
}

export async function markInviteAccepted(inviteId: string) {
  await db
    .update(teamMemberInvites)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(teamMemberInvites.id, inviteId));
}

export async function validateInviteForApplication(inviteId: string, teamId: string, userId: string) {
  const [invite] = await db
    .select()
    .from(teamMemberInvites)
    .where(eq(teamMemberInvites.id, inviteId))
    .limit(1);
  if (!invite) throw new Error("Invite not found");
  if (invite.teamId !== teamId) throw new Error("Invite does not match this team");
  if (invite.userId !== userId) throw new Error("This invite is for another user");
  if (invite.status !== "pending") throw new Error("Invite is no longer valid");
  return invite;
}
