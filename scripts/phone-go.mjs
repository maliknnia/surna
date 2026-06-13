/**
 * Fast phone preview: production build (one JS bundle) + Cloudflare tunnel.
 * Dev Vite serves hundreds of files — phones often spin forever over a tunnel.
 */
import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import http from "node:http";

const port = process.env.PORT || "5000";

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

function killPortWindows(p) {
  try {
    const out = execSync(`netstat -ano | findstr :${p}`, { encoding: "utf8" });
    const pids = new Set(
      out
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && /^\d+$/.test(pid)),
    );
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      } catch {
        /* gone */
      }
    }
  } catch {
    /* nothing listening */
  }
}

const distIndex = new URL("../dist/public/index.html", import.meta.url);
if (!existsSync(distIndex)) {
  console.log("\n📦 Building app for phone (first time can take 1–2 min)…\n");
  execSync("npm run build", { stdio: "inherit", shell: true, env: process.env });
}

console.log("\n=== SURNA phone (fast mode) ===");
console.log("Restarting server with production bundle…\n");

killPortWindows(port);
await new Promise((r) => setTimeout(r, 800));

const server = spawn(
  "npm",
  ["run", "dev"],
  {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      LOCAL_AUTH_BYPASS: "1",
      SERVE_BUILT_CLIENT: "1",
    },
  },
);

let serverReady = false;
for (let i = 0; i < 90; i++) {
  if (await ping()) {
    serverReady = true;
    break;
  }
  await new Promise((r) => setTimeout(r, 2000));
}

if (!serverReady) {
  console.error("\n❌ Server did not start in time.\n");
  server.kill("SIGINT");
  process.exit(1);
}

console.log("\n🌐 Starting public HTTPS link…\n");

const tunnel = spawn(
  "npx",
  ["--yes", "cloudflared", "tunnel", "--url", `http://127.0.0.1:${port}`],
  { stdio: ["inherit", "pipe", "pipe"], shell: true },
);

function onTunnelOutput(buf) {
  const text = buf.toString();
  process.stdout.write(text);
  const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m) {
    const url = m[0];
    console.log("\n--- On your phone ---");
    console.log(`  Open: ${url}`);
    console.log(`  Dev login: ${url}/api/login?dev=1`);
    console.log("\n  Keep this terminal open.\n");
    console.log("  When done on phone, restore desktop dev: npm run dev:restart\n");
  }
}

tunnel.stdout.on("data", onTunnelOutput);
tunnel.stderr.on("data", onTunnelOutput);

const cleanup = () => {
  tunnel.kill("SIGINT");
  server.kill("SIGINT");
};
process.on("SIGINT", cleanup);
tunnel.on("exit", () => process.exit(0));
server.on("exit", () => {
  tunnel.kill("SIGINT");
  process.exit(0);
});
