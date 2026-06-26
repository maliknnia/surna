/**
 * Aggressive multi-endpoint stress test — simulates heavy concurrent usage.
 *
 * One machine cannot open 100k real TCP connections; this hammers public
 * APIs with high concurrency to expose crashes, 5xx, and pool exhaustion.
 *
 * Usage (server must be running with load-test mode):
 *   LOAD_TEST=1 DB_POOL_MAX=50 npx tsx server/index.ts
 *   STRESS_CONNECTIONS=500 STRESS_DURATION=45 npm run test:load:stress
 *
 * Env:
 *   LOADTEST_BASE_URL     default http://127.0.0.1:5000
 *   STRESS_CONNECTIONS    default 300 (raise toward 1000 on strong hosts)
 *   STRESS_DURATION       seconds per scenario (default 30)
 *   STRESS_PIPELINING     autocannon pipelining (default 1)
 */
import autocannon from "autocannon";

const BASE = process.env.LOADTEST_BASE_URL || "http://127.0.0.1:5000";
const CONNECTIONS = Number(process.env.STRESS_CONNECTIONS || 300);
const DURATION = Number(process.env.STRESS_DURATION || 30);
const PIPELINING = Number(process.env.STRESS_PIPELINING || 1);
const UA = { "User-Agent": "SurnaStressTest/1.0 (load-test)" };

const SCENARIOS = [
  { name: "healthz", url: `${BASE}/healthz`, connections: Math.min(50, CONNECTIONS) },
  { name: "teams", url: `${BASE}/api/teams?page=1&limit=20`, connections: CONNECTIONS },
  { name: "coaches", url: `${BASE}/api/coaches?page=1&limit=20`, connections: CONNECTIONS },
  { name: "events", url: `${BASE}/api/events?page=1&limit=20`, connections: CONNECTIONS },
  { name: "posts-recent", url: `${BASE}/api/posts/recent?limit=20`, connections: CONNECTIONS },
  { name: "places", url: `${BASE}/api/places?limit=20`, connections: CONNECTIONS },
  { name: "hashtags", url: `${BASE}/api/hashtags/trending`, connections: CONNECTIONS },
  { name: "ping", url: `${BASE}/api/ping`, connections: Math.min(100, CONNECTIONS) },
];

async function probe(url) {
  try {
    const res = await fetch(url, {
      headers: UA,
      signal: AbortSignal.timeout(8000),
    });
    return res.status;
  } catch {
    return 0;
  }
}

async function serverAlive() {
  const status = await probe(`${BASE}/health/live`);
  return status === 200;
}

function summarize(name, result) {
  const total = result.requests?.total || 0;
  const s2xx = result["2xx"] || 0;
  const s429 = result["429"] || 0;
  const non2xx = Math.max(0, total - s2xx - s429);
  const errors = result.errors || 0;
  const timeouts = result.timeouts || 0;
  const clientFails = errors + timeouts;
  const failRate = total > 0 ? (clientFails / total) * 100 : 0;
  return {
    name,
    rps: Math.round(result.requests?.average || 0),
    avgMs: Math.round(result.latency?.average || 0),
    p99Ms: Math.round(result.latency?.p99 || 0),
    total,
    s2xx,
    s429,
    non2xx,
    errors,
    timeouts,
    failRate: Math.round(failRate * 10) / 10,
    ok: failRate < 5 && non2xx / Math.max(total, 1) < 0.05,
  };
}

async function runScenario({ name, url, connections }) {
  console.log(`\n[stress] ▶ ${name} (${connections} conn, ${DURATION}s, pipeline ${PIPELINING})`);
  const result = await autocannon({
    url,
    connections,
    duration: DURATION,
    pipelining: PIPELINING,
    headers: UA,
  });
  const row = summarize(name, result);
  console.log(
    `[stress]   ${row.rps} req/s | avg ${row.avgMs}ms p99 ${row.p99Ms}ms | ` +
      `total ${row.total} | 2xx ${row.s2xx} 429 ${row.s429} | err ${row.errors} to ${row.timeouts} | client fail ${row.failRate}%`,
  );
  return row;
}

console.log("=".repeat(60));
console.log("SURNA stress load — multi-endpoint soak");
console.log(`Target: ${BASE}`);
console.log(`Connections/scenario: up to ${CONNECTIONS} | Duration: ${DURATION}s`);
console.log("=".repeat(60));

if (!(await serverAlive())) {
  console.error(`[stress] Server not reachable at ${BASE}`);
  console.error("Start with: LOAD_TEST=1 DB_POOL_MAX=50 npx tsx server/index.ts");
  process.exit(1);
}

console.log("[stress] Warming caches…");
for (const s of SCENARIOS) {
  await probe(s.url);
}
await new Promise((r) => setTimeout(r, 1000));

const results = [];
for (const scenario of SCENARIOS) {
  if (!(await serverAlive())) {
    console.error(`[stress] SERVER DOWN before ${scenario.name} — crash detected`);
    process.exit(2);
  }
  results.push(await runScenario(scenario));
  await new Promise((r) => setTimeout(r, 5000));
}

console.log("\n" + "=".repeat(60));
console.log("SUMMARY");
console.log("=".repeat(60));
for (const r of results) {
  console.log(
    `${r.ok ? "✓" : "✗"} ${r.name.padEnd(14)} ${String(r.rps).padStart(6)} r/s  p99 ${String(r.p99Ms).padStart(5)}ms  fail ${r.failRate}%`,
  );
}

const alive = await serverAlive();
const health = await probe(`${BASE}/healthz`);
const failed = results.filter((r) => !r.ok);
console.log(`\nServer alive after soak: ${alive ? "YES" : "NO"}`);
console.log(`/healthz status: ${health}`);

if (!alive) {
  console.error("[stress] FAIL — server crashed or stopped responding");
  process.exit(2);
}
if (failed.length > 0) {
  console.error(`[stress] FAIL — ${failed.length} scenario(s) above 5% failure rate`);
  process.exit(1);
}
console.log("[stress] PASS — no crash, failure rates within threshold");
