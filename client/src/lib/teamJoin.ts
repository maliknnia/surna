import { apiRequest } from "@/lib/queryClient";
import { isDemoTeamId } from "@/lib/demoTeams";
import type { TeamJoinPolicy, TeamJoinRequirements } from "@shared/teamJoin";
import { teamHasJoinSteps } from "@shared/teamJoin";

export type TeamJoinResult =
  | { status: "joined"; joined: true; currentMembers?: number }
  | { status: "pending"; joined: false };

export type TeamJoinTemplate = {
  teamId: string;
  teamName: string;
  sport: string;
  logo?: string | null;
  joinPolicy: TeamJoinPolicy;
  isPublic: boolean;
  joinFeeCents: number;
  joinFeeNote?: string | null;
  requirements: TeamJoinRequirements;
  pendingInvite?: { id: string; invitedBy?: string; message?: string | null } | null;
};

export type SubmitJoinApplicationPayload = {
  message?: string;
  answers?: Record<string, string | boolean>;
  agreedDocumentIds?: string[];
  feeAcknowledged?: boolean;
  inviteId?: string;
};

export async function fetchTeamJoinTemplate(teamId: string): Promise<TeamJoinTemplate> {
  if (isDemoTeamId(teamId)) {
    return {
      teamId,
      teamName: "Demo team",
      sport: "Soccer",
      joinPolicy: "open",
      isPublic: true,
      joinFeeCents: 0,
      requirements: { questions: [], documents: [] },
    };
  }
  const res = await fetch(`/api/teams/${teamId}/join-template`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to load join form");
  return data as TeamJoinTemplate;
}

export async function submitTeamJoinApplication(
  teamId: string,
  payload: SubmitJoinApplicationPayload,
): Promise<TeamJoinResult> {
  if (isDemoTeamId(teamId)) {
    return { status: "joined", joined: true };
  }
  const res = await apiRequest("POST", `/api/teams/${teamId}/apply`, payload);
  const data = await res.json().catch(() => ({}));
  if (data.status === "pending" || data.joined === false) {
    return { status: "pending", joined: false };
  }
  return {
    status: "joined",
    joined: true,
    currentMembers: typeof data.currentMembers === "number" ? data.currentMembers : undefined,
  };
}

/** Unified join — instant when allowed, otherwise caller should open join sheet. */
export async function joinTeamUnified(teamId: string, message?: string): Promise<TeamJoinResult> {
  if (isDemoTeamId(teamId)) {
    return { status: "joined", joined: true };
  }

  try {
    const template = await fetchTeamJoinTemplate(teamId);
    if (
      template.joinPolicy === "invite_only" ||
      template.joinPolicy === "approval" ||
      teamHasJoinSteps(template.requirements, template.joinFeeCents)
    ) {
      throw new Error("JOIN_APPLICATION_REQUIRED");
    }
  } catch (e) {
    if (e instanceof Error && e.message === "JOIN_APPLICATION_REQUIRED") throw e;
    /* fall through to legacy join */
  }

  const res = await fetch(`/api/teams/${teamId}/join`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message ? { message } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.code === "JOIN_APPLICATION_REQUIRED") {
      throw new Error("JOIN_APPLICATION_REQUIRED");
    }
    throw new Error(data.message || "Failed to join team");
  }
  if (data.status === "pending" || data.joined === false) {
    return { status: "pending", joined: false };
  }
  return {
    status: "joined",
    joined: true,
    currentMembers: typeof data.currentMembers === "number" ? data.currentMembers : undefined,
  };
}

export async function leaveTeam(teamId: string): Promise<void> {
  const res = await fetch(`/api/teams/${teamId}/leave`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to leave team");
}

export function joinButtonLabel(team: {
  hasJoined?: boolean;
  isMember?: boolean;
  hasRequestedToJoin?: boolean;
  joinPolicy?: string | null;
  pendingInvite?: { id: string } | null;
}): string {
  if (team.hasJoined || team.isMember) return "Joined";
  if (team.hasRequestedToJoin) return "Requested";
  if (team.pendingInvite) return "Accept invite";
  if (team.joinPolicy === "invite_only") return "Invite only";
  return team.joinPolicy === "approval" ? "Request to join" : "Join team";
}

export function shouldOpenJoinSheet(template: TeamJoinTemplate): boolean {
  if (template.pendingInvite) return true;
  return (
    template.joinPolicy !== "invite_only" &&
    (template.joinPolicy === "approval" ||
      teamHasJoinSteps(template.requirements, template.joinFeeCents))
  );
}

export async function invitePlayerToTeam(
  teamId: string,
  userId: string,
  message?: string,
): Promise<void> {
  const res = await apiRequest("POST", `/api/teams/${teamId}/invites`, { userId, message });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to send invite");
  }
}

export async function declineTeamInvite(inviteId: string): Promise<void> {
  const res = await apiRequest("POST", `/api/teams/invites/${inviteId}/decline`, {});
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to decline invite");
  }
}

export function formatJoinFee(cents: number): string {
  if (cents <= 0) return "";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(cents / 100);
}
