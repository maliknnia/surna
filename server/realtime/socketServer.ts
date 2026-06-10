// Stage 4: Real-Time WebSocket Server with Scaling
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Redis } from 'ioredis';
import { isAuthenticated } from '../replitAuth';
import { db } from '../db';
import { messages, events, posts } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

// Redis connection for pub/sub
let redisClient: Redis | null = null;
let redisPub: Redis | null = null;
let redisSub: Redis | null = null;

// Initialize Redis connections if available
const redisOpts = {
  maxRetriesPerRequest: 1,
  retryStrategy: (times: number) => times > 1 ? null : 1000,
  reconnectOnError: () => false,
  connectTimeout: 5000,
  lazyConnect: true,
};

async function initializeRedis() {
  try {
    if (process.env.REDIS_URL) {
      redisClient = new Redis(process.env.REDIS_URL, redisOpts);
      redisPub = new Redis(process.env.REDIS_URL, redisOpts);
      redisSub = new Redis(process.env.REDIS_URL, redisOpts);
      redisClient.on('error', () => {});
      redisPub.on('error', () => {});
      redisSub.on('error', () => {});
      await Promise.all([redisClient.connect(), redisPub.connect(), redisSub.connect()]);
      console.log('âœ… Redis connected for WebSocket scaling');
      return true;
    } else {
      console.log('âš ï¸ No REDIS_URL found, using in-memory scaling');
      return false;
    }
  } catch (error) {
    console.warn('âš ï¸ Redis connection failed, using in-memory scaling');
    redisClient?.disconnect(); redisPub?.disconnect(); redisSub?.disconnect();
    redisClient = null; redisPub = null; redisSub = null;
    return false;
  }
}

// Message interface
interface ChatMessage {
  id?: string;
  senderId: string;
  receiverId?: string;
  eventId?: string;
  teamId?: string;
  content: string;
  type: 'direct' | 'event' | 'team' | 'broadcast';
  timestamp: Date;
  sequenceNumber?: number;
}

interface LiveUpdate {
  type: 'score' | 'rsvp' | 'event' | 'post';
  eventId?: string;
  teamId?: string;
  data: any;
  timestamp: Date;
}

// Connected users tracking
const connectedUsers = new Map<string, { socketId: string; userId: string; rooms: Set<string> }>();
const userSockets = new Map<string, Set<string>>();

// Message sequence tracking
let messageSequence = 0;

