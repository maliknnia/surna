import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

type UnreadRow = { unread_count?: number };

function normalizeDm(payload: unknown): UnreadRow[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray((payload as { conversations?: unknown }).conversations)) {
    return (payload as { conversations: UnreadRow[] }).conversations;
  }
  return [];
}

function normalizeGroups(payload: unknown): UnreadRow[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray((payload as { groups?: unknown }).groups)) {
    return (payload as { groups: UnreadRow[] }).groups;
  }
  return [];
}

/** Total unread DMs + group threads from messenger APIs */
export function useUnreadMessageCount(enabled = true) {
  const { isAuthenticated } = useAuth();
  const { data: dmData } = useQuery<UnreadRow[]>({
    queryKey: ["/api/messenger/dm/conversations"],
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch("/api/messenger/dm/conversations", { credentials: "include" });
      if (!res.ok) return [];
      return normalizeDm(await res.json());
    },
  });
  const { data: groupData } = useQuery<UnreadRow[]>({
    queryKey: ["/api/messenger/groups"],
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch("/api/messenger/groups", { credentials: "include" });
      if (!res.ok) return [];
      return normalizeGroups(await res.json());
    },
  });
  const dm = (dmData ?? []).reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
  const groups = (groupData ?? []).reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
  return dm + groups;
}
