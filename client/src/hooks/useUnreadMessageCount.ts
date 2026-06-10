import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

type DmConversation = { unread_count?: number };

function normalizeConversations(payload: unknown): DmConversation[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray((payload as { conversations?: unknown }).conversations)) {
    return (payload as { conversations: DmConversation[] }).conversations;
  }
  return [];
}

/** Total unread DMs from GET /api/messenger/dm/conversations */
export function useUnreadMessageCount(enabled = true) {
  const { isAuthenticated } = useAuth();
  const { data } = useQuery<DmConversation[]>({
    queryKey: ["/api/messenger/dm/conversations"],
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch("/api/messenger/dm/conversations", { credentials: "include" });
      if (!res.ok) return [];
      return normalizeConversations(await res.json());
    },
  });
  return (data ?? []).reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
}
