import cron from "node-cron";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { ensurePhase7HealthTables } from "../infrastructure/phase7Health";
import { generateReadinessReport } from "./phase7HealthService";
import { insertNotification } from "../features/notifications/notifications.repo";

async function processFixtureReadinessReports(): Promise<number> {
  await ensurePhase7HealthTables();

  const fixtures = await db.execute(sql`
    SELECT t.id AS team_id, t.captain_id, e.id AS event_id, e.title, e.starts_at
    FROM teams t
    JOIN events e ON e.organizer_id = t.captain_id
    WHERE e.starts_at BETWEEN NOW() + interval '23 hours 30 minutes' AND NOW() + interval '24 hours 30 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM fixture_readiness_reports r
        WHERE r.team_id = t.id AND r.event_id = e.id::varchar AND r.notified = true
      )
    LIMIT 50
  `);

  let count = 0;
  for (const row of fixtures.rows as Array<{
    team_id: string;
    captain_id: string;
    event_id: string;
    title: string;
    starts_at: string;
  }>) {
    const report = await generateReadinessReport(row.team_id, String(row.event_id));
    await db.execute(sql`
      UPDATE fixture_readiness_reports SET notified = true
      WHERE team_id = ${row.team_id} AND event_id = ${String(row.event_id)}
    `);
    await insertNotification({
      userId: row.captain_id,
      type: "system",
      message: `Pre-match readiness report ready for "${row.title}" (24h away).`,
      metadata: {
        kind: "readiness_report",
        teamId: row.team_id,
        eventId: row.event_id,
        playerCount: report.players?.length ?? 0,
      },
    });
    console.log("[Phase7-6] Readiness report sent to manager:", row.captain_id, row.event_id);
    count++;
  }
  return count;
}

export function startReadinessReportJob(): void {
  cron.schedule("*/30 * * * *", () => {
    processFixtureReadinessReports()
      .then((n) => {
        if (n > 0) console.log(`[Phase7-6] Generated ${n} readiness report(s)`);
      })
      .catch((err) => console.error("[Phase7-6] Readiness job failed:", err));
  });
  console.log("[Phase7-6] Readiness report job scheduled (every 30 min)");
}
