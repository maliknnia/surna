import { config } from "dotenv";
config();

import http from "http";
import type { Request, Response, NextFunction } from "express";
import { createApplication } from "./createApp";
import { log } from "./log";
import { getDevLanUrls } from "./devLanUrls";

const { startKeepAlivePing, stopKeepAlivePing } = await import("./monitoring/keepAlive");

const { app, httpServer, io } = await createApplication({ quiet: false });

const port = Number(process.env.PORT ?? 5000);

httpServer.on("error", async (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    const pingUrl = `http://127.0.0.1:${port}/api/ping`;
    const alreadyUp = await new Promise<boolean>((resolve) => {
      const req = http.get(pingUrl, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });

    if (alreadyUp) {
      console.log(`\n✅ SURNA is already running at http://localhost:${port}`);
      console.log(`   Open that URL in your browser. To restart with fresh code, run: npm run dev:restart\n`);
      process.exit(0);
    }

    console.error(`\n❌ Port ${port} is already in use — another process is blocking SURNA.`);
    console.error(`   Try: npm run dev:restart`);
    console.error(`   Or manually: netstat -ano | findstr :${port}   then   taskkill /PID <pid> /F\n`);
    process.exit(1);
  }
  console.error("[surna] Server failed to start:", err);
  process.exit(1);
});

httpServer.listen(port, "0.0.0.0", () => {
  log(`🚀 SURNA API + WebSocket serving on port ${port}`);
  log(`💻 This PC: http://localhost:${port}`);
  startKeepAlivePing(port);
  if (app.get("env") === "development") {
    const lan = getDevLanUrls(port);
    if (lan.length) {
      log(`📱 Phone (same Wi‑Fi): ${lan.join("  ·  ")}`);
      log(`   (Do not use localhost on your phone — use the IP above)`);
    } else {
      log(`📱 Phone: connect PC to Wi‑Fi, then run: npm run lan`);
    }
  }
});

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`🛑 [shutdown] ${signal} received, draining...`);

  const hardExit = setTimeout(() => {
    log(`⚠️  [shutdown] grace period exceeded, forcing exit`);
    process.exit(1);
  }, 15000);
  hardExit.unref();

  const safe = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      log(`✅ [shutdown] ${label}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`⚠️  [shutdown] ${label} failed: ${msg}`);
    }
  };

  await safe("socket.io closed", () => new Promise<void>((resolve) => {
    io.close(() => resolve());
  }));

  stopKeepAlivePing();

  await safe("http server closed", () => new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  }));

  await safe("bullmq workers + queues closed", async () => {
    const { closeAllWorkersAndQueues } = await import("./infrastructure/jobQueue");
    await closeAllWorkersAndQueues();
    try {
      const { closeMediaWorker } = await import("./worker/media.worker");
      await closeMediaWorker();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`⚠️  [shutdown] media worker close: ${msg}`);
    }
  });

  await safe("redis cache client closed", async () => {
    const { closeCache } = await import("./infrastructure/cache");
    await closeCache();
  });

  await safe("db pool drained", async () => {
    const { pool } = await import("./db");
    await pool.end();
  });

  log(`✅ [shutdown] clean exit`);
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("[surna] unhandledRejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[surna] uncaughtException:", err);
});
