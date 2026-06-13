// server/features/messenger/messenger.repo.ts
import { db } from "../../db";
import { sql } from "drizzle-orm";

export interface DMConversation {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
}

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: "text" | "audio";
  body: string;
  media_id: string | null;
  created_at: string;
}

export interface GroupConversation {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  kind: "text" | "audio";
  body: string;
  media_id: string | null;
  created_at: string;
}

export interface MessengerSettings {
  user_id: string;
  allow_message_requests: boolean;
  call_permission: "everyone" | "following" | "none";
  read_receipts: boolean;
  created_at: string;
  updated_at: string;
}

export class MessengerRepository {
  private schemaEnsured = false;
  private groupSchemaEnsured = false;

  private async ensureGroupSchema() {
    if (this.groupSchemaEnsured) return;
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_conversations (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        owner_id varchar NOT NULL,
        name varchar NOT NULL,
        description text DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_members (
        group_id varchar NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
        user_id varchar NOT NULL,
        role text NOT NULL DEFAULT 'member',
        joined_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (group_id, user_id)
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_messages (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        group_id varchar NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
        sender_id varchar NOT NULL,
        kind text NOT NULL DEFAULT 'text',
        body text NOT NULL DEFAULT '',
        media_id varchar,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_reads (
        group_id varchar NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
        user_id varchar NOT NULL,
        last_read_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (group_id, user_id)
      );
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_group_msg_group_time ON group_messages (group_id, created_at DESC);
    `);
    this.groupSchemaEnsured = true;
  }

  private async ensureDMSchema() {
    if (this.schemaEnsured) return;
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dm_conversations (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_a varchar NOT NULL,
        user_b varchar NOT NULL,
        last_message_at timestamptz NOT NULL DEFAULT now(),
        disappearing_enabled boolean DEFAULT false,
        pinned_message_id varchar
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dm_messages (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        conversation_id varchar NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
        sender_id varchar NOT NULL,
        kind text NOT NULL DEFAULT 'text',
        body text NOT NULL DEFAULT '',
        media_id varchar,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dm_reads (
        conversation_id varchar NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
        user_id varchar NOT NULL,
        last_read_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (conversation_id, user_id)
      );
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dm_conv_last ON dm_conversations (last_message_at DESC);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dm_msg_conv_time ON dm_messages (conversation_id, created_at DESC);
    `);
    await db.execute(sql`
      ALTER TABLE dm_conversations
      ADD COLUMN IF NOT EXISTS disappearing_enabled boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS pinned_message_id varchar;
    `);
    this.schemaEnsured = true;
  }

  // DM Operations
  async ensureDMConversation(userA: string, userB: string): Promise<DMConversation> {
    await this.ensureDMSchema();
    const [smaller, larger] = [userA, userB].sort();
    
    const existing = await db.execute(sql`
      SELECT * FROM dm_conversations 
      WHERE user_a = ${smaller} AND user_b = ${larger}
    `);

    if (existing.rows.length > 0) {
      return existing.rows[0] as unknown as DMConversation;
    }

    const created = await db.execute(sql`
      INSERT INTO dm_conversations (user_a, user_b) 
      VALUES (${smaller}, ${larger})
      RETURNING *
    `);

    return created.rows[0] as unknown as DMConversation;
  }

  async getDMConversations(userId: string): Promise<any[]> {
    await this.ensureDMSchema();
    const result = await db.execute(sql`
      SELECT
        c.id,
        c.user_a,
        c.user_b,
        c.last_message_at,
        ou.id AS other_id,
        ou.first_name AS other_first_name,
        ou.last_name AS other_last_name,
        ou.email AS other_email,
        ou.profile_image_url AS other_profile_image_url,
        lm.body AS last_message_body,
        lm.sender_id AS last_message_sender_id,
        lm.kind AS last_message_kind,
        lm.created_at AS last_message_created_at,
        COALESCE(uc.unread_count, 0) AS unread_count
      FROM dm_conversations c
      JOIN users ou ON ou.id = CASE WHEN c.user_a = ${userId} THEN c.user_b ELSE c.user_a END
      LEFT JOIN LATERAL (
        SELECT body, sender_id, kind, created_at
        FROM dm_messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS unread_count
        FROM dm_messages m
        LEFT JOIN dm_reads r ON r.conversation_id = c.id AND r.user_id = ${userId}
        WHERE m.conversation_id = c.id
          AND m.sender_id != ${userId}
          AND m.created_at > COALESCE(r.last_read_at, '1970-01-01'::timestamptz)
      ) uc ON true
      WHERE c.user_a = ${userId} OR c.user_b = ${userId}
      ORDER BY c.last_message_at DESC
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      user_a: row.user_a,
      user_b: row.user_b,
      last_message_at: row.last_message_at,
      other_user: {
        id: row.other_id,
        firstName: row.other_first_name,
        lastName: row.other_last_name,
        email: row.other_email,
        profileImageUrl: row.other_profile_image_url,
      },
      last_message: row.last_message_body
        ? {
            body: row.last_message_body,
            sender_id: row.last_message_sender_id,
            kind: row.last_message_kind,
            created_at: row.last_message_created_at,
          }
        : undefined,
      unread_count: Number(row.unread_count) || 0,
    }));
  }

  async getRecentMessagePartners(userId: string, limit = 12) {
    await this.ensureDMSchema();
    const result = await db.execute(sql`
      SELECT DISTINCT ON (ou.id)
        ou.id,
        ou.first_name,
        ou.last_name,
        ou.email,
        ou.profile_image_url,
        c.last_message_at
      FROM dm_conversations c
      JOIN users ou ON ou.id = CASE WHEN c.user_a = ${userId} THEN c.user_b ELSE c.user_a END
      WHERE c.user_a = ${userId} OR c.user_b = ${userId}
      ORDER BY ou.id, c.last_message_at DESC
      LIMIT ${limit}
    `);
    return result.rows.map((row: any) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      profileImageUrl: row.profile_image_url,
    }));
  }

  async getDMMessages(
    conversationId: string,
    cursorCreatedAt?: string,
    cursorId?: string,
    limit: number = 20
  ): Promise<DMMessage[]> {
    await this.ensureDMSchema();
    const cursorCondition = 
      cursorCreatedAt && cursorId
        ? sql`AND (created_at < ${cursorCreatedAt} OR (created_at = ${cursorCreatedAt} AND id < ${cursorId}))`
        : sql``;

    const result = await db.execute(sql`
      SELECT * FROM dm_messages 
      WHERE conversation_id = ${conversationId}
      ${cursorCondition}
      ORDER BY created_at DESC, id DESC 
      LIMIT ${limit}
    `);

    return result.rows as unknown as DMMessage[];
  }

  async createDMMessage(data: {
    conversation_id: string;
    sender_id: string;
    kind: "text" | "audio";
    body?: string;
    media_id?: string;
  }): Promise<DMMessage> {
    await this.ensureDMSchema();
    const created = await db.execute(sql`
      INSERT INTO dm_messages (conversation_id, sender_id, kind, body, media_id)
      VALUES (${data.conversation_id}, ${data.sender_id}, ${data.kind}, ${data.body ?? ""}, ${data.media_id ?? null})
      RETURNING *
    `);

    // Update last message timestamp
    await db.execute(sql`
      UPDATE dm_conversations 
      SET last_message_at = now() 
      WHERE id = ${data.conversation_id}
    `);

    return created.rows[0] as unknown as DMMessage;
  }

  async markDMRead(conversationId: string, userId: string): Promise<void> {
    await this.ensureDMSchema();
    await db.execute(sql`
      INSERT INTO dm_reads (conversation_id, user_id, last_read_at)
      VALUES (${conversationId}, ${userId}, now())
      ON CONFLICT (conversation_id, user_id) 
      DO UPDATE SET last_read_at = now()
    `);
  }

  async getDMConversationSettings(conversationId: string, userId: string): Promise<{ disappearing_enabled: boolean; pinned_message_id: string | null }> {
    await this.ensureDMSchema();
    const result = await db.execute(sql`
      SELECT disappearing_enabled, pinned_message_id
      FROM dm_conversations
      WHERE id = ${conversationId}
        AND (user_a = ${userId} OR user_b = ${userId})
      LIMIT 1
    `);
    return (result.rows[0] as any) || { disappearing_enabled: false, pinned_message_id: null };
  }

  async updateDMConversationSettings(conversationId: string, userId: string, updates: { disappearing_enabled?: boolean }) {
    await this.ensureDMSchema();
    const setParts: any[] = [];
    if (updates.disappearing_enabled !== undefined) setParts.push(sql`disappearing_enabled = ${updates.disappearing_enabled}`);
    if (setParts.length === 0) return this.getDMConversationSettings(conversationId, userId);
    await db.execute(sql`
      UPDATE dm_conversations
      SET ${sql.join(setParts, sql`, `)}
      WHERE id = ${conversationId}
        AND (user_a = ${userId} OR user_b = ${userId})
    `);
    return this.getDMConversationSettings(conversationId, userId);
  }

  async pinDMMessage(conversationId: string, userId: string, messageId: string) {
    await this.ensureDMSchema();
    await db.execute(sql`
      UPDATE dm_conversations
      SET pinned_message_id = ${messageId}
      WHERE id = ${conversationId}
        AND (user_a = ${userId} OR user_b = ${userId})
    `);
  }

  async unpinDMMessage(conversationId: string, userId: string) {
    await this.ensureDMSchema();
    await db.execute(sql`
      UPDATE dm_conversations
      SET pinned_message_id = NULL
      WHERE id = ${conversationId}
        AND (user_a = ${userId} OR user_b = ${userId})
    `);
  }

  async getDMMessageById(messageId: string): Promise<DMMessage | null> {
    const result = await db.execute(sql`SELECT * FROM dm_messages WHERE id = ${messageId} LIMIT 1`);
    return (result.rows[0] as any) || null;
  }

  async bulkDeleteDMMessages(conversationId: string, userId: string, messageIds: string[]) {
    if (messageIds.length === 0) return;
    await db.execute(sql`
      DELETE FROM dm_messages
      WHERE conversation_id = ${conversationId}
        AND sender_id = ${userId}
        AND id = ANY(${messageIds}::varchar[])
    `);
  }

  async expireSeenMessages(conversationId: string, userId: string) {
    const settings = await this.getDMConversationSettings(conversationId, userId);
    if (!settings.disappearing_enabled) return;
    await db.execute(sql`
      DELETE FROM dm_messages
      WHERE conversation_id = ${conversationId}
        AND created_at < (now() - interval '24 hours')
    `);
  }

  // Group Operations
  async createGroup(data: {
    owner_id: string;
    name: string;
    description?: string;
  }): Promise<GroupConversation> {
    await this.ensureGroupSchema();
    const created = await db.execute(sql`
      INSERT INTO group_conversations (owner_id, name, description)
      VALUES (${data.owner_id}, ${data.name}, ${data.description || ""})
      RETURNING *
    `);

    // Add owner as member
    await db.execute(sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${created.rows[0].id}, ${data.owner_id}, 'owner')
    `);

    return created.rows[0] as unknown as GroupConversation;
  }

  async updateGroup(groupId: string, data: {
    name?: string;
    description?: string;
  }): Promise<GroupConversation> {
    await this.ensureGroupSchema();
    if (!data.name && data.description === undefined) {
      throw new Error("No updates provided");
    }

    const setParts: any[] = [];
    
    if (data.name) {
      setParts.push(sql`name = ${data.name}`);
    }
    if (data.description !== undefined) {
      setParts.push(sql`description = ${data.description}`);
    }

    const updateSql = sql.join(setParts, sql`, `);

    const result = await db.execute(sql`
      UPDATE group_conversations 
      SET ${updateSql}
      WHERE id = ${groupId} 
      RETURNING *
    `);
    
    return result.rows[0] as unknown as GroupConversation;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await db.execute(sql`DELETE FROM group_conversations WHERE id = ${groupId}`);
  }

  async getUserGroups(userId: string): Promise<(GroupConversation & { role: string })[]> {
    const result = await db.execute(sql`
      SELECT g.*, gm.role
      FROM group_conversations g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ${userId}
      ORDER BY g.created_at DESC
    `);
    return result.rows as unknown as (GroupConversation & { role: string })[];
  }

  async getGroupMessages(
    groupId: string,
    cursorCreatedAt?: string,
    cursorId?: string,
    limit: number = 20
  ): Promise<GroupMessage[]> {
    const cursorCondition = 
      cursorCreatedAt && cursorId
        ? sql`AND (created_at < ${cursorCreatedAt} OR (created_at = ${cursorCreatedAt} AND id < ${cursorId}))`
        : sql``;

    const result = await db.execute(sql`
      SELECT * FROM group_messages 
      WHERE group_id = ${groupId}
      ${cursorCondition}
      ORDER BY created_at DESC, id DESC 
      LIMIT ${limit}
    `);

    return result.rows as unknown as GroupMessage[];
  }

  async createGroupMessage(data: {
    group_id: string;
    sender_id: string;
    kind: "text" | "audio";
    body?: string;
    media_id?: string;
  }): Promise<GroupMessage> {
    const created = await db.execute(sql`
      INSERT INTO group_messages (group_id, sender_id, kind, body, media_id)
      VALUES (${data.group_id}, ${data.sender_id}, ${data.kind}, ${data.body || ""}, ${data.media_id ?? null})
      RETURNING *
    `);

    return created.rows[0] as unknown as GroupMessage;
  }

  async markGroupRead(groupId: string, userId: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO group_reads (group_id, user_id, last_read_at)
      VALUES (${groupId}, ${userId}, now())
      ON CONFLICT (group_id, user_id) 
      DO UPDATE SET last_read_at = now()
    `);
  }

  // Group Membership
  async addGroupMember(groupId: string, userId: string, role: "member" | "admin" = "member"): Promise<void> {
    await this.ensureGroupSchema();
    await db.execute(sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${groupId}, ${userId}, ${role})
    `);
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await db.execute(sql`DELETE FROM group_members WHERE group_id = ${groupId} AND user_id = ${userId}`);
  }

  async updateMemberRole(groupId: string, userId: string, role: "member" | "admin" | "owner"): Promise<void> {
    await db.execute(sql`
      UPDATE group_members 
      SET role = ${role}
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `);
  }

  async getGroupMember(groupId: string, userId: string): Promise<GroupMember | null> {
    await this.ensureGroupSchema();
    const result = await db.execute(sql`
      SELECT * FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `);
    return (result.rows[0] as unknown as GroupMember) || null;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const result = await db.execute(sql`
      SELECT * FROM group_members 
      WHERE group_id = ${groupId}
      ORDER BY joined_at ASC
    `);
    return result.rows as unknown as GroupMember[];
  }

  async getGroupById(groupId: string, userId: string): Promise<(GroupConversation & { role: string; member_count?: number }) | null> {
    await this.ensureGroupSchema();
    const result = await db.execute(sql`
      SELECT g.*, gm.role,
        (SELECT COUNT(*)::int FROM group_members gm2 WHERE gm2.group_id = g.id) AS member_count
      FROM group_conversations g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE g.id = ${groupId} AND gm.user_id = ${userId}
      LIMIT 1
    `);
    return (result.rows[0] as unknown as GroupConversation & { role: string; member_count?: number }) || null;
  }

  async getGroupMembersWithUsers(groupId: string) {
    const result = await db.execute(sql`
      SELECT gm.user_id, gm.role, gm.joined_at,
        u.first_name, u.last_name, u.email, u.profile_image_url
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ${groupId}
      ORDER BY gm.joined_at ASC
    `);
    return result.rows.map((row: any) => ({
      user_id: row.user_id,
      role: row.role,
      joined_at: row.joined_at,
      user: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        profileImageUrl: row.profile_image_url,
      },
    }));
  }

