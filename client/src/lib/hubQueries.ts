import type { QueryClient } from "@tanstack/react-query";

/** Invalidate list + summary queries after creating or editing hub-owned entities. */
export function invalidateMyHubQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["/api/my-hub/summary"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/events/me/organized"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/teams/me/managed"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/places/me/owned"] }),
    queryClient.invalidateQueries({ queryKey: ["events"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/teams"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/places"] }),
    queryClient.invalidateQueries({ queryKey: ["challenges-list"] }),
  ]);
}