export function setupWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Initialize Redis
  initializeRedis();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Simplified auth check - in production use proper JWT validation
      const userId = socket.handshake.auth.userId;
      if (!userId) {
        return next(new Error('Invalid user'));
      }

      (socket as any).userId = userId;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    console.log(`ðŸ”Œ User ${userId} connected with socket ${socket.id}`);

    // Track connected user
    connectedUsers.set(socket.id, {
      socketId: socket.id,
      userId,
      rooms: new Set()
    });

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Send user their missed messages
    sendMissedMessages(socket, userId);

    // Join user to their personal room
    socket.join(`user_${userId}`);

    // Chat message handling
    socket.on('sendMessage', async (data: ChatMessage) => {
      try {
        messageSequence++;
        const message: ChatMessage = {
          ...data,
          senderId: userId,
          timestamp: new Date(),
          sequenceNumber: messageSequence
        };

        // Save message to database first (delivery guarantee)
        const [savedMessage] = await db.insert(messages).values({
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          messageType: message.type,
          metadata: {
            eventId: message.eventId,
            teamId: message.teamId,
            sequenceNumber: message.sequenceNumber,
          },
        }).returning();

        message.id = savedMessage.id;

        // Broadcast message based on type
        await broadcastMessage(io, message);

        // Acknowledge message sent
        socket.emit('messageAck', { messageId: message.id, sequenceNumber: message.sequenceNumber });

      } catch (error) {
        console.error('Message send error:', error);
        socket.emit('messageError', { error: 'Failed to send message' });
      }
    });

    // Join event room
    socket.on('joinEvent', (eventId: string) => {
      const roomName = `event_${eventId}`;
      socket.join(roomName);
      
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.rooms.add(roomName);
      }

      console.log(`ðŸ‘¥ User ${userId} joined event ${eventId}`);
      
      // Notify others in the event
      socket.to(roomName).emit('userJoinedEvent', { userId, eventId });
    });

    // Leave event room
    socket.on('leaveEvent', (eventId: string) => {
      const roomName = `event_${eventId}`;
      socket.leave(roomName);
      
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.rooms.delete(roomName);
      }

      socket.to(roomName).emit('userLeftEvent', { userId, eventId });
    });

    // Join team room
    socket.on('joinTeam', (teamId: string) => {
      const roomName = `team_${teamId}`;
      socket.join(roomName);
      
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.rooms.add(roomName);
      }

      console.log(`ðŸ† User ${userId} joined team ${teamId}`);
    });

    // Live updates subscription
    socket.on('subscribeLiveUpdates', (filters: { eventIds?: string[]; teamIds?: string[] }) => {
      if (filters.eventIds) {
        filters.eventIds.forEach(eventId => {
          socket.join(`live_event_${eventId}`);
        });
      }
      
      if (filters.teamIds) {
        filters.teamIds.forEach(teamId => {
          socket.join(`live_team_${teamId}`);
        });
      }

      console.log(`ðŸ“¡ User ${userId} subscribed to live updates`);
    });

    // Typing indicators
    socket.on('typing', (data: { eventId?: string; teamId?: string; isTyping: boolean }) => {
      const room = data.eventId ? `event_${data.eventId}` : 
                   data.teamId ? `team_${data.teamId}` : null;
      
      if (room) {
        socket.to(room).emit('userTyping', { userId, isTyping: data.isTyping });
      }
    });

    // Live Streaming handlers
    socket.on('stream:join', async (streamId: string) => {
      try {
        const { storage } = await import('../storage');
        await storage.joinStream(streamId, userId);
        socket.join(`stream_${streamId}`);
        
        // Get updated viewer count
        const viewers = await storage.getStreamViewers(streamId);
        io.to(`stream_${streamId}`).emit('stream:viewerUpdate', {
          streamId,
          viewerCount: viewers.length,
          viewers: viewers.map(v => ({ id: v.id, username: v.username, displayName: v.displayName }))
        });
        
        console.log(`ðŸ“º User ${userId} joined stream ${streamId}`);
      } catch (error) {
        console.error('Error joining stream:', error);
      }
    });

    socket.on('stream:leave', async (streamId: string) => {
      try {
        const { storage } = await import('../storage');
        await storage.leaveStream(streamId, userId);
        socket.leave(`stream_${streamId}`);
        
        // Get updated viewer count
        const viewers = await storage.getStreamViewers(streamId);
        io.to(`stream_${streamId}`).emit('stream:viewerUpdate', {
          streamId,
          viewerCount: viewers.length,
          viewers: viewers.map(v => ({ id: v.id, username: v.username, displayName: v.displayName }))
        });
        
        console.log(`ðŸ“º User ${userId} left stream ${streamId}`);
      } catch (error) {
        console.error('Error leaving stream:', error);
      }
    });

    socket.on('stream:comment', async (data: { streamId: string; content: string }) => {
      try {
        const { storage } = await import('../storage');
        const comment = await storage.addStreamComment(data.streamId, userId, data.content);
        
        // Fetch user data directly from database
        const { db } = await import('../db');
        const { users } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        
        // Broadcast comment to all viewers
        io.to(`stream_${data.streamId}`).emit('stream:newComment', {
          streamId: data.streamId,
          comment: {
            ...comment,
            user: {
              id: userId,
              username: user?.username || 'Unknown',
              displayName: user?.displayName || user?.username || 'Unknown',
              profileImageUrl: user?.profileImageUrl || null
            }
          }
        });
      } catch (error) {
        console.error('Error adding stream comment:', error);
      }
    });

    socket.on('stream:reaction', async (data: { streamId: string; reactionType: string }) => {
      try {
        const { storage } = await import('../storage');
        await storage.addStreamReaction(data.streamId, userId, data.reactionType);
        
        // Broadcast reaction to all viewers
        io.to(`stream_${data.streamId}`).emit('stream:newReaction', {
          streamId: data.streamId,
          userId,
          reactionType: data.reactionType
        });
      } catch (error) {
        console.error('Error adding stream reaction:', error);
      }
    });

    // Heartbeat handling
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Disconnect handling
    socket.on('disconnect', (reason) => {
      console.log(`ðŸ”Œ User ${userId} disconnected: ${reason}`);
      
      // Clean up tracking
      connectedUsers.delete(socket.id);
      
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
        }
      }

      // Notify rooms about disconnect
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.to(room).emit('userDisconnected', { userId });
        }
      });
    });
  });

  // Redis pub/sub for multi-instance scaling
  if (redisSub) {
    redisSub.subscribe('socket_events');
    redisSub.on('message', (channel, message) => {
      if (channel === 'socket_events') {
        const event = JSON.parse(message);
        handleRedisEvent(io, event);
      }
    });
  }

  return io;
}

