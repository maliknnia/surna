import { storage } from "../storage";
import { recordWorkerHeartbeat, startBullMqMetricsPolling } from "./metrics";

if (process.env.REDIS_URL) {
  import("./media.worker").catch(() => {
    console.warn("⚠️ Media worker skipped (Redis unavailable)");
  });
  startBullMqMetricsPolling();
}

setInterval(async () => {
  try {
    const expired = await storage.expireInstantTeams();
    if (expired > 0) console.log(`⚡ Auto-expired ${expired} instant teams`);
  } catch (e) {}
}, 60000);

// Worker heartbeat: pings Better Stack so a stuck worker process trips the
// missed-heartbeat alert before users notice missing notifications or stalled
// media processing. Always update the in-process gauge so Prometheus can
// detect a frozen event loop even when no external URL is configured.
const heartbeatUrl = process.env.BETTER_STACK_HEARTBEAT_URL;
async function workerHeartbeat(): Promise<void> {
  recordWorkerHeartbeat();
  if (!heartbeatUrl) return;
  try {
    await fetch(heartbeatUrl, { method: "GET" });
  } catch (err: any) {
    console.warn(`[worker] heartbeat ping failed: ${err?.message || err}`);
  }
}
void workerHeartbeat();
setInterval(() => {
  void workerHeartbeat();
}, 60_000);

console.log("🔧 Background workers initialized");
