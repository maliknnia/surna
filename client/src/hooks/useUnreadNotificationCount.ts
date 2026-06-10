import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

/** Unread count from GET /api/notifications/unread-count */
export function useUnreadNotificationCount(enabled = true) {
  const { isAuthenticated } = useAuth();
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
  });
  return data?.count ?? 0;
}
