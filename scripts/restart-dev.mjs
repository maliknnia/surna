/**
 * Free port 5000 (or PORT) and start `npm run dev`.
 * Use when you see "Port 5000 is already in use".
 */
import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import http from "node:http";

const port = Number(process.env.PORT || 5000);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
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
        console.log(`[restart-dev] Stopped PID ${pid} on port ${p}`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* nothing listening */
  }
}

function killPortUnix(p) {
  try {
    const out = execSync(`lsof -ti :${p}`, { encoding: "utf8" });
    for (const pid of out.split(/\s+/).filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGTERM");
        console.log(`[restart-dev] Stopped PID ${pid} on port ${p}`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* nothing listening */
  }
}

async function main() {
  const alive = await ping(`http://127.0.0.1:${port}/api/ping`);
  if (alive) {
    console.log(`[restart-dev] Stopping existing server on port ${port}…`);
  }

  if (process.platform === "win32") killPortWindows(port);
  else killPortUnix(port);

  await sleep(800);

  console.log(`[restart-dev] Starting SURNA on port ${port}…`);
  const env = { ...process.env };
  delete env.SERVE_BUILT_CLIENT;
  const child = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: true,
    env,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error("[restart-dev]", err);
  process.exit(1);
});
