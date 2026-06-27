// server/features/messenger/messenger.router.ts
import { Router } from "express";
import { MessengerService } from "./messenger.service";
import { 
  createDMConversationSchema,
  sendDMMessageSchema,
  markDMReadSchema,
  createGroupSchema,
  updateGroupSchema,
  sendGroupMessageSchema,
  addGroupMemberSchema,
  updateMemberRoleSchema,
  inviteToGroupSchema,
  updateMessengerSettingsSchema,
  messagesQuerySchema
} from "./messenger.validation";
import { authMiddleware } from "../../middleware/auth";
import { bridgeSessionUser } from "../../middleware/bridgeSessionUser";
import { requireEmailVerified } from "../../middleware/requireEmailVerified";
import { messengerRateLimit, sendMessageRateLimit } from "../../middleware/messengerRateLimit";

export function createMessengerRouter(io: any): Router {
  const router = Router();
  const messengerService = new MessengerService(io);

  // All routes require authentication (JWT bearer and/or cookie session)
  router.use(authMiddleware());
  router.use(bridgeSessionUser);
  
  // Apply messenger-specific rate limiting
  router.use(messengerRateLimit);

  // ========== DM ENDPOINTS ==========

  // POST /api/messenger/dm/conversations { peerId } â†’ { id }
  router.post("/dm/conversations", requireEmailVerified, async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { peerId } = createDMConversationSchema.parse(req.body);
      const conversation = await messengerService.ensureDMConversation(req.jwtUser.id, peerId);
      res.json({ id: conversation.id });
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/messenger/dm/conversations → list my DM threads
  router.get("/dm/conversations", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const conversations = await messengerService.getDMConversations(req.jwtUser.id);
      res.json({ conversations });
    } catch (error: any) {
      next(error);
    }
  });

  router.get("/recent-users", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const users = await messengerService.getRecentUsers(req.jwtUser.id);
      res.json({ users });
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/messenger/dm/messages?conversationId=&cursorCreatedAt=&cursorId=&limit=
  router.get("/dm/messages", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { conversationId, cursorCreatedAt, cursorId, limit } = messagesQuerySchema.parse(req.query);
      
      if (!conversationId) {
        return res.status(400).json({ message: "conversationId is required" });
      }

      const result = await messengerService.getDMMessages(
        conversationId,
        req.jwtUser.id,
        cursorCreatedAt,
        cursorId,
        limit
      );
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/messenger/dm/messages { conversationId? | peerId?, body? | mediaId? }
  router.post("/dm/messages", requireEmailVerified, sendMessageRateLimit, async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const data = sendDMMessageSchema.parse(req.body);
      const message = await messengerService.sendDMMessage(req.jwtUser.id, data);
      res.json(message);
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/messenger/dm/read { conversationId }
  router.post("/dm/read", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { conversationId } = markDMReadSchema.parse(req.body);
      await messengerService.markDMRead(conversationId, req.jwtUser.id);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/messenger/dm/conversations/:conversationId/settings
  router.get("/dm/conversations/:conversationId/settings", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) return res.status(401).json({ message: "Authentication required" });
      const settings = await messengerService.getDMConversationSettings(req.params.conversationId, req.jwtUser.id);
      res.json(settings);
    } catch (error: any) { next(error); }
  });

  // PATCH /api/messenger/dm/conversations/:conversationId/settings { disappearing_enabled? }
  router.patch("/dm/conversations/:conversationId/settings", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) return res.status(401).json({ message: "Authentication required" });
      const settings = await messengerService.updateDMConversationSettings(req.params.conversationId, req.jwtUser.id, {
        disappearing_enabled: req.body?.disappearing_enabled,
      });
      res.json(settings);
    } catch (error: any) { next(error); }
  });

  // POST /api/messenger/dm/conversations/:conversationId/pin { messageId? }
  router.post("/dm/conversations/:conversationId/pin", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) return res.status(401).json({ message: "Authentication required" });
      await messengerService.pinDMMessage(req.params.conversationId, req.jwtUser.id, req.body?.messageId || null);
      res.json({ success: true });
    } catch (error: any) { next(error); }
  });

  // POST /api/messenger/dm/forward { sourceMessageIds, targetConversationId }
  router.post("/dm/forward", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) return res.status(401).json({ message: "Authentication required" });
      const sourceMessageIds = Array.isArray(req.body?.sourceMessageIds) ? req.body.sourceMessageIds : [];
      const targetConversationId = String(req.body?.targetConversationId || "");
      await messengerService.forwardDMMessages(req.jwtUser.id, sourceMessageIds, targetConversationId);
      res.json({ success: true });
    } catch (error: any) { next(error); }
  });

  // DELETE /api/messenger/dm/messages/bulk { conversationId, messageIds }
  router.delete("/dm/messages/bulk", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) return res.status(401).json({ message: "Authentication required" });
      const conversationId = String(req.body?.conversationId || "");
      const messageIds = Array.isArray(req.body?.messageIds) ? req.body.messageIds : [];
      await messengerService.bulkDeleteDMMessages(req.jwtUser.id, conversationId, messageIds);
      res.json({ success: true });
    } catch (error: any) { next(error); }
  });

  // ========== GROUP ENDPOINTS ==========

  // POST /api/messenger/groups { name, description? } â†’ create + owner membership
  router.post("/groups", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const data = createGroupSchema.parse(req.body);
      const group = await messengerService.createGroup(req.jwtUser.id, data);
      res.json(group);
    } catch (error: any) {
      next(error);
    }
  });

  // PATCH /api/messenger/groups/:groupId { name?, description? }
  router.patch("/groups/:groupId", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const data = updateGroupSchema.parse(req.body);
      const group = await messengerService.updateGroup(req.params.groupId, req.jwtUser.id, data);
      res.json(group);
    } catch (error: any) {
      next(error);
    }
  });

  // DELETE /api/messenger/groups/:groupId
  router.delete("/groups/:groupId", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      await messengerService.deleteGroup(req.params.groupId, req.jwtUser.id);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/messenger/groups â†’ groups I'm in
  router.get("/groups", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const groups = await messengerService.getUserGroups(req.jwtUser.id);
      res.json({ groups });
    } catch (error: any) {
      next(error);
    }
  });

  router.get("/groups/:groupId", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const group = await messengerService.getGroupDetails(req.params.groupId, req.jwtUser.id);
      res.json(group);
    } catch (error: any) {
      next(error);
    }
  });

  router.get("/groups/:groupId/members", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const members = await messengerService.getGroupMembers(req.params.groupId, req.jwtUser.id);
      res.json({ members });
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/messenger/groups/:groupId/messages?cursorCreatedAt=&cursorId=&limit=
  router.get("/groups/:groupId/messages", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { cursorCreatedAt, cursorId, limit } = messagesQuerySchema.parse(req.query);
      const result = await messengerService.getGroupMessages(
        req.params.groupId,
        req.jwtUser.id,
        cursorCreatedAt,
        cursorId,
        limit
      );
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/messenger/groups/:groupId/messages { body? | mediaId? }
  router.post("/groups/:groupId/messages", requireEmailVerified, sendMessageRateLimit, async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const data = sendGroupMessageSchema.parse(req.body);
      const message = await messengerService.sendGroupMessage(req.params.groupId, req.jwtUser.id, data);
      res.json(message);
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/messenger/groups/:groupId/read
  router.post("/groups/:groupId/read", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      await messengerService.markGroupRead(req.params.groupId, req.jwtUser.id);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // ========== MEMBERSHIP ENDPOINTS ==========

  // POST /api/messenger/groups/:groupId/members { userId, role? }
  router.post("/groups/:groupId/members", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { userId, role } = addGroupMemberSchema.parse(req.body);
      await messengerService.addGroupMember(req.params.groupId, req.jwtUser.id, userId, role);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // DELETE /api/messenger/groups/:groupId/members/:userId
  router.delete("/groups/:groupId/members/:userId", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      await messengerService.removeGroupMember(req.params.groupId, req.jwtUser.id, req.params.userId);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // PATCH /api/messenger/groups/:groupId/members/:userId { role }
  router.patch("/groups/:groupId/members/:userId", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { role } = updateMemberRoleSchema.parse(req.body);
      await messengerService.updateMemberRole(req.params.groupId, req.jwtUser.id, req.params.userId, role);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // ========== INVITES & REQUESTS ENDPOINTS ==========

  // POST /api/messenger/groups/:groupId/invites { inviteeId }
  router.post("/groups/:groupId/invites", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { inviteeId } = inviteToGroupSchema.parse(req.body);
      const invite = await messengerService.inviteToGroup(req.params.groupId, req.jwtUser.id, inviteeId);
      res.json(invite);
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/messenger/groups/:groupId/invites/:inviteeId/accept
  router.post("/groups/:groupId/invites/:inviteeId/accept", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.params.inviteeId !== req.jwtUser.id) {
        return res.status(403).json({ message: "Can only accept your own invites" });
      }
      await messengerService.acceptGroupInvite(req.params.groupId, req.jwtUser.id);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/messenger/groups/:groupId/invites/:inviteeId/decline
  router.post("/groups/:groupId/invites/:inviteeId/decline", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.params.inviteeId !== req.jwtUser.id) {
        return res.status(403).json({ message: "Can only decline your own invites" });
      }
      await messengerService.declineGroupInvite(req.params.groupId, req.jwtUser.id);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/messenger/groups/:groupId/requests
  router.post("/groups/:groupId/requests", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const request = await messengerService.requestToJoinGroup(req.params.groupId, req.jwtUser.id);
      res.json(request);
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/messenger/groups/:groupId/requests/:requestId/approve
  router.post("/groups/:groupId/requests/:requestId/approve", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      await messengerService.approveJoinRequest(req.params.requestId, req.jwtUser.id);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/messenger/groups/:groupId/requests/:requestId/deny
  router.post("/groups/:groupId/requests/:requestId/deny", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      await messengerService.denyJoinRequest(req.params.requestId, req.jwtUser.id);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // ========== REALTIME ==========

  // GET /api/messenger/realtime-token — short-lived JWT for Socket.IO (session auth)
  router.get("/realtime-token", async (req: any, res, next) => {
    try {
      if (!req.jwtUser?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const jwt = await import("jsonwebtoken");
      const { resolveJwtSecret } = await import("../../lib/productionSecurity");
      const token = jwt.sign(
        { sub: req.jwtUser.id, username: req.jwtUser.username ?? "user" },
        resolveJwtSecret(),
        { expiresIn: "15m" },
      );
      res.json({ token: `Bearer ${token}` });
    } catch (error: unknown) {
      next(error);
    }
  });

  // ========== SETTINGS ENDPOINTS ==========

  // GET /api/messenger/settings/me
  router.get("/settings/me", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const settings = await messengerService.getMessengerSettings(req.jwtUser.id);
      res.json(settings);
    } catch (error: any) {
      next(error);
    }
  });

  // PATCH /api/messenger/settings/me { allow_message_requests?, call_permission?, read_receipts? }
  router.patch("/settings/me", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const updates = updateMessengerSettingsSchema.parse(req.body);
      const settings = await messengerService.updateMessengerSettings(req.jwtUser.id, updates);
      res.json(settings);
    } catch (error: any) {
      next(error);
    }
  });

  return router;
}