  // Invites and Requests
  async createGroupInvite(groupId: string, inviterId: string, inviteeId: string): Promise<{ id: string }> {
    const result = await db.execute(sql`
      INSERT INTO group_invites (group_id, inviter_id, invitee_id)
      VALUES (${groupId}, ${inviterId}, ${inviteeId})
      RETURNING id
    `);
    return result.rows[0] as { id: string };
  }

  async updateInviteStatus(groupId: string, inviteeId: string, status: "accepted" | "declined" | "canceled"): Promise<void> {
    await db.execute(sql`
      UPDATE group_invites 
      SET status = ${status}
      WHERE group_id = ${groupId} AND invitee_id = ${inviteeId}
    `);
  }

  async createJoinRequest(groupId: string, requesterId: string): Promise<{ id: string }> {
    const result = await db.execute(sql`
      INSERT INTO group_join_requests (group_id, requester_id)
      VALUES (${groupId}, ${requesterId})
      RETURNING id
    `);
    return result.rows[0] as { id: string };
  }

  async updateJoinRequestStatus(requestId: string, status: "approved" | "denied"): Promise<void> {
    await db.execute(sql`
      UPDATE group_join_requests 
      SET status = ${status}
      WHERE id = ${requestId}
    `);
  }

  async getJoinRequest(requestId: string): Promise<{ group_id: string; requester_id: string } | null> {
    const result = await db.execute(sql`
      SELECT group_id, requester_id FROM group_join_requests 
      WHERE id = ${requestId}
    `);
    return (result.rows[0] as { group_id: string; requester_id: string }) || null;
  }

