import { useQuery } from "@tanstack/react-query";

export interface MyHubSummary {
  upcomingEvents: number;
  activeTeams: number;
  activePlaces: number;
  activeChallenges: number;
  pendingRequests: number;
  unreadMessages: number;
  generatedAt: string;
}

export function useMyHubSummary() {
  return useQuery<MyHubSummary>({
    queryKey: ["/api/my-hub/summary"],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
