// server/features/messenger/messenger.service.ts
import { messengerRepo, type DMConversation, type DMMessage, type GroupConversation, type GroupMessage } from "./messenger.repo";

export class MessengerService {
  constructor(private io: any) {}

  // DM Services
  async ensureDMConversation(userA: string, userB: string): Promise<DMConversation> {
    if (userA === userB) {
      throw new Error("Cannot create conversation with yourself");
    }
    return messengerRepo.ensureDMConversation(userA, userB);
  }

  async getDMConversations(userId: string): Promise<DMConversation[]> {
    return messengerRepo.getDMConversations(userId);
  }

  async getDMMessages(
    conversationId: string,
    userId: string,
    cursorCreatedAt?: string,
    cursorId?: string,
    limit: number = 20
  ): Promise<{ items: DMMessage[]; nextCursor?: { cursorCreatedAt: string; cursorId: string } }> {
    // Verify user is part of conversation
    const conversations = await messengerRepo.getDMConversations(userId);
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    const messages = await messengerRepo.getDMMessages(conversationId, cursorCreatedAt, cursorId, limit + 1);
    
    const items = messages.slice(0, limit);
    const nextCursor = messages.length > limit
      ? { cursorCreatedAt: messages[limit].created_at, cursorId: messages[limit].id }
      : undefined;

    return { items: items.reverse(), nextCursor }; // Reverse to show oldest first
  }

  async sendDMMessage(
    userId: string,
    data: { conversationId?: string; peerId?: string; body?: string; mediaId?: string }
  ): Promise<DMMessage> {
    let conversationId = data.conversationId;

    if (!conversationId && data.peerId) {
      const conversation = await this.ensureDMConversation(userId, data.peerId);
      conversationId = conversation.id;
    }

    if (!conversationId) {
      throw new Error("No conversation specified");
    }

    const kind = data.mediaId ? "audio" : "text";
    const message = await messengerRepo.createDMMessage({
      conversation_id: conversationId,
      sender_id: userId,
      kind,
      body: data.body,
      media_id: data.mediaId,
    });

    // Emit real-time event
    this.io.to(`dm:${conversationId}`).emit("dm:new", { conversationId, message });

    return message;
  }

  async markDMRead(conversationId: string, userId: string): Promise<void> {
    // Verify user is part of conversation
    const conversations = await messengerRepo.getDMConversations(userId);
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    await messengerRepo.markDMRead(conversationId, userId);
    await messengerRepo.expireSeenMessages(conversationId, userId);

    // Emit read receipt
    this.io.to(`dm:${conversationId}`).emit("dm:read", { 
      conversationId, 
      userId, 
      at: new Date().toISOString() 
    });
  }

