/**
 * Public HTTPS URL for phone testing — Cloudflare quick tunnel (no password page).
 * Requires `npm run dev` already running on PORT (default 5000).
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import http from "node:http";

let port = process.env.PORT || "5000";
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*PORT\s*=\s*(\d+)\s*$/i);
    if (m) port = m[1];
  }
}

function ping() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/ping`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

const ok = await ping();
if (!ok) {
  console.error(`\n❌ Dev server not reachable on port ${port}. Run: npm run dev\n`);
  process.exit(1);
}

console.log("\n=== SURNA phone link (Cloudflare) ===");
console.log("Starting public HTTPS URL — works on any network, no password page.\n");

const child = spawn(
  "npx",
  ["--yes", "cloudflared", "tunnel", "--url", `http://127.0.0.1:${port}`],
  { stdio: ["inherit", "pipe", "pipe"], shell: true },
);

child.stdout.on("data", (buf) => {
  const text = buf.toString();
  process.stdout.write(text);
  const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m) {
    const url = m[0];
    console.log("\n--- On your phone ---");
    console.log(`  Open: ${url}`);
    console.log(`  Dev login: ${url}/api/login?dev=1`);
    console.log("\n  Keep this terminal open while testing.\n");
  }
});

child.stderr.on("data", (buf) => {
  const text = buf.toString();
  process.stderr.write(text);
  const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m) {
    const url = m[0];
    console.log("\n--- On your phone ---");
    console.log(`  Open: ${url}`);
    console.log(`  Dev login: ${url}/api/login?dev=1`);
    console.log("\n  Keep this terminal open while testing.\n");
  }
});

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
