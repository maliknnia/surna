import cron from "node-cron";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { ensurePhase3SocialTables } from "../infrastructure/phase3Social";
import { insertNotification } from "../features/notifications/notifications.repo";

async function send24hReminders(): Promise<number> {
  await ensurePhase3SocialTables();
  const q = await db.execute(sql`
    SELECT r.user_id, r.event_id, e.title, e.starts_at, e.location
    FROM event_rsvps r
    JOIN events e ON e.id = r.event_id
    WHERE r.status = 'going'
      AND e.starts_at BETWEEN NOW() + interval '23 hours 30 minutes' AND NOW() + interval '24 hours 30 minutes'
      AND COALESCE(r.reminder_24h_sent, false) = false
  `);

  let count = 0;
  for (const row of q.rows as Array<{
    user_id: string;
    event_id: string;
    title: string;
    starts_at: string;
    location: string | null;
  }>) {
    const when = new Date(row.starts_at).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await insertNotification({
      userId: row.user_id,
      type: "event_reminder",
      message: `"${row.title}" is tomorrow (${when})${row.location ? ` at ${row.location}` : ""}.`,
      metadata: { eventId: row.event_id, reminderWindow: "24h" },
    });
    await db.execute(sql`
      UPDATE event_rsvps SET reminder_24h_sent = true
      WHERE event_id = ${row.event_id} AND user_id = ${row.user_id}
    `);
    count++;
  }
  return count;
}

async function send1hReminders(): Promise<number> {
  await ensurePhase3SocialTables();
  const q = await db.execute(sql`
    SELECT r.user_id, r.event_id, e.title, e.starts_at, e.location
    FROM event_rsvps r
    JOIN events e ON e.id = r.event_id
    WHERE r.status = 'going'
      AND e.starts_at BETWEEN NOW() + interval '50 minutes' AND NOW() + interval '70 minutes'
      AND COALESCE(r.reminder_1h_sent, false) = false
  `);

  let count = 0;
  for (const row of q.rows as Array<{
    user_id: string;
    event_id: string;
    title: string;
    starts_at: string;
    location: string | null;
  }>) {
    await insertNotification({
      userId: row.user_id,
      type: "event_reminder",
      message: `"${row.title}" starts in about 1 hour${row.location ? ` at ${row.location}` : ""}.`,
      metadata: { eventId: row.event_id, reminderWindow: "1h" },
    });
    await db.execute(sql`
      UPDATE event_rsvps SET reminder_1h_sent = true
      WHERE event_id = ${row.event_id} AND user_id = ${row.user_id}
    `);
    count++;
  }
  return count;
}

export function startEventReminderJob(): void {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const h24 = await send24hReminders();
      const h1 = await send1hReminders();
      if (h24 + h1 > 0) {
        console.log("[Phase3-5] Event reminders sent:", { h24, h1 });
      }
    } catch (err) {
      console.error("[Phase3-5] Event reminder job failed:", err);
    }
  });
  console.log("[Phase3-5] Event reminder scheduler active (24h + 1h before join)");
}
