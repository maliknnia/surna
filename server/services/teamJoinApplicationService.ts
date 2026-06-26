import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { teamJoinRequests, teamMembers, teams } from "@shared/schema";
import {
  parseJoinRequirements,
  type TeamJoinRequirements,
} from "@shared/teamJoin";
import { teamManagementService } from "./teamManagementService";
import { storage } from "../storage";
import {
  getPendingInviteForUser,
  markInviteAccepted,
  validateInviteForApplication,
} from "./teamInviteService";

export type SubmitJoinApplicationInput = {
  message?: string;
  answers?: Record<string, string | boolean>;
  agreedDocumentIds?: string[];
  feeAcknowledged?: boolean;
  inviteId?: string;
};

function normalizeAnswers(
  requirements: TeamJoinRequirements,
  answers: Record<string, string | boolean> | undefined,
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const q of requirements.questions) {
    const val = answers?.[q.id];
    if (q.type === "yesno") {
      out[q.id] = val === true || val === "true";
    } else if (typeof val === "string") {
      out[q.id] = val.trim();
    } else if (val != null) {
      out[q.id] = String(val);
    } else {
      out[q.id] = "";
    }
  }
  return out;
}

function validateApplication(
  requirements: TeamJoinRequirements,
  joinFeeCents: number,
  input: SubmitJoinApplicationInput,
): { answers: Record<string, string | boolean>; agreedDocuments: { documentId: string; agreedAt: string }[]; paymentStatus: string } {
  const answers = normalizeAnswers(requirements, input.answers);
  const agreedIds = new Set(input.agreedDocumentIds ?? []);

  for (const q of requirements.questions) {
    if (!q.required) continue;
    const val = answers[q.id];
    if (q.type === "yesno") {
      if (val !== true) throw new Error(`Please answer: ${q.label}`);
    } else if (!String(val ?? "").trim()) {
      throw new Error(`Please answer: ${q.label}`);
    }
  }

  for (const doc of requirements.documents) {
    if (doc.required && !agreedIds.has(doc.id)) {
      throw new Error(`Please agree to: ${doc.title}`);
    }
  }

  let paymentStatus = "not_required";
  if (joinFeeCents > 0) {
    if (!input.feeAcknowledged) {
      throw new Error("Please acknowledge the team join fee");
    }
    paymentStatus = "acknowledged";
  }

  const agreedDocuments = [...agreedIds].map((documentId) => ({
    documentId,
    agreedAt: new Date().toISOString(),
  }));

  return { answers, agreedDocuments, paymentStatus };
}

function teamRowJoinFields(team: typeof teams.$inferSelect) {
  const joinPolicy = (team.joinPolicy ?? "open") as "open" | "approval" | "invite_only";
  const joinFeeCents = Number((team as { joinFeeCents?: number | null }).joinFeeCents ?? 0);
  const joinFeeNote = (team as { joinFeeNote?: string | null }).joinFeeNote ?? null;
  const requirements = parseJoinRequirements(
    (team as { joinRequirements?: unknown }).joinRequirements,
  );
  return { joinPolicy, joinFeeCents, joinFeeNote, requirements };
}

export async function getTeamJoinTemplate(teamId: string, userId?: string) {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) return null;

  const { joinPolicy, joinFeeCents, joinFeeNote, requirements } = teamRowJoinFields(team);

  let pendingInvite: { id: string; invitedBy?: string; message?: string | null } | null = null;
  if (userId) {
    const inv = await getPendingInviteForUser(teamId, userId);
    if (inv) {
      pendingInvite = { id: inv.id, invitedBy: inv.invitedBy, message: inv.message };
    }
  }

  return {
    teamId: team.id,
    teamName: team.name,
    sport: team.sport,
    logo: team.logo,
    joinPolicy,
    isPublic: team.isPublic ?? true,
    joinFeeCents,
    joinFeeNote,
    requirements,
    pendingInvite,
  };
}

