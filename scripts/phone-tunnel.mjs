/**
 * Public HTTPS URL for phone testing when Windows Firewall blocks LAN (common on Public Wi‑Fi).
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

console.log("\n=== SURNA phone tunnel ===");
console.log("Starting public URL (works on mobile data + any Wi‑Fi)…\n");

const child = spawn(
  "npx",
  ["--yes", "localtunnel", "--port", port, "--local-host", "127.0.0.1"],
  { stdio: ["inherit", "pipe", "pipe"], shell: true },
);

child.stdout.on("data", (buf) => {
  const text = buf.toString();
  process.stdout.write(text);
  const m = text.match(/https:\/\/[^\s]+\.loca\.lt/);
  if (m) {
    const url = m[0];
    console.log("\n--- On your phone ---");
    console.log(`  Open: ${url}`);
    console.log(`  Login: ${url}/api/login?dev=1`);
    console.log("\n  First visit: tap Continue on the localtunnel warning page.");
    console.log("  Keep this terminal open while testing.\n");
  }
});

child.stderr.pipe(process.stderr);
child.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => child.kill("SIGINT"));
