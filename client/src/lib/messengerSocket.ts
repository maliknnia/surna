import { io, type Socket } from "socket.io-client";

export type { Socket };

let socket: Socket | null = null;
let connectPromise: Promise<Socket | null> | null = null;

async function fetchRealtimeToken(): Promise<string | null> {
  const res = await fetch("/api/messenger/realtime-token", { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as { token?: string };
  return data.token ?? null;
}

/** Shared Socket.IO connection for messenger (lazy, credential-backed). */
export async function getMessengerSocket(): Promise<Socket | null> {
  if (socket?.connected) return socket;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      const token = await fetchRealtimeToken();
      if (!token) return null;

      const next = io({
        transports: ["websocket"],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1500,
      });

      await new Promise<void>((resolve, reject) => {
        const onConnect = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("socket connect failed"));
        };
        const cleanup = () => {
          next.off("connect", onConnect);
          next.off("connect_error", onError);
        };
        next.on("connect", onConnect);
        next.on("connect_error", onError);
        setTimeout(() => {
          cleanup();
          reject(new Error("socket connect timeout"));
        }, 8000);
      });

      socket = next;
      return socket;
    } catch {
      socket = null;
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

export function joinDmRoom(conversationId: string) {
  void getMessengerSocket().then((s) => {
    s?.emit("dm:join", { conversationId });
  });
}

export function leaveDmRoom(conversationId: string) {
  socket?.emit("dm:leave", { conversationId });
}

export function joinGroupRoom(groupId: string) {
  void getMessengerSocket().then((s) => {
    s?.emit("group:join", { groupId });
  });
}

export function leaveGroupRoom(groupId: string) {
  socket?.emit("group:leave", { groupId });
}

export function disconnectMessengerSocket() {
  socket?.disconnect();
  socket = null;
  connectPromise = null;
}