  async getDMConversationSettings(conversationId: string, userId: string) {
    const conversations = await messengerRepo.getDMConversations(userId);
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) throw new Error("Conversation not found or access denied");
    return messengerRepo.getDMConversationSettings(conversationId, userId);
  }

  async updateDMConversationSettings(
    conversationId: string,
    userId: string,
    updates: { disappearing_enabled?: boolean }
  ) {
    const conversations = await messengerRepo.getDMConversations(userId);
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) throw new Error("Conversation not found or access denied");
    return messengerRepo.updateDMConversationSettings(conversationId, userId, updates);
  }

  async pinDMMessage(conversationId: string, userId: string, messageId: string | null) {
    const conversations = await messengerRepo.getDMConversations(userId);
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) throw new Error("Conversation not found or access denied");
    if (!messageId) return messengerRepo.unpinDMMessage(conversationId, userId);
    const message = await messengerRepo.getDMMessageById(messageId);
    if (!message || message.conversation_id !== conversationId) throw new Error("Message not found");
    await messengerRepo.pinDMMessage(conversationId, userId, messageId);
  }

  async forwardDMMessages(userId: string, sourceMessageIds: string[], targetConversationId: string) {
    const conversations = await messengerRepo.getDMConversations(userId);
    const target = conversations.find(c => c.id === targetConversationId);
    if (!target) throw new Error("Target conversation not found");
    for (const id of sourceMessageIds) {
      const original = await messengerRepo.getDMMessageById(id);
      if (!original) continue;
      await messengerRepo.createDMMessage({
        conversation_id: targetConversationId,
        sender_id: userId,
        kind: "text",
        body: `__FORWARDED__\n${original.body || ""}`,
      });
    }
  }

  async bulkDeleteDMMessages(userId: string, conversationId: string, messageIds: string[]) {
    const conversations = await messengerRepo.getDMConversations(userId);
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) throw new Error("Conversation not found or access denied");
    await messengerRepo.bulkDeleteDMMessages(conversationId, userId, messageIds);
  }

  // Group Services
  async createGroup(
    userId: string,
    data: { name: string; description?: string; memberIds?: string[]; instantTeamId?: string },
  ): Promise<GroupConversation> {
    if (data.instantTeamId) {
      return this.createOrJoinInstantTeamGroup(userId, data as typeof data & { instantTeamId: string });
    }

    const group = await messengerRepo.createGroup({
      owner_id: userId,
      name: data.name,
      description: data.description,
    });
    const extraMembers = (data.memberIds ?? []).filter((id) => id !== userId);
    for (const memberId of extraMembers) {
      await messengerRepo.addGroupMember(group.id, memberId, "member");
    }
    return group;
  }

  private async createOrJoinInstantTeamGroup(
    userId: string,
    data: { name: string; description?: string; memberIds?: string[]; instantTeamId: string },
  ): Promise<GroupConversation> {
    const { storage } = await import("../../storage");
    await storage.ensureInstantTeamMessengerGroupColumn();

    const team = await storage.getInstantTeam(data.instantTeamId);
    if (!team) {
      throw new Error("Instant team not found");
    }

    let groupId =
      (team as { messengerGroupId?: string; messenger_group_id?: string }).messengerGroupId ??
      (team as { messenger_group_id?: string }).messenger_group_id ??
      (await storage.getInstantTeamMessengerGroupId(data.instantTeamId));

    if (groupId) {
      const existing = await messengerRepo.getGroupMember(groupId, userId);
      if (!existing) {
        await messengerRepo.addGroupMember(groupId, userId, "member");
      }
      const group = await messengerRepo.getGroupById(groupId, userId);
      if (group) return group;
      throw new Error("Group not found");
    }

    const ownerId = team.creatorId as string;
    const group = await messengerRepo.createGroup({
      owner_id: ownerId,
      name: data.name,
      description: data.description ?? `Instant Join chat · ${data.instantTeamId}`,
    });

    groupId = await storage.setInstantTeamMessengerGroupId(data.instantTeamId, group.id);

    if (groupId !== group.id) {
      const existing = await messengerRepo.getGroupMember(groupId, userId);
      if (!existing) {
        await messengerRepo.addGroupMember(groupId, userId, "member");
      }
      const existingGroup = await messengerRepo.getGroupById(groupId, userId);
      if (existingGroup) return existingGroup;
    }

    if (userId !== ownerId) {
      const member = await messengerRepo.getGroupMember(group.id, userId);
      if (!member) {
        await messengerRepo.addGroupMember(group.id, userId, "member");
      }
    }

    for (const memberId of (data.memberIds ?? []).filter((id) => id !== ownerId && id !== userId)) {
      const member = await messengerRepo.getGroupMember(group.id, memberId);
      if (!member) {
        await messengerRepo.addGroupMember(group.id, memberId, "member");
      }
    }

    const result = await messengerRepo.getGroupById(group.id, userId);
    return result ?? group;
  }

  async getGroupDetails(groupId: string, userId: string) {
    const group = await messengerRepo.getGroupById(groupId, userId);
    if (!group) throw new Error("Group not found or access denied");
    return group;
  }

  async getGroupMembers(groupId: string, userId: string) {
    const member = await messengerRepo.getGroupMember(groupId, userId);
    if (!member) throw new Error("Group not found or access denied");
    return messengerRepo.getGroupMembersWithUsers(groupId);
  }

  async getRecentUsers(userId: string, limit = 12) {
    return messengerRepo.getRecentMessagePartners(userId, limit);
  }

  async updateGroup(
    groupId: string,
    userId: string,
    data: { name?: string; description?: string }
  ): Promise<GroupConversation> {
    const member = await messengerRepo.getGroupMember(groupId, userId);
    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Error("Insufficient permissions to update group");
    }

    return messengerRepo.updateGroup(groupId, data);
  }

  async deleteGroup(groupId: string, userId: string): Promise<void> {
    const member = await messengerRepo.getGroupMember(groupId, userId);
    if (!member || member.role !== "owner") {
      throw new Error("Only group owner can delete group");
    }

    await messengerRepo.deleteGroup(groupId);
  }

  async getUserGroups(userId: string) {
    return messengerRepo.getUserGroups(userId);
  }

  /** Internal: list members without auth check (e.g. challenge group sync). */
  async listGroupMembersRaw(groupId: string) {
    return messengerRepo.getGroupMembers(groupId);
  }

  async getGroupMessages(
    groupId: string,
    userId: string,
    cursorCreatedAt?: string,
    cursorId?: string,
    limit: number = 20
  ): Promise<{ items: GroupMessage[]; nextCursor?: { cursorCreatedAt: string; cursorId: string } }> {
    // Verify user is member
    const member = await messengerRepo.getGroupMember(groupId, userId);
    if (!member) {
      throw new Error("Group not found or access denied");
    }

    const messages = await messengerRepo.getGroupMessages(groupId, cursorCreatedAt, cursorId, limit + 1);
    
    const items = messages.slice(0, limit);
    const nextCursor = messages.length > limit
      ? { cursorCreatedAt: messages[limit].created_at, cursorId: messages[limit].id }
      : undefined;

    return { items: items.reverse(), nextCursor }; // Reverse to show oldest first
  }

  async sendGroupMessage(
    groupId: string,
    userId: string,
    data: { body?: string; mediaId?: string }
  ): Promise<GroupMessage> {
    // Verify user is member
    const member = await messengerRepo.getGroupMember(groupId, userId);
    if (!member) {
      throw new Error("Group not found or access denied");
    }

    const kind = data.mediaId ? "audio" : "text";
    const message = await messengerRepo.createGroupMessage({
      group_id: groupId,
      sender_id: userId,
      kind,
      body: data.body,
      media_id: data.mediaId,
    });

    // Emit real-time event
    this.io.to(`group:${groupId}`).emit("group:new", { groupId, message });

    return message;
  }

  async markGroupRead(groupId: string, userId: string): Promise<void> {
    // Verify user is member
    const member = await messengerRepo.getGroupMember(groupId, userId);
    if (!member) {
      throw new Error("Group not found or access denied");
    }

    await messengerRepo.markGroupRead(groupId, userId);

    // Emit read receipt
    this.io.to(`group:${groupId}`).emit("group:read", { 
      groupId, 
      userId, 
      at: new Date().toISOString() 
    });
  }

  // Group Membership
  async addGroupMember(
    groupId: string,
    userId: string,
    targetUserId: string,
    role: "member" | "admin" = "member"
  ): Promise<void> {
    const member = await messengerRepo.getGroupMember(groupId, userId);
    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Error("Insufficient permissions to add members");
    }

    await messengerRepo.addGroupMember(groupId, targetUserId, role);

    // Emit member added event
    this.io.to(`group:${groupId}`).emit("group:member:add", { 
      groupId, 
      userId: targetUserId, 
      role,
      addedBy: userId 
    });
  }

  async removeGroupMember(groupId: string, userId: string, targetUserId: string): Promise<void> {
    const member = await messengerRepo.getGroupMember(groupId, userId);
    const targetMember = await messengerRepo.getGroupMember(groupId, targetUserId);

    // Users can always leave themselves
    if (userId === targetUserId) {
      if (member?.role === "owner") {
        throw new Error("Group owner cannot leave group. Transfer ownership or delete group.");
      }
      await messengerRepo.removeGroupMember(groupId, targetUserId);
    } else {
      // Only owner/admin can remove others, and owner cannot be removed
      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new Error("Insufficient permissions to remove members");
      }
      if (targetMember?.role === "owner") {
        throw new Error("Cannot remove group owner");
      }
      await messengerRepo.removeGroupMember(groupId, targetUserId);
    }

    // Emit member removed event
    this.io.to(`group:${groupId}`).emit("group:member:remove", { 
      groupId, 
      userId: targetUserId,
      removedBy: userId 
    });
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    targetUserId: string,
    role: "member" | "admin" | "owner"
  ): Promise<void> {
    const member = await messengerRepo.getGroupMember(groupId, userId);
    if (!member || member.role !== "owner") {
      throw new Error("Only group owner can change roles");
    }

    if (role === "owner") {
      // Transfer ownership
      await messengerRepo.updateMemberRole(groupId, targetUserId, "owner");
      await messengerRepo.updateMemberRole(groupId, userId, "admin");
    } else {
      await messengerRepo.updateMemberRole(groupId, targetUserId, role);
    }

    // Emit role change event
    this.io.to(`group:${groupId}`).emit("group:member:role", { 
      groupId, 
      userId: targetUserId, 
      role,
      changedBy: userId 
    });
  }

  // Invites and Requests
  async inviteToGroup(groupId: string, inviterId: string, inviteeId: string): Promise<{ id: string }> {
    const member = await messengerRepo.getGroupMember(groupId, inviterId);
    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Error("Insufficient permissions to invite members");
    }

    return messengerRepo.createGroupInvite(groupId, inviterId, inviteeId);
  }

  async acceptGroupInvite(groupId: string, inviteeId: string): Promise<void> {
    await messengerRepo.updateInviteStatus(groupId, inviteeId, "accepted");
    await messengerRepo.addGroupMember(groupId, inviteeId, "member");

    // Emit member added event
    this.io.to(`group:${groupId}`).emit("group:member:add", { 
      groupId, 
      userId: inviteeId, 
      role: "member",
      addedBy: "invite" 
    });
  }

  async declineGroupInvite(groupId: string, inviteeId: string): Promise<void> {
    await messengerRepo.updateInviteStatus(groupId, inviteeId, "declined");
  }

  async requestToJoinGroup(groupId: string, requesterId: string): Promise<{ id: string }> {
    return messengerRepo.createJoinRequest(groupId, requesterId);
  }

  async approveJoinRequest(requestId: string, approverId: string): Promise<void> {
    const request = await messengerRepo.getJoinRequest(requestId);
    if (!request) {
      throw new Error("Join request not found");
    }

    const member = await messengerRepo.getGroupMember(request.group_id, approverId);
    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Error("Insufficient permissions to approve requests");
    }

    await messengerRepo.updateJoinRequestStatus(requestId, "approved");
    await messengerRepo.addGroupMember(request.group_id, request.requester_id, "member");

    // Emit member added event
    this.io.to(`group:${request.group_id}`).emit("group:member:add", { 
      groupId: request.group_id, 
      userId: request.requester_id, 
      role: "member",
      addedBy: approverId 
    });
  }

  async denyJoinRequest(requestId: string, approverId: string): Promise<void> {
    const request = await messengerRepo.getJoinRequest(requestId);
    if (!request) {
      throw new Error("Join request not found");
    }

    const member = await messengerRepo.getGroupMember(request.group_id, approverId);
    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Error("Insufficient permissions to deny requests");
    }

    await messengerRepo.updateJoinRequestStatus(requestId, "denied");
  }

  // Settings
  async getMessengerSettings(userId: string) {
    return messengerRepo.getMessengerSettings(userId);
  }

  async updateMessengerSettings(userId: string, updates: any) {
    return messengerRepo.updateMessengerSettings(userId, updates);
  }
}
