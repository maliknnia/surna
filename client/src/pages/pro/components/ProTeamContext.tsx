import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getSportProfile, type SportProfile } from "../lib/proSport";
import { proKeys, PRO_TEAMS_STALE_MS } from "../lib/proQueries";

const STORAGE_KEY = "surna.pro.teamId";

export type ProTeamSummary = {
  id: string;
  name: string;
  sport: string;
  location: string;
  members: number;
  events: number;
  status: "active" | "recruiting" | "paused";
  rating: number;
};

type Ctx = {
  teamId: string | null;
  setTeamId: (id: string) => void;
  teams: ProTeamSummary[];
  teamsLoading: boolean;
  activeTeam: ProTeamSummary | null;
  sportProfile: SportProfile;
};

const ProTeamContext = createContext<Ctx | null>(null);

export function ProTeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: rawTeams, isLoading: teamsLoading } = useQuery<ProTeamSummary[]>({
    queryKey: proKeys.teams(),
    enabled: !!user?.id,
    staleTime: PRO_TEAMS_STALE_MS,
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/pro/teams", { credentials: "include", signal });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const teams = useMemo(() => rawTeams ?? [], [rawTeams]);

  const [teamId, setTeamIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setTeamId = useCallback((id: string) => {
    setTeamIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (teams.length === 0) return;
    const valid = teamId && teams.some((t) => t.id === teamId);
    if (valid) return;
    const next = teams[0].id;
    setTeamIdState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, [teamId, teams]);

  const activeTeam = useMemo(() => {
    if (teams.length === 0) return null;
    if (teamId) {
      const found = teams.find((t) => t.id === teamId);
      if (found) return found;
    }
    return teams[0];
  }, [teamId, teams]);

  const sportProfile = useMemo(
    () => getSportProfile(activeTeam?.sport ?? ""),
    [activeTeam?.sport],
  );

  const value = useMemo(
    () => ({
      teamId,
      setTeamId,
      teams,
      teamsLoading,
      activeTeam,
      sportProfile,
    }),
    [teamId, teams, teamsLoading, activeTeam, sportProfile],
  );

  return <ProTeamContext.Provider value={value}>{children}</ProTeamContext.Provider>;
}

export function useProTeam(): Ctx {
  const ctx = useContext(ProTeamContext);
  if (!ctx) {
    return {
      teamId: null,
      setTeamId: () => {},
      teams: [],
      teamsLoading: false,
      activeTeam: null,
      sportProfile: getSportProfile(""),
    };
  }
  return ctx;
}
