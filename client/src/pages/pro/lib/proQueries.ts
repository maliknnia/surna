/** Shared React Query keys + fetch helpers for Pro (dedupe cache across pages). */

export const proKeys = {
  teams: () => ["/api/pro/teams"] as const,
  teamDashboard: (teamId: string) => ["/api/pro/team", teamId, "dashboard"] as const,
  teamStats: (teamId: string) => ["/api/pro/team", teamId, "stats"] as const,
  teamMatches: (teamId: string) => ["/api/pro/team", teamId, "matches"] as const,
  teamMatchesPast: (teamId: string) => ["/api/pro/team", teamId, "matches", "past"] as const,
  teamSquad: (teamId: string) => ["/api/pro/team", teamId, "squad"] as const,
  teamFormations: (teamId: string) => ["/api/pro/team", teamId, "formations"] as const,
  teamMembers: (teamId: string) => ["/api/pro/team", teamId, "members"] as const,
  teamInventory: (teamId: string) => ["/api/pro/team", teamId, "inventory"] as const,
};

export type ProMatchRow = {
  id: string;
  opponent: string;
  date: string;
  time: string;
  venue: string;
  competition: string;
  homeAway: "Home" | "Away";
  status: "scheduled" | "ready" | "live";
};

export function mapMatchRows(rows: unknown[]): ProMatchRow[] {
  return (rows as Record<string, unknown>[]).map((m) => ({
    id: String(m.id),
    opponent: String(m.opponent || "TBC"),
    date: String(m.date ?? ""),
    time: String(m.time ?? ""),
    venue: String(m.venue ?? ""),
    competition: String(m.competition || "Fixture"),
    homeAway: (m.homeAway as ProMatchRow["homeAway"]) || "Home",
    status: (m.status as ProMatchRow["status"]) || "scheduled",
  }));
}

export async function fetchProJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { credentials: "include", signal });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

/** Longer cache for team list — changes infrequently during a session. */
export const PRO_TEAMS_STALE_MS = 120_000;
