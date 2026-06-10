import type { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import jwt from "jsonwebtoken";

let io: Server | null = null;

export function initIO(httpServer: HTTPServer) {
  // transports: ['websocket'] only â€” avoids the need for sticky sessions
  // when running multiple Autoscale instances. The Redis adapter (below)
  // takes care of cross-instance event fan-out. Long-polling fallback is
  // intentionally disabled to keep load balancing stateless.
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET","POST","PATCH"] },
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const url = process.env.REDIS_URL;
  if (url) {
    const pub = createClient({ url, socket: { connectTimeout: 5000, reconnectStrategy: (retries) => retries > 1 ? false as any : 1000 } });
    const sub = pub.duplicate();
    pub.on('error', () => {});
    sub.on('error', () => {});
    Promise.all([pub.connect(), sub.connect()]).then(() => {
      io!.adapter(createAdapter(pub, sub));
      console.log("ðŸ”Œ [socket] Redis adapter ready");
    }).catch(() => {
      console.warn("âš ï¸ [socket] Redis unavailable, using default adapter");
      try { pub.disconnect(); } catch {}
      try { sub.disconnect(); } catch {}
    });
  }

  const socketServer = io;

  // Auth + room join
  socketServer.use((socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string) || "";
      if (!token?.startsWith("Bearer ")) return next(new Error("UNAUTHORIZED"));
      const raw = token.slice(7);
      const payload = jwt.verify(raw, process.env.JWT_SECRET! ) as any;
      (socket as any).user = { id: payload.sub, username: payload.username };
      return next();
    } catch (e) {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  socketServer.on("connection", (socket) => {
    const userId = (socket as any).user.id as string;
    const room = `user:${userId}`;
    socket.join(room);
    socket.emit("connected", { room });
    console.log(`ðŸ”— [socket] User ${userId} connected to ${room}`);

    // ========== MESSENGER EVENTS ==========

    // Room management
    socket.on("dm:join", ({ conversationId }) => {
      socket.join(`dm:${conversationId}`);
    });

    socket.on("group:join", ({ groupId }) => {
      socket.join(`group:${groupId}`);
    });

    socket.on("group:leave", ({ groupId }) => {
      socket.leave(`group:${groupId}`);
    });

    // ========== WEBRTC CALL SIGNALING ==========

    // Call invite (1:1 calls)
    socket.on("call:invite", ({ toUserId, conversationId, media }) => {
      socketServer.to(`user:${toUserId}`).emit("call:ring", { 
        fromUserId: userId, 
        conversationId, 
        media, 
        at: Date.now() 
      });
    });

    socket.on("call:reject", ({ toUserId, conversationId }) => {
      socketServer.to(`user:${toUserId}`).emit("call:rejected", { 
        fromUserId: userId, 
        conversationId 
      });
    });

    socket.on("call:offer", (payload) => {
      socketServer.to(`user:${payload.toUserId}`).emit("call:offer", { 
        ...payload, 
        fromUserId: userId 
      });
    });

    socket.on("call:answer", (payload) => {
      socketServer.to(`user:${payload.toUserId}`).emit("call:answer", { 
        ...payload, 
        fromUserId: userId 
      });
    });

    socket.on("call:candidate", (payload) => {
      socketServer.to(`user:${payload.toUserId}`).emit("call:candidate", { 
        ...payload, 
        fromUserId: userId 
      });
    });

    socket.on("call:end", ({ toUserId, conversationId }) => {
      socketServer.to(`user:${toUserId}`).emit("call:end", { 
        fromUserId: userId, 
        conversationId 
      });
    });

    socket.on("disconnect", () => {
      console.log(`ðŸ”Œ [socket] User ${userId} disconnected`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
