import { eq } from "drizzle-orm";
import { db } from "../db";
import { teams } from "@shared/schema";
import type { CompetitiveMatch, MatchParticipant } from "@shared/schema";
import { BadRequest, Conflict, Forbidden } from "../core/errors";

export type ChallengeMatchType = "solo" | "player1v1" | "teamVsTeam" | "open";
export type ChallengeVisibility = "public" | "private" | "invite";
export type ChallengeOpponentType = "user" | "team";

export type MatchFormInput = {
  type: ChallengeMatchType;
  visibility: ChallengeVisibility;
  opponentId?: string;
  opponentType?: ChallengeOpponentType;
};

/** Validate match type + visibility + opponent combinations (server-side mirror of create UI). */
export function validateMatchForm(input: MatchFormInput): void {
  const { type, visibility, opponentId, opponentType } = input;

  if (type === "solo") {
    if (visibility === "public") {
      throw BadRequest("Solo challenges must be private — they are personal goals, not public listings");
    }
    if (opponentId) {
      throw BadRequest("Solo challenges cannot include an opponent");
    }
    return;
  }

  if (type === "player1v1") {
    if (opponentType && opponentType !== "user") {
      throw BadRequest("1v1 challenges require a player opponent");
    }
    if (visibility === "invite" && !opponentId) {
      throw BadRequest("Invite-only 1v1 challenges require a named opponent");
    }
    if (opponentId && opponentType === "user" && visibility === "public") {
      throw BadRequest("Direct player challenges should be invite-only or private, not public listings");
    }
    return;
  }

  if (type === "teamVsTeam") {
    if (!opponentId || opponentType !== "team") {
      throw BadRequest("Team vs team challenges require an opponent team");
    }
    if (visibility === "public") {
      throw BadRequest("Team vs team challenges should be invite-only or private, not public open listings");
    }
    return;
  }

  if (type === "open") {
    if (visibility === "invite") {
      throw BadRequest("Open challenges cannot be invite-only — use 1v1 or team vs team for direct invites");
    }
    if (opponentId) {
      throw BadRequest("Open challenges cannot name a single opponent — anyone can join");
    }
  }
}

/** Captain's team for structured team-vs-team validation when hostTeamId is omitted. */
export async function resolveHostTeamForUser(userId: string, sport: string): Promise<string | null> {
  const rows = await db
    .select({ id: teams.id, sport: teams.sport })
    .from(teams)
    .where(eq(teams.captainId, userId));

  const needle = sport.toLowerCase().trim();
  const match = rows.find((t) => {
    const teamSport = (t.sport ?? "").toLowerCase();
    return teamSport.includes(needle) || needle.includes(teamSport);
  });
  return match?.id ?? null;
}

export async function assertCanJoinOpenChallenge(
  match: CompetitiveMatch,
  userId: string,
  participants: MatchParticipant[],
): Promise<void> {
  if (match.type !== "open") {
    throw BadRequest("Only open challenges can be joined");
  }

  if (match.visibility !== "public") {
    throw BadRequest("This challenge is not open for public join");
  }

  if (match.status === "completed" || match.status === "cancelled") {
    throw BadRequest("This challenge is no longer accepting players");
  }

  const active = participants.filter((p) => p.status !== "declined");
  if (active.some((p) => p.participantType === "user" && p.participantId === userId)) {
    throw Conflict("You are already in this challenge");
  }

  if (match.capacity != null && match.capacity > 0 && active.length >= match.capacity) {
    throw Conflict("This challenge is full");
  }
}

export async function assertCanAcceptChallenge(
  match: CompetitiveMatch,
  userId: string,
  participants: MatchParticipant[],
): Promise<void> {
  if (match.status === "completed" || match.status === "cancelled") {
    throw BadRequest("This challenge is no longer active");
  }

  const guest = participants.find(
    (p) => p.role === "guest" && p.status === "pending",
  );

  if (!guest) {
    throw BadRequest("There is no pending invite on this challenge");
  }

  if (guest.participantType === "user") {
    if (guest.participantId !== userId) {
      throw Forbidden("Only the invited player can accept this challenge");
    }
    return;
  }

  if (guest.participantType === "team") {
    const [team] = await db
      .select({ captainId: teams.captainId })
      .from(teams)
      .where(eq(teams.id, guest.participantId))
      .limit(1);
    if (!team?.captainId || team.captainId !== userId) {
      throw Forbidden("Only the challenged team's captain can accept");
    }
  }
}