  // Settings
  async getMessengerSettings(userId: string): Promise<MessengerSettings> {
    const existing = await db.execute(sql`
      SELECT * FROM messenger_settings WHERE user_id = ${userId}
    `);

    if (existing.rows.length > 0) {
      return existing.rows[0] as unknown as MessengerSettings;
    }

    // Create default settings
    const created = await db.execute(sql`
      INSERT INTO messenger_settings (user_id) VALUES (${userId}) RETURNING *
    `);
    return created.rows[0] as unknown as MessengerSettings;
  }

  async updateMessengerSettings(userId: string, updates: Partial<MessengerSettings>): Promise<MessengerSettings> {
    const setParts: any[] = [];

    if (updates.allow_message_requests !== undefined) {
      setParts.push(sql`allow_message_requests = ${updates.allow_message_requests}`);
    }
    if (updates.call_permission !== undefined) {
      setParts.push(sql`call_permission = ${updates.call_permission}`);
    }
    if (updates.read_receipts !== undefined) {
      setParts.push(sql`read_receipts = ${updates.read_receipts}`);
    }

    setParts.push(sql`updated_at = now()`);

    const updateSql = sql.join(setParts, sql`, `);

    const result = await db.execute(sql`
      UPDATE messenger_settings 
      SET ${updateSql}
      WHERE user_id = ${userId} 
      RETURNING *
    `);

    return result.rows[0] as unknown as MessengerSettings;
  }
}

export const messengerRepo = new MessengerRepository();
