/**
 * Run k6 HTTP smoke when k6 is installed and a server is reachable.
 * Skips gracefully if k6 or server is missing.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.BASE_URL || process.env.LOADTEST_BASE_URL || "http://localhost:5000";
const probe = `${BASE}/healthz`;

async function serverUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.status >= 100 && res.status < 600;
  } catch {
    return false;
  }
}

function hasK6() {
  const r = spawnSync("k6", ["version"], { stdio: "pipe", shell: true });
  return r.status === 0;
}

if (!hasK6()) {
  console.log("[k6-smoke] k6 not installed — https://k6.io/docs/get-started/installation/");
  console.log("[k6-smoke] Skipping (exit 0). Full soak: bash scripts/run-loadtest.sh on staging.");
  process.exit(0);
}

if (!(await serverUp(probe))) {
  console.log(`[k6-smoke] No server at ${BASE} — start with npx tsx server/index.ts, then re-run.`);
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "loadtest.k6.smoke.js");
const env = {
  ...process.env,
  BASE_URL: BASE,
  VUS: process.env.VUS || "5",
  DURATION: process.env.DURATION || "30s",
};

console.log(`[k6-smoke] Running ${script} against ${BASE}`);
const run = spawnSync("k6", ["run", script], { stdio: "inherit", env, shell: true });
process.exit(run.status ?? 1);
