import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export function useProTeam() {
  const { user } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  const userTeams = teams.filter((t: any) =>
    t.captainId === (user as any)?.id || t.createdBy === (user as any)?.id
  );

  const teamId = selectedTeamId || userTeams[0]?.id || "";

  return { teamId, setSelectedTeamId, userTeams, allTeams: teams };
}
