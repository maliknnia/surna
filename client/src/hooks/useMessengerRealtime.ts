import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getMessengerSocket, type Socket } from "@/lib/messengerSocket";

type SyncPayload = { type?: "dm" | "group"; conversationId?: string; groupId?: string };

/**
 * Connects messenger Socket.IO and invalidates React Query caches on live events.
 * Mount once at the inbox shell (MessengerApp).
 */
export function useMessengerRealtime(enabled = true) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    let cancelled = false;
    let socket: Socket | null = null;
    const detach: Array<() => void> = [];

    const invalidateInbox = () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/messenger/dm/conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/messenger/groups"] });
    };

    const invalidateDmThread = (conversationId?: string) => {
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: [`/api/messenger/dm/messages`, conversationId] });
      }
    };

    const invalidateGroupThread = (groupId?: string) => {
      if (groupId) {
        void queryClient.invalidateQueries({ queryKey: [`/api/messenger/groups/${groupId}/messages`] });
      }
    };

    void (async () => {
      socket = await getMessengerSocket();
      if (cancelled || !socket) return;

      const bind = (event: string, handler: (...args: unknown[]) => void) => {
        socket!.on(event, handler);
        detach.push(() => socket?.off(event, handler));
      };

      bind("messenger:sync", (payload: unknown) => {
        const p = payload as SyncPayload;
        invalidateInbox();
        if (p.type === "dm") invalidateDmThread(p.conversationId);
        if (p.type === "group") invalidateGroupThread(p.groupId);
      });

      bind("dm:new", (payload: unknown) => {
        const p = payload as { conversationId?: string };
        invalidateInbox();
        invalidateDmThread(p.conversationId);
      });

      bind("group:new", (payload: unknown) => {
        const p = payload as { groupId?: string };
        invalidateInbox();
        invalidateGroupThread(p.groupId);
      });

      bind("dm:read", () => invalidateInbox());
      bind("group:read", () => invalidateInbox());
    })();

    return () => {
      cancelled = true;
      detach.forEach((fn) => fn());
    };
  }, [enabled, isAuthenticated, queryClient]);
}
