export type TeamJoinResult =
  | { status: "joined"; joined: true; currentMembers?: number }
  | { status: "pending"; joined: false };

/** Unified join — server picks open vs approval from team joinPolicy. */
export async function joinTeamUnified(teamId: string, message?: string): Promise<TeamJoinResult> {
  const res = await fetch(`/api/teams/${teamId}/join`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message ? { message } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
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
}): string {
  if (team.hasJoined || team.isMember) return "Joined";
  if (team.hasRequestedToJoin) return "Requested";
  return team.joinPolicy === "approval" ? "Request to join" : "Join team";
}
