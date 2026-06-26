import { config } from "dotenv";
config();

import express, { type Express, type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import responseTime from "response-time";
import rateLimit from "express-rate-limit";
import http, { type Server } from "http";
import type { Server as HttpServer } from "http";

import type { Server as SocketIOServer } from "socket.io";

export type CreateApplicationOptions = {
  /** Serve built SPA (default: true unless NODE_ENV=development) */
  serveClient?: boolean;
  quiet?: boolean;
};

export type ApplicationBundle = {
  app: Express;
  httpServer: HttpServer;
  io: SocketIOServer;
};

let bootstrapped = false;

async function bootstrapOnce() {
  if (bootstrapped) return;
  const { initializeSecurity } = await import("./security");
  await initializeSecurity();
  const { initializeInfrastructure } = await import("./infrastructure");
  await initializeInfrastructure();
  await import("./worker");
  const { startHealthAlerter } = await import("./monitoring/healthAlerter");
  startHealthAlerter();
  bootstrapped = true;
}

/** Build Express app + HTTP server without listening (for integration tests). */
export async function createApplication(
  options: CreateApplicationOptions = {},
): Promise<ApplicationBundle> {
  await bootstrapOnce();

  const { apiCsrfMiddleware } = await import("./middleware/csrfMiddleware");
  const { registerRoutes } = await import("./routes");
  const { log } = await import("./log");
  const { serveStatic } = await import("./serveStatic");
  const { corsAllowedOrigins, isDevCorsOriginAllowed, redactForLogs } = await import(
    "./lib/productionSecurity"
  );
  const { requestIdMiddleware, botProtectionMiddleware } = await import("./infrastructure");
  const { createCompressionMiddleware } = await import("./performance/compression");
  const PerformanceMonitorMod = await import("./performance/monitoring");
  const PerformanceMonitor = PerformanceMonitorMod.default;

  const app = express();
  app.set("trust proxy", 1);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(
    responseTime((req: Request, res, time) => {
      if (time > 300) console.warn(`[SLOW ${Math.round(time)}ms] ${req.method} ${req.originalUrl}`);
    }),
  );

  const { default: PerformanceMonitorEarly } = await import("./performance/monitoring");
  app.use(PerformanceMonitorEarly.requestMonitoring());

  if (process.env.NODE_ENV === "production") {
    const { productionSecurityMiddleware } = await import("./middleware/securityEnhancements");
    app.use(productionSecurityMiddleware());
  } else {
    app.use(
      helmet({
        contentSecurityPolicy: false,
      }),
    );
  }

  const { additionalSecurityHeaders, authSecurityMiddleware } = await import(
    "./middleware/securityEnhancements"
  );
  app.use(additionalSecurityHeaders());
  app.use(authSecurityMiddleware());

  const corsOrigins = corsAllowedOrigins();
  app.use(
    cors({
      origin:
        corsOrigins === true
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
                console.warn(`[cors] Blocked origin: ${origin}`);
              }
              return callback(null, false);
            },
      credentials: true,
    }),
  );

  app.use(requestIdMiddleware());
  app.use(botProtectionMiddleware());
  app.use(createCompressionMiddleware());

  app.use(
    "/assets",
    express.static("dist/public/assets", {
      immutable: true,
      maxAge: "365d",
    }),
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(apiCsrfMiddleware());

  const { registerPingRoute } = await import("./monitoring/keepAlive");
  registerPingRoute(app);

  const { isLoadTestMode, isHealthProbePath } = await import("./lib/loadTestMode");
  const enhancedLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || (isLoadTestMode() ? 1_000_000 : 200)),
    message: { message: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isLoadTestMode() || isHealthProbePath(req.path),
  });
  app.use("/api/", enhancedLimiter);

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson as Record<string, unknown>;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(redactForLogs(capturedJsonResponse))}`;
        }
        if (logLine.length > 80) logLine = `${logLine.slice(0, 79)}…`;
        log(logLine);
      }
    });

    next();
  });

  const { healthRouter } = await import("./routes/healthz");
  app.use("/", healthRouter);

  app.get("/health", (_req, res) => {
    res.json(PerformanceMonitor.getHealthMetrics());
  });

  app.get("/api/metrics", (_req, res) => {
    res.json(PerformanceMonitor.getStats());
  });

  const { prometheusMetricsHandler, registerSocketIOMetricsSource } = await import(
    "./monitoring/prometheusMetrics"
  );
  app.get("/metrics", prometheusMetricsHandler);

  const httpServer = http.createServer(app);
  const { initIO } = await import("./realtime/io");
  const io = initIO(httpServer);

  registerSocketIOMetricsSource(() => {
    try {
      return io.engine.clientsCount ?? 0;
    } catch {
      return 0;
    }
  });

  if (!options.quiet) {
    const { isS3Configured } = await import("./features/media/s3");
    const { isCloudinaryConfigured } = await import("./services/cloudinaryMedia");
    const { isMediaStorageConfigured } = await import("./features/media/media.service");
    console.log(`🔍 Service Status Check:`);
    console.log(`   📊 Database: ${process.env.DATABASE_URL ? "✅ Connected" : "🔴 Not configured"}`);
    console.log(`   💾 Redis: ${process.env.REDIS_URL ? "✅ Configured" : "🔴 Using in-memory fallback"}`);
    console.log(
      `   🎬 Cloudinary: ${isCloudinaryConfigured() ? "✅ Configured" : "🔴 Not configured"}`,
    );
    console.log(`   📦 S3 Storage: ${isS3Configured() ? "✅ Configured" : "⚪ Not set"}`);
    console.log(
      `   📤 Media uploads: ${isMediaStorageConfigured() ? "✅ Ready" : "🔴 Configure Cloudinary or S3"}`,
    );
  }

  await registerRoutes(app, io);

  const { errorTrackingMiddleware } = await import("./middleware/errorTracking");
  app.use(errorTrackingMiddleware());

  app.use((err: { status?: number; statusCode?: number; message?: string }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(err);
    res.status(status).json({ message });
  });

  const serveBuiltClient = process.env.SERVE_BUILT_CLIENT === "1";
  const useViteDev = process.env.NODE_ENV === "development" && !serveBuiltClient;
  const shouldServeClient = options.serveClient ?? !useViteDev;

  if (shouldServeClient) {
    if (useViteDev) {
      const { setupVite } = await import("./viteDev");
      await setupVite(app, httpServer);
    } else {
      serveStatic(app);
    }
  }

  return { app, httpServer, io };
}
