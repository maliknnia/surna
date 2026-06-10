import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { authRouteRateLimit } from "../middleware/authRateLimit";

let store: any = undefined;
try {
  if (process.env.REDIS_URL) {
    const Redis = require("ioredis");
    const RedisStore = require("rate-limit-redis");
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (t: number) => (t > 1 ? null : 1000),
      reconnectOnError: () => false,
      connectTimeout: 5000,
    });
    client.on("error", () => {});
    store = new RedisStore({ sendCommand: (...args: any[]) => client.call(...args) });
  }
} catch {}

const commonOpts = { validate: { xForwardedForHeader: false, default: false } as any };

function keyGen(req: Request): string {
  const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return userId ? `u:${userId}` : `ip:${ip}`;
}

export const globalLimiter = rateLimit({
  store,
  windowMs: 60_000,
  max: 200,
  keyGenerator: keyGen,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
  ...commonOpts,
});

export const authLimiter = authRouteRateLimit;

export const signupLimiter = rateLimit({
  store,
  windowMs: 15 * 60_000,
  max: 5,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "0.0.0.0"),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
    const retryAfterSec = resetTime
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : 900;
    res.status(429).json({
      error: "Too many attempts",
      message: "Maximum 5 signup attempts per 15 minutes. Please try again later.",
      retryAfter: retryAfterSec,
    });
  },
  ...commonOpts,
});

export const uploadLimiter = rateLimit({
  store,
  windowMs: 60_000,
  max: 20,
  keyGenerator: keyGen,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many uploads. Please wait." },
  ...commonOpts,
});

export const messageLimiter = rateLimit({
  store,
  windowMs: 60_000,
  max: 60,
  keyGenerator: keyGen,
  standardHeaders: true,
  legacyHeaders: false,
  ...commonOpts,
});

export const searchLimiter = rateLimit({
  store,
  windowMs: 60_000,
  max: 30,
  keyGenerator: keyGen,
  standardHeaders: true,
  legacyHeaders: false,
  ...commonOpts,
});

export const paymentLimiter = rateLimit({
  store,
  windowMs: 60_000,
  max: 10,
  keyGenerator: keyGen,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many payment requests." },
  ...commonOpts,
});

const suspiciousIPs = new Map<string, { count: number; lastSeen: number }>();
const IP_BAN_THRESHOLD = 50;
const IP_BAN_WINDOW = 5 * 60_000;

export function botProtectionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    const entry = suspiciousIPs.get(ip);
    if (entry) {
      if (now - entry.lastSeen > IP_BAN_WINDOW) {
        suspiciousIPs.delete(ip);
      } else if (entry.count > IP_BAN_THRESHOLD) {
        return res.status(429).json({ message: "Temporarily blocked due to suspicious activity." });
      }
    }

    const ua = req.headers["user-agent"] || "";
    const isBot = !ua || /bot|crawl|spider|scrape|curl|wget|python|java\//i.test(ua);

    if (isBot && req.path.startsWith("/api/") && !req.path.includes("/healthz") && req.path !== "/api/ping") {
      const current = suspiciousIPs.get(ip) || { count: 0, lastSeen: now };
      current.count++;
      current.lastSeen = now;
      suspiciousIPs.set(ip, current);

      if (current.count > IP_BAN_THRESHOLD) {
        return res.status(429).json({ message: "Automated requests are not allowed." });
      }
    }

    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of suspiciousIPs.entries()) {
    if (now - entry.lastSeen > IP_BAN_WINDOW) suspiciousIPs.delete(ip);
  }
}, 60_000);
