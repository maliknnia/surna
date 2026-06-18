import { useQuery } from "@tanstack/react-query";
import type { Team } from "@shared/schema";
import {
  demoTeamToApiRow,
  getDemoTeam,
  getDemoTeamMembers,
  isDemoTeamId,
  normalizeDemoTeamId,
} from "@/lib/demoTeams";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export function useTeam(id?: string) {
  const normalizedId = id ? normalizeDemoTeamId(id) : undefined;

  return useQuery<Team & { isDemo?: boolean; members?: ReturnType<typeof getDemoTeamMembers> }>({
    queryKey: ["/api/teams", normalizedId],
    queryFn: async () => {
      if (!normalizedId) throw new Error("Missing team id");
      if (isDemoTeamId(normalizedId)) {
        const demo = getDemoTeam(normalizedId);
        if (!demo) throw new Error("Team not found");
        return {
          ...demoTeamToApiRow(demo),
          members: getDemoTeamMembers(normalizedId),
        };
      }
      return getJSON(`/api/teams/${normalizedId}`);
    },
    enabled: !!normalizedId,
    retry: (failureCount, _error) => {
      if (normalizedId && isDemoTeamId(normalizedId)) return false;
      return failureCount < 2;
    },
  });
}