export async function updateTeamJoinTemplate(
  teamId: string,
  managerId: string,
  data: {
    joinPolicy?: "open" | "approval" | "invite_only";
    isPublic?: boolean;
    joinFeeCents?: number;
    joinFeeNote?: string | null;
    requirements?: TeamJoinRequirements;
  },
) {
  const canManage = await teamManagementService.hasPermission(teamId, managerId, "canManageMembers");
  if (!canManage) throw new Error("Insufficient permissions");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.joinPolicy !== undefined) patch.joinPolicy = data.joinPolicy;
  if (data.isPublic !== undefined) patch.isPublic = data.isPublic;
  if (data.joinFeeCents !== undefined) patch.joinFeeCents = Math.max(0, Math.floor(data.joinFeeCents));
  if (data.joinFeeNote !== undefined) patch.joinFeeNote = data.joinFeeNote;
  if (data.requirements !== undefined) {
    patch.joinRequirements = {
      questions: data.requirements.questions ?? [],
      documents: data.requirements.documents ?? [],
    };
  }

  const [updated] = await db.update(teams).set(patch).where(eq(teams.id, teamId)).returning();
  return updated;
}

export async function submitTeamJoinApplication(
  teamId: string,
  userId: string,
  input: SubmitJoinApplicationInput,
): Promise<{ status: "joined" | "pending"; requestId?: string; currentMembers?: number }> {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) throw new Error("Team not found");

  const { joinPolicy, joinFeeCents, requirements } = teamRowJoinFields(team);

  let inviteRecord: Awaited<ReturnType<typeof validateInviteForApplication>> | null = null;
  if (input.inviteId) {
    inviteRecord = await validateInviteForApplication(input.inviteId, teamId, userId);
  } else if (joinPolicy === "invite_only") {
    const pending = await getPendingInviteForUser(teamId, userId);
    if (!pending) {
      throw new Error("This team is invite-only. Ask the captain for an invite.");
    }
    inviteRecord = pending;
  }

  const source = inviteRecord ? "invite" : "self";
  const invitedBy = inviteRecord?.invitedBy ?? null;

  const existingMember = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);
  if (existingMember[0]?.status === "active") {
    throw new Error("You are already a member of this team");
  }

  const existingRequest = await db
    .select()
    .from(teamJoinRequests)
    .where(
      and(
        eq(teamJoinRequests.teamId, teamId),
        eq(teamJoinRequests.userId, userId),
        eq(teamJoinRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (existingRequest[0]) {
    throw new Error("Join request already pending");
  }

  const { answers, agreedDocuments, paymentStatus } = validateApplication(
    requirements,
    joinFeeCents,
    input,
  );

  const [inserted] = await db
    .insert(teamJoinRequests)
    .values({
      teamId,
      userId,
      message: input.message?.trim() || "",
      answers,
      agreedDocuments,
      paymentStatus,
      source,
      invitedBy,
      status: "pending",
    })
    .returning();

  const autoApprove =
    joinPolicy === "open" || (source === "invite" && (joinPolicy === "invite_only" || joinPolicy === "approval"));

  if (autoApprove) {
    await teamManagementService.reviewJoinRequest(inserted.id, team.captainId, "approved");
    if (inviteRecord) {
      await markInviteAccepted(inviteRecord.id);
    }
    const [updated] = await db
      .select({ currentMembers: teams.currentMembers })
      .from(teams)
      .where(eq(teams.id, teamId));
    return {
      status: "joined",
      requestId: inserted.id,
      currentMembers: updated?.currentMembers ?? team.currentMembers ?? undefined,
    };
  }

  try {
    const { notifyTeamJoinRequest } = await import("./teamNotificationService");
    await notifyTeamJoinRequest(teamId, userId, inserted.id);
  } catch (notifyErr) {
    console.warn("[teams] Join request notification skipped:", notifyErr);
  }

  return { status: "pending", requestId: inserted.id };
}

/** Legacy one-tap join — only when team has no requirements and open policy. */
export async function tryInstantJoin(teamId: string, userId: string) {
  const template = await getTeamJoinTemplate(teamId);
  if (!template) throw new Error("Team not found");
  const hasSteps =
    template.requirements.questions.length > 0 ||
    template.requirements.documents.length > 0 ||
    template.joinFeeCents > 0;

  if (template.joinPolicy === "invite_only") {
    throw new Error("This team is invite-only");
  }
  if (hasSteps || template.joinPolicy === "approval") {
    throw new Error("JOIN_APPLICATION_REQUIRED");
  }

  await storage.joinTeam(teamId, userId);
  try {
    const { notifyTeamMemberJoined } = await import("./teamNotificationService");
    await notifyTeamMemberJoined(teamId, userId);
  } catch {
    /* optional */
  }
  const [updated] = await db.select({ currentMembers: teams.currentMembers }).from(teams).where(eq(teams.id, teamId));
  return { status: "joined" as const, currentMembers: updated?.currentMembers };
}
