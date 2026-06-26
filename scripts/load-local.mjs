/**
 * Local Stage-1 load run — wraps tests/load_test.js with a server check.
 * Requires: npm run dev (or LOADTEST_BASE_URL pointing at a live instance).
 *
 * Env:
 *   LOADTEST_BASE_URL  default http://localhost:5000
 *   LOADTEST_CONNECTIONS default 10 (use 50 for full soak)
 *   LOADTEST_DURATION    default 10 seconds (use 20 for full soak)
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.LOADTEST_BASE_URL || "http://localhost:5000";
const probe = `${BASE}/api/teams?page=1&limit=5`;

async function serverUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.status >= 100 && res.status < 600;
  } catch {
    return false;
  }
}

if (!(await serverUp(probe))) {
  console.log(`[load-local] No server at ${BASE} — start with npm run dev, then re-run.`);
  process.exit(0);
}

process.env.LOADTEST_BASE_URL = BASE;
process.env.LOADTEST_CONNECTIONS = process.env.LOADTEST_CONNECTIONS || "10";
process.env.LOADTEST_DURATION = process.env.LOADTEST_DURATION || "10";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn(process.execPath, [join(root, "tests", "load_test.js")], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));
