import { apiRequest } from "@/lib/queryClient";

export type TeamGameResult = "win" | "loss" | "draw";

export type TeamGameRow = {
  id: string;
  opponentName: string;
  result: TeamGameResult;
  ourScore: number | null;
  theirScore: number | null;
  playedAt: string | null;
  notes: string | null;
  players: { userId: string; name: string }[];
};

export type TeamRecord = { W: number; L: number; D: number; gamesPlayed?: number };

export type ProfileTeamGame = {
  id: string;
  gameId: string;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  sport: string | null;
  opponentName: string;
  result: TeamGameResult;
  ourScore: number | null;
  theirScore: number | null;
  playedAt: string | null;
  showOnProfile: boolean;
};

export async function fetchTeamGames(teamId: string) {
  const res = await apiRequest("GET", `/api/teams/${teamId}/games`);
  return res.json() as Promise<{ games: TeamGameRow[]; record: TeamRecord }>;
}

export async function logTeamGame(
  teamId: string,
  payload: {
    opponentName: string;
    result: TeamGameResult;
    ourScore?: number;
    theirScore?: number;
    playerIds: string[];
    playedAt?: string;
    notes?: string;
  },
) {
  const res = await apiRequest("POST", `/api/teams/${teamId}/games`, payload);
  return res.json();
}

export async function fetchProfileTeamGames(userId: string) {
  const res = await apiRequest("GET", `/api/profile/${userId}/team-games`);
  return res.json() as Promise<{
    games: ProfileTeamGame[];
    summary: { total: number; wins: number; winRate: number };
  }>;
}

export async function setProfileTeamGameVisibility(participantId: string, showOnProfile: boolean) {
  const res = await apiRequest("PATCH", `/api/profile/team-games/${participantId}/visibility`, {
    showOnProfile,
  });
  return res.json();
}

export function formatGameScore(game: { ourScore: number | null; theirScore: number | null }) {
  if (game.ourScore == null || game.theirScore == null) return null;
  return `${game.ourScore}–${game.theirScore}`;
}

export function resultLabel(result: TeamGameResult) {
  if (result === "win") return "Win";
  if (result === "loss") return "Loss";
  return "Draw";
}

export function resultTone(result: TeamGameResult): "success" | "danger" | "muted" {
  if (result === "win") return "success";
  if (result === "loss") return "danger";
  return "muted";
}
