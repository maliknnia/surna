import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  msg: string;
  requestId?: string;
  correlationId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  error?: { message: string; stack?: string; code?: string };
  [key: string]: any;
}

function emit(entry: LogEntry) {
  if (LEVEL_ORDER[entry.level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const line = JSON.stringify(entry);
  if (entry.level === "error" || entry.level === "fatal") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, extra?: Record<string, any>) => emit({ timestamp: new Date().toISOString(), level: "debug", msg, ...extra }),
  info: (msg: string, extra?: Record<string, any>) => emit({ timestamp: new Date().toISOString(), level: "info", msg, ...extra }),
  warn: (msg: string, extra?: Record<string, any>) => emit({ timestamp: new Date().toISOString(), level: "warn", msg, ...extra }),
  error: (msg: string, err?: Error | any, extra?: Record<string, any>) => {
    const errorObj = err instanceof Error ? { message: err.message, stack: err.stack, code: (err as any).code } : err ? { message: String(err) } : undefined;
    emit({ timestamp: new Date().toISOString(), level: "error", msg, error: errorObj, ...extra });
  },
  fatal: (msg: string, err?: Error, extra?: Record<string, any>) => {
    const errorObj = err ? { message: err.message, stack: err.stack } : undefined;
    emit({ timestamp: new Date().toISOString(), level: "fatal", msg, error: errorObj, ...extra });
  },
};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      correlationId?: string;
    }
  }
}

const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  statusCodes: {} as Record<number, number>,
  latencies: [] as number[],
  dbQueryCount: 0,
  dbQueryTime: 0,
};

export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    const correlationId = (req.headers["x-correlation-id"] as string) || requestId;
    req.requestId = requestId;
    req.correlationId = correlationId;
    res.setHeader("x-request-id", requestId);
    res.setHeader("x-correlation-id", correlationId);
    next();
  };
}

export function requestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api")) return next();
    const start = Date.now();
    metrics.totalRequests++;

    res.on("finish", () => {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;
      metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;
      metrics.latencies.push(duration);
      if (metrics.latencies.length > 1000) metrics.latencies.shift();
      if (statusCode >= 500) metrics.totalErrors++;

      const level: LogLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
      logger[level === "error" ? "error" : level === "warn" ? "warn" : "info"](
        `${req.method} ${req.path} ${statusCode} ${duration}ms`,
        { requestId: req.requestId, userId: (req as any).user?.id || (req as any).user?.claims?.sub, method: req.method, path: req.path, statusCode, duration }
      );
    });
    next();
  };
}

export function errorTrackingMiddlewareEnhanced() {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error("Unhandled error", err, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      userId: (req as any).user?.id || (req as any).user?.claims?.sub,
    });
    next(err);
  };
}

export function trackDbQuery(queryTime: number) {
  metrics.dbQueryCount++;
  metrics.dbQueryTime += queryTime;
}

export function getMetrics() {
  const latencies = [...metrics.latencies].sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const errorRate = metrics.totalRequests ? (metrics.totalErrors / metrics.totalRequests) * 100 : 0;

  return {
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    errorRate: `${errorRate.toFixed(2)}%`,
    latency: { avg: Math.round(avgLatency), p50, p95, p99 },
    statusCodes: { ...metrics.statusCodes },
    db: { queryCount: metrics.dbQueryCount, totalQueryTime: metrics.dbQueryTime },
  };
}
