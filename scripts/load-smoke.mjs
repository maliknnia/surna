/**
 * Short local load smoke — requires a running server (npm run dev).
 * Uses public endpoints only; skips gracefully when nothing is listening.
 */
import autocannon from "autocannon";

const BASE = process.env.LOADTEST_BASE_URL || "http://localhost:5000";
const healthUrl = `${BASE}/api/teams?page=1&limit=5`;

async function serverUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    // Any HTTP status means the server is listening (429 = rate limit, still up).
    return res.status >= 100 && res.status < 600;
  } catch {
    return false;
  }
}

if (!(await serverUp(healthUrl))) {
  console.log(`[load-smoke] No server at ${BASE} — start with npm run dev, then re-run.`);
  process.exit(0);
}

console.log(`[load-smoke] Burst against ${healthUrl} (5 connections, 5s)`);

const result = await autocannon({
  url: healthUrl,
  connections: 5,
  duration: 5,
});

console.log("[load-smoke] Results:");
console.log(`  req/s avg: ${Math.round(result.requests.average)}`);
console.log(`  latency avg: ${Math.round(result.latency.average)}ms`);
console.log(`  latency p99: ${Math.round(result.latency.p99)}ms`);
console.log(`  errors: ${result.errors}`);

if (result.errors > 0) {
  process.exit(1);
}
