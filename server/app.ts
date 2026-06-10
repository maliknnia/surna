// CRITICAL: Load environment variables FIRST before ANY other imports
import { config } from 'dotenv';
config();

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import responseTime from "response-time";
import rateLimit from "express-rate-limit";
import http from "http";

const { apiCsrfMiddleware } = await import("./middleware/csrfMiddleware");

const { registerRoutes } = await import("./routes");
const { setupVite, serveStatic, log } = await import("./vite");
const { getDevLanUrls } = await import("./devLanUrls");
const { apiLimiter } = await import("./middleware/rateLimiter");
const { isAuthenticated } = await import("./replitAuth");
const { initIO } = await import("./realtime/io");

const { initializeSecurity } = await import("./security");
await initializeSecurity();

const { corsAllowedOrigins, isDevCorsOriginAllowed, redactForLogs } = await import("./lib/productionSecurity");

const { initializeInfrastructure } = await import("./infrastructure");
await initializeInfrastructure();

const { requestIdMiddleware, botProtectionMiddleware } = await import("./infrastructure");

await import("./worker");

// Background watcher: posts a Slack/PagerDuty alert when /metrics flips
// degraded â†” healthy. No-op when ALERT_WEBHOOK_URL is unset, so dev
// environments stay quiet.
const { startHealthAlerter } = await import("./monitoring/healthAlerter");
startHealthAlerter();

const { createCompressionMiddleware } = await import("./performance/compression");
const PerformanceMonitorMod = await import("./performance/monitoring");
const PerformanceMonitor = PerformanceMonitorMod.default;

const app = express();

app.use(responseTime((req: Request, res, time) => {
  if (time > 300) console.warn(`[SLOW ${Math.round(time)}ms] ${req.method} ${req.originalUrl}`);
}));

// Per-request timing/error counters that feed /api/metrics and /metrics.
// Must be mounted before routes so every request is observed.
const { default: PerformanceMonitorEarly } = await import('./performance/monitoring');
app.use(PerformanceMonitorEarly.requestMonitoring());

if (process.env.NODE_ENV === 'production') {
  const { productionSecurityMiddleware } = await import('./middleware/securityEnhancements');
  app.use(productionSecurityMiddleware());
} else {
  app.use(helmet({
    contentSecurityPolicy: false,
  }));
}

const { additionalSecurityHeaders, authSecurityMiddleware } = await import('./middleware/securityEnhancements');
app.use(additionalSecurityHeaders());
app.use(authSecurityMiddleware());

const corsOrigins = corsAllowedOrigins();
app.use(cors({
  origin: corsOrigins === true
    ? true
    : (origin, callback) => {
        if (!origin) return callback(null, true);
        if (Array.isArray(corsOrigins) && corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        if (isDevCorsOriginAllowed(origin)) {
          return callback(null, true);
        }
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[cors] Blocked origin: ${origin} — add to FRONTEND_ORIGIN if needed`);
        }
        return callback(null, false);
      },
  credentials: true,
}));

app.use(requestIdMiddleware());
app.use(botProtectionMiddleware());

// gzip/brotli for JSON + HTML (Replit/nginx may also compress; this helps local/dev).
app.use(createCompressionMiddleware());

app.use('/assets', express.static('dist/public/assets', {
  immutable: true,
  maxAge: '365d',
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(apiCsrfMiddleware());

const { registerPingRoute } = await import('./monitoring/keepAlive');
registerPingRoute(app);

const enhancedLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: Number(process.env.RATE_LIMIT_MAX || 200),
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", enhancedLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(redactForLogs(capturedJsonResponse))}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "â€¦";
      }

      log(logLine);
    }
  });

  next();
});

const { healthRouter } = await import('./routes/healthz');
app.use('/', healthRouter);

const { startKeepAlivePing, stopKeepAlivePing } = await import('./monitoring/keepAlive');

app.get('/health', (_req, res) => {
  const healthMetrics = PerformanceMonitor.getHealthMetrics();
  res.json(healthMetrics);
});

app.get('/api/metrics', (_req, res) => {
  const stats = PerformanceMonitor.getStats();
  res.json(stats);
});

const { prometheusMetricsHandler, registerSocketIOMetricsSource } = await import('./monitoring/prometheusMetrics');
app.get('/metrics', prometheusMetricsHandler);

// Wire the Socket.IO connected-clients gauge once the IO server exists.
try {
  const { getIO } = await import('./realtime/io');
  registerSocketIOMetricsSource(() => {
    try {
      return getIO().engine.clientsCount ?? 0;
    } catch {
      return 0;
    }
  });
} catch {
  // initIO runs later in the boot sequence; getIO() will then resolve at scrape time.
}

(async () => {
  console.log(`ðŸ” Service Status Check:`);
  console.log(`   ðŸ“Š Database: ${process.env.DATABASE_URL ? 'âœ… Connected' : 'ðŸ”´ Not configured'}`);
  console.log(`   ðŸ’¾ Redis: ${process.env.REDIS_URL ? 'âœ… Configured' : 'ðŸ”´ Using in-memory fallback'}`);
  console.log(`   ðŸ“¦ S3 Storage: ${(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY) ? 'âœ… Configured' : 'ðŸ”´ Not configured - uploads will fail'}`);
  console.log(`   ðŸ”Œ Socket.IO: âœ… Ready for real-time features`);

  const httpServer = http.createServer(app);
  const io = initIO(httpServer);
  
  const server = await registerRoutes(app, io);

  const { errorTrackingMiddleware } = await import('./middleware/errorTracking');
  app.use(errorTrackingMiddleware());
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(err);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);

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

  // â”€â”€â”€ Graceful shutdown for Autoscale rotations â”€â”€â”€
  // On SIGTERM/SIGINT: stop accepting new HTTP/Socket.IO connections, close
  // BullMQ workers + queues so in-flight jobs finish or get retried by another
  // instance, drain Redis cache + rate-limit clients, drain the Postgres pool,
  // then exit. All errors are logged (not swallowed) so failed drains are
  // visible in production logs. Hard-exit after 15s if anything hangs.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`ðŸ›‘ [shutdown] ${signal} received, draining...`);

    const hardExit = setTimeout(() => {
      log(`âš ï¸  [shutdown] grace period exceeded, forcing exit`);
      process.exit(1);
    }, 15000);
    hardExit.unref();

    const safe = async (label: string, fn: () => Promise<void>) => {
      try {
        await fn();
        log(`âœ… [shutdown] ${label}`);
      } catch (err: any) {
        log(`âš ï¸  [shutdown] ${label} failed: ${err?.message || err}`);
      }
    };

    await safe('socket.io closed', () => new Promise<void>((resolve) => {
      io.close(() => resolve());
    }));

    stopKeepAlivePing();

    await safe('http server closed', () => new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    }));

    await safe('bullmq workers + queues closed', async () => {
      const { closeAllWorkersAndQueues } = await import('./infrastructure/jobQueue');
      await closeAllWorkersAndQueues();
      try {
        const { closeMediaWorker } = await import('./worker/media.worker');
        await closeMediaWorker();
      } catch (err: any) {
        log(`âš ï¸  [shutdown] media worker close: ${err?.message || err}`);
      }
    });

    await safe('redis cache client closed', async () => {
      const { closeCache } = await import('./infrastructure/cache');
      await closeCache();
    });

    await safe('db pool drained', async () => {
      const { pool } = await import('./db');
      await pool.end();
    });

    log(`âœ… [shutdown] clean exit`);
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})();
