import { db } from "../db";
import { sql } from "drizzle-orm";

export type ReceiptStatus = "sent" | "delivered" | "read";

export async function ensureMessagingTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS message_receipts (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id VARCHAR NOT NULL,
      user_id VARCHAR NOT NULL,
      status VARCHAR NOT NULL DEFAULT 'sent',
      timestamp TIMESTAMP DEFAULT now(),
      UNIQUE(message_id, user_id, status)
    );
    CREATE INDEX IF NOT EXISTS idx_receipts_message ON message_receipts(message_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_user ON message_receipts(user_id);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS conversation_cursors (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id VARCHAR NOT NULL,
      user_id VARCHAR NOT NULL,
      last_seen_message_id VARCHAR,
      last_seen_at TIMESTAMP DEFAULT now(),
      UNIQUE(conversation_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_cursors_conv ON conversation_cursors(conversation_id);
  `);
}

export async function setReceipt(messageId: string, userId: string, status: ReceiptStatus) {
  await db.execute(sql`
    INSERT INTO message_receipts (message_id, user_id, status, timestamp)
    VALUES (${messageId}, ${userId}, ${status}, now())
    ON CONFLICT (message_id, user_id, status) DO UPDATE SET timestamp = now()
  `);
}

export async function getReceipts(messageId: string) {
  const result = await db.execute(sql`
    SELECT user_id AS "userId", status, timestamp
    FROM message_receipts WHERE message_id = ${messageId}
    ORDER BY timestamp
  `);
  return result.rows;
}

export async function updateCursor(conversationId: string, userId: string, lastMessageId: string) {
  await db.execute(sql`
    INSERT INTO conversation_cursors (conversation_id, user_id, last_seen_message_id, last_seen_at)
    VALUES (${conversationId}, ${userId}, ${lastMessageId}, now())
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET
      last_seen_message_id = EXCLUDED.last_seen_message_id,
      last_seen_at = now()
  `);
}

export async function getCursor(conversationId: string, userId: string) {
  const result = await db.execute(sql`
    SELECT last_seen_message_id AS "lastSeenMessageId", last_seen_at AS "lastSeenAt"
    FROM conversation_cursors
    WHERE conversation_id = ${conversationId} AND user_id = ${userId}
  `);
  return result.rows[0] || null;
}

export async function getUnreadCount(conversationId: string, userId: string): Promise<number> {
  const cursor = await getCursor(conversationId, userId);
  if (!cursor) {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM messages WHERE conversation_id = ${conversationId}
    `);
    return (result.rows[0] as any)?.count || 0;
  }

  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS count FROM messages
    WHERE conversation_id = ${conversationId}
      AND created_at > ${(cursor as any).lastSeenAt}
  `);
  return (result.rows[0] as any)?.count || 0;
}

export async function getMessagesSince(conversationId: string, sinceMessageId: string | null, limit: number = 50) {
  if (!sinceMessageId) {
    const result = await db.execute(sql`
      SELECT * FROM messages WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC LIMIT ${limit}
    `);
    return result.rows.reverse();
  }

  const result = await db.execute(sql`
    SELECT * FROM messages WHERE conversation_id = ${conversationId}
      AND created_at > (SELECT created_at FROM messages WHERE id = ${sinceMessageId})
    ORDER BY created_at ASC LIMIT ${limit}
  `);
  return result.rows;
}

export async function paginateMessages(conversationId: string, opts: { before?: string; limit?: number }) {
  const limit = opts.limit || 50;
  if (opts.before) {
    const result = await db.execute(sql`
      SELECT * FROM messages WHERE conversation_id = ${conversationId}
        AND created_at < (SELECT created_at FROM messages WHERE id = ${opts.before})
      ORDER BY created_at DESC LIMIT ${limit}
    `);
    return result.rows.reverse();
  }
  const result = await db.execute(sql`
    SELECT * FROM messages WHERE conversation_id = ${conversationId}
    ORDER BY created_at DESC LIMIT ${limit}
  `);
  return result.rows.reverse();
}
