/**
 * Cross-platform staging k6 soak runner (Windows + macOS/Linux).
 *
 *   BASE_URL=https://staging.example.com JWT_SECRET=... npm run test:load:staging
 *   SOAK_PRESET=apex SKIP_WS=1 npm run test:load:staging:100k
 *
 * Presets: smoke (500) | target (1500) | scale (10k) | apex (100k)
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "loadtest.k6.soak.js");
const resultsDir = join(root, "soak-results");

const cliArgs = process.argv.slice(2);
if (cliArgs.includes("--preset=apex") || cliArgs.includes("--100k")) {
  process.env.SOAK_PRESET = process.env.SOAK_PRESET || "apex";
}
if (cliArgs.includes("--skip-ws")) {
  process.env.SKIP_WS = "1";
}

const PRESETS = {
  smoke: { vus: 500, duration: "3m", ramp: "2m", label: "500 VUs — sanity" },
  target: { vus: 1500, duration: "5m", ramp: "3m", label: "1.5k VUs — Autoscale target tier" },
  scale: { vus: 10000, duration: "10m", ramp: "5m", label: "10k VUs — scale test" },
  apex: { vus: 100000, duration: "15m", ramp: "10m", label: "100k VUs — apex (distributed k6)" },
};

function hasK6() {
  return spawnSync("k6", ["version"], { stdio: "pipe", shell: true }).status === 0;
}

function mintWsToken() {
  const r = spawnSync("npx", ["--yes", "tsx", "scripts/loadtest-token.ts"], {
    cwd: root,
    env: process.env,
    shell: true,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    console.error("[staging-soak] Failed to mint WS_TOKEN:", r.stderr || r.stdout);
    process.exit(1);
  }
  return (r.stdout || "").trim();
}

async function preflight(baseUrl) {
  console.log("[staging-soak] Pre-flight checks…");
  const checks = [
    { name: "health/live", url: `${baseUrl}/health/live`, expect: 200 },
    { name: "health/ready", url: `${baseUrl}/health/ready`, expect: 200 },
    { name: "healthz", url: `${baseUrl}/healthz`, expect: [200, 503] },
  ];

  for (const c of checks) {
    try {
      const res = await fetch(c.url, {
        headers: { "User-Agent": "SurnaStagingSoak/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      const ok = Array.isArray(c.expect) ? c.expect.includes(res.status) : res.status === c.expect;
      console.log(`  ${ok ? "✓" : "✗"} ${c.name} → ${res.status}`);
      if (!ok && c.name !== "healthz") {
        console.error(`[staging-soak] Pre-flight failed: ${c.name}`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`[staging-soak] Pre-flight failed: ${c.name}`, err.message || err);
      process.exit(1);
    }
  }
}

const baseUrl = (process.env.BASE_URL || "").replace(/\/$/, "");
if (!baseUrl) {
  console.error("[staging-soak] BASE_URL is required (e.g. https://your-staging.replit.app)");
  console.error("  See docs/STAGING_SOAK_CHECKLIST.md");
  process.exit(1);
}

if (/localhost|127\.0\.0\.1/.test(baseUrl)) {
  console.warn("[staging-soak] BASE_URL is localhost — use staging for capacity numbers.");
}

if (!hasK6()) {
  console.error("[staging-soak] k6 is not installed.");
  console.error("  Install: https://k6.io/docs/get-started/installation/");
  console.error("  Windows (choco): choco install k6");
  console.error("  macOS (brew):    brew install k6");
  process.exit(1);
}

const presetName = (process.env.SOAK_PRESET || "target").toLowerCase();
const preset = PRESETS[presetName];
if (!preset) {
  console.error(`[staging-soak] Unknown SOAK_PRESET=${presetName}. Use: ${Object.keys(PRESETS).join(", ")}`);
  process.exit(1);
}

if (preset.vus >= 50000) {
  console.log("");
  console.log("⚠️  100k-class soak requires distributed load generation:");
  console.log("   • Grafana k6 Cloud: set K6_CLOUD=1 and k6 cloud login");
  console.log("   • Or run 10 generators at SOAK_PRESET=scale (10k each)");
  console.log("   • First apex pass: SKIP_WS=1 (HTTP-only) recommended");
  console.log("   See docs/STAGING_SOAK_CHECKLIST.md");
  console.log("");
}

await preflight(baseUrl);

if (!process.env.JWT_SECRET) {
  console.warn("[staging-soak] JWT_SECRET not set — WS fan-out will fail unless WS_TOKEN is provided.");
} else if (!process.env.WS_TOKEN) {
  console.log("[staging-soak] Minting WS_TOKEN from JWT_SECRET…");
  process.env.WS_TOKEN = mintWsToken();
}

if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

const wsUrl = process.env.WS_URL || baseUrl.replace(/^http/, "ws");
const skipWs = process.env.SKIP_WS === "1" || process.env.SKIP_WS === "true";

const env = {
  ...process.env,
  BASE_URL: baseUrl,
  WS_URL: wsUrl,
  SOAK_PRESET: presetName,
  VUS: process.env.VUS || String(preset.vus),
  DURATION: process.env.DURATION || preset.duration,
  RAMP: process.env.RAMP || preset.ramp,
  SKIP_WS: skipWs ? "1" : process.env.SKIP_WS || "",
};

console.log(`[staging-soak] Running ${preset.label}`);
console.log(`  script: ${script}`);
console.log(`  BASE_URL=${baseUrl}`);
console.log(`  VUS=${env.VUS} RAMP=${env.RAMP} DURATION=${env.DURATION} SKIP_WS=${skipWs}`);

const k6Cmd = process.env.K6_CLOUD === "1" ? ["cloud", "run", script] : ["run", script];
const run = spawnSync("k6", k6Cmd, { stdio: "inherit", env, shell: true, cwd: root });

console.log(`\n[staging-soak] Done (exit ${run.status ?? 1}). Results: soak-results/latest.txt`);
console.log("  Paste metrics into docs/SCALING.md → Measured results table.");
process.exit(run.status ?? 1);
