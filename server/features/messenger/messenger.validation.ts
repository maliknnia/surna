// server/features/messenger/messenger.validation.ts
import { z } from "zod";

// DM Validation
export const createDMConversationSchema = z.object({
  peerId: z.string().min(1, "Peer ID is required"),
});

export const sendDMMessageSchema = z.object({
  conversationId: z.string().optional(),
  peerId: z.string().optional(),
  body: z.string().optional(),
  mediaId: z.string().optional(),
}).refine(
  (data) => data.conversationId || data.peerId,
  "Either conversationId or peerId is required"
).refine(
  (data) => data.body || data.mediaId,
  "Either body or mediaId is required"
);

export const markDMReadSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
});

// Group Validation
export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name too long"),
  description: z.string().max(500, "Description too long").optional(),
  memberIds: z.array(z.string().min(1)).max(50).optional(),
  instantTeamId: z.string().min(1).optional(),
  instantGameId: z.string().min(1).optional(),
}).transform((data) => ({
  ...data,
  instantTeamId: data.instantTeamId ?? data.instantGameId,
}));

export const updateGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name too long").optional(),
  description: z.string().max(500, "Description too long").optional(),
});

export const sendGroupMessageSchema = z.object({
  body: z.string().optional(),
  mediaId: z.string().optional(),
}).refine(
  (data) => data.body || data.mediaId,
  "Either body or mediaId is required"
);

export const addGroupMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["member", "admin"]).default("member"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["member", "admin", "owner"]),
});

export const inviteToGroupSchema = z.object({
  inviteeId: z.string().min(1, "Invitee ID is required"),
});

// Settings Validation
export const updateMessengerSettingsSchema = z.object({
  allow_message_requests: z.boolean().optional(),
  call_permission: z.enum(["everyone", "following", "none"]).optional(),
  read_receipts: z.boolean().optional(),
});

// Query Validation
export const messagesQuerySchema = z.object({
  conversationId: z.string().optional(),
  groupId: z.string().optional(),
  cursorCreatedAt: z.string().optional(),
  cursorId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});