// Broadcast message to appropriate rooms
async function broadcastMessage(io: SocketIOServer, message: ChatMessage) {
  try {
    let rooms: string[] = [];

    switch (message.type) {
      case 'direct':
        if (message.receiverId) {
          rooms = [`user_${message.receiverId}`];
        }
        break;
      case 'event':
        if (message.eventId) {
          rooms = [`event_${message.eventId}`];
        }
        break;
      case 'team':
        if (message.teamId) {
          rooms = [`team_${message.teamId}`];
        }
        break;
      case 'broadcast':
        rooms = ['all_users'];
        break;
    }

    // Send to local rooms
    rooms.forEach(room => {
      io.to(room).emit('newMessage', message);
    });

    // Publish to Redis for other instances
    if (redisPub) {
      await redisPub.publish('socket_events', JSON.stringify({
        type: 'message',
        data: message,
        rooms
      }));
    }

  } catch (error) {
    console.error('Broadcast error:', error);
  }
}

// Broadcast live updates
export async function broadcastLiveUpdate(io: SocketIOServer, update: LiveUpdate) {
  try {
    let rooms: string[] = [];

    if (update.eventId) {
      rooms.push(`live_event_${update.eventId}`);
    }
    if (update.teamId) {
      rooms.push(`live_team_${update.teamId}`);
    }

    // Send to local rooms
    rooms.forEach(room => {
      io.to(room).emit('liveUpdate', update);
    });

    // Publish to Redis for other instances
    if (redisPub) {
      await redisPub.publish('socket_events', JSON.stringify({
        type: 'live_update',
        data: update,
        rooms
      }));
    }

  } catch (error) {
    console.error('Live update broadcast error:', error);
  }
}

// Handle Redis events from other instances
function handleRedisEvent(io: SocketIOServer, event: any) {
  switch (event.type) {
    case 'message':
      event.rooms.forEach((room: string) => {
        io.to(room).emit('newMessage', event.data);
      });
      break;
    case 'live_update':
      event.rooms.forEach((room: string) => {
        io.to(room).emit('liveUpdate', event.data);
      });
      break;
  }
}

// Send missed messages to reconnecting user
async function sendMissedMessages(socket: any, userId: string) {
  try {
    // Get messages since user was last online (simplified)
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.receiverId, userId))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    if (recentMessages.length > 0) {
      socket.emit('missedMessages', recentMessages);
    }
  } catch (error) {
    console.error('Failed to send missed messages:', error);
  }
}

// Get connection stats
export function getConnectionStats() {
  return {
    totalConnections: connectedUsers.size,
    uniqueUsers: userSockets.size,
    messageSequence,
    redisConnected: !!redisClient,
  };
}
