import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  teamGameParticipants,
  teamGames,
  teamMembers,
  teamStats,
  teams,
  users,
} from "@shared/schema";
import { teamManagementService } from "./teamManagementService";

export type TeamGameResult = "win" | "loss" | "draw";

export type LogTeamGameInput = {
  opponentName: string;
  result: TeamGameResult;
  ourScore?: number;
  theirScore?: number;
  playerIds: string[];
  playedAt?: string;
  notes?: string;
};

async function ensureTeamStats(teamId: string) {
  const [row] = await db.select().from(teamStats).where(eq(teamStats.teamId, teamId)).limit(1);
  if (row) return row;
  const [created] = await db
    .insert(teamStats)
    .values({
      teamId,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalEvents: 0,
      avgAttendance: "0",
    })
    .returning();
  return created;
}

export async function logTeamGame(teamId: string, loggedBy: string, input: LogTeamGameInput) {
  const canLog = await teamManagementService.hasPermission(teamId, loggedBy, "canManageMembers");
  if (!canLog) throw new Error("Only team managers can log games");

  const opponentName = input.opponentName.trim();
  if (!opponentName) throw new Error("Opponent name is required");
  if (!["win", "loss", "draw"].includes(input.result)) {
    throw new Error("Result must be win, loss, or draw");
  }

  const uniquePlayerIds = [...new Set(input.playerIds.filter(Boolean))];
  if (uniquePlayerIds.length === 0) {
    throw new Error("Select at least one player who participated");
  }

  const memberRows = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.status, "active"),
        inArray(teamMembers.userId, uniquePlayerIds),
      ),
    );
  if (memberRows.length !== uniquePlayerIds.length) {
    throw new Error("All selected players must be active team members");
  }

  const playedAt = input.playedAt ? new Date(input.playedAt) : new Date();

  const [game] = await db
    .insert(teamGames)
    .values({
      teamId,
      loggedBy,
      opponentName,
      result: input.result,
      ourScore: input.ourScore ?? null,
      theirScore: input.theirScore ?? null,
      playedAt,
      notes: input.notes?.trim() || null,
    })
    .returning();

  await db.insert(teamGameParticipants).values(
    uniquePlayerIds.map((userId) => ({
      gameId: game.id,
      teamId,
      userId,
      showOnProfile: true,
    })),
  );

  const stats = await ensureTeamStats(teamId);
  const gamesPlayed = (stats.gamesPlayed ?? 0) + 1;
  const wins = (stats.wins ?? 0) + (input.result === "win" ? 1 : 0);
  const losses = (stats.losses ?? 0) + (input.result === "loss" ? 1 : 0);
  const draws = (stats.draws ?? 0) + (input.result === "draw" ? 1 : 0);

  await db
    .update(teamStats)
    .set({
      gamesPlayed,
      wins,
      losses,
      draws,
      lastUpdated: new Date(),
    })
    .where(eq(teamStats.teamId, teamId));

  const [teamRow] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (teamRow) {
    let streak = teamRow.currentWinStreak ?? 0;
    if (input.result === "win") streak += 1;
    else streak = 0;
    const longest = Math.max(teamRow.longestWinStreak ?? 0, streak);
    await db
      .update(teams)
      .set({
        currentWinStreak: streak,
        longestWinStreak: longest,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));
  }

  for (const userId of uniquePlayerIds) {
    await db
      .update(teamMembers)
      .set({
        gamesPlayed: sql`COALESCE(${teamMembers.gamesPlayed}, 0) + 1`,
        lastActive: new Date(),
      })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  return { game, record: { W: wins, L: losses, D: draws } };
}

export async function listTeamGames(teamId: string, limit = 20) {
  const rows = await db
    .select()
    .from(teamGames)
    .where(eq(teamGames.teamId, teamId))
    .orderBy(desc(teamGames.playedAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const gameIds = rows.map((g) => g.id);
  const participants = await db
    .select({
      gameId: teamGameParticipants.gameId,
      userId: teamGameParticipants.userId,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(teamGameParticipants)
    .innerJoin(users, eq(teamGameParticipants.userId, users.id))
    .where(inArray(teamGameParticipants.gameId, gameIds));

  const byGame = new Map<string, { userId: string; name: string }[]>();
  for (const p of participants) {
    const list = byGame.get(p.gameId) ?? [];
    const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Player";
    list.push({ userId: p.userId, name });
    byGame.set(p.gameId, list);
  }

  return rows.map((g) => ({
    id: g.id,
    opponentName: g.opponentName,
    result: g.result,
    ourScore: g.ourScore,
    theirScore: g.theirScore,
    playedAt: g.playedAt,
    notes: g.notes,
    players: byGame.get(g.id) ?? [],
  }));
}

export async function getTeamRecord(teamId: string) {
  const stats = await ensureTeamStats(teamId);
  return {
    W: stats.wins ?? 0,
    L: stats.losses ?? 0,
    D: stats.draws ?? 0,
    gamesPlayed: stats.gamesPlayed ?? 0,
  };
}

export async function getProfileTeamGames(userId: string, options?: { includeHidden?: boolean; limit?: number }) {
  const limit = options?.limit ?? 30;
  const includeHidden = options?.includeHidden ?? false;

  const participantRows = await db
    .select({
      participantId: teamGameParticipants.id,
      showOnProfile: teamGameParticipants.showOnProfile,
      game: teamGames,
      teamName: teams.name,
      teamLogo: teams.logo,
      sport: teams.sport,
    })
    .from(teamGameParticipants)
    .innerJoin(teamGames, eq(teamGameParticipants.gameId, teamGames.id))
    .innerJoin(teams, eq(teamGames.teamId, teams.id))
    .where(
      and(
        eq(teamGameParticipants.userId, userId),
        includeHidden ? sql`true` : eq(teamGameParticipants.showOnProfile, true),
      ),
    )
    .orderBy(desc(teamGames.playedAt))
    .limit(limit);

  return participantRows.map((r) => ({
    id: r.participantId,
    gameId: r.game.id,
    teamId: r.game.teamId,
    teamName: r.teamName,
    teamLogo: r.teamLogo,
    sport: r.sport,
    opponentName: r.game.opponentName,
    result: r.game.result,
    ourScore: r.game.ourScore,
    theirScore: r.game.theirScore,
    playedAt: r.game.playedAt,
    showOnProfile: r.showOnProfile,
  }));
}

export async function getProfileTeamGameSummary(userId: string) {
  const games = await getProfileTeamGames(userId, { limit: 500 });
  const total = games.length;
  const wins = games.filter((g) => g.result === "win").length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  return { total, wins, winRate };
}

export async function setTeamGameProfileVisibility(
  participantId: string,
  userId: string,
  showOnProfile: boolean,
) {
  const [row] = await db
    .select()
    .from(teamGameParticipants)
    .where(eq(teamGameParticipants.id, participantId))
    .limit(1);
  if (!row) throw new Error("Record not found");
  if (row.userId !== userId) throw new Error("Not your record");

  await db
    .update(teamGameParticipants)
    .set({ showOnProfile })
    .where(eq(teamGameParticipants.id, participantId));

  return { success: true };
}
