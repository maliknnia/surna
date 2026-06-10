// server/middleware/rateLimiter.ts
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

let store: any = undefined;
try {
  if (process.env.REDIS_URL) {
    const Redis = require("ioredis");
    const RedisStore = require("rate-limit-redis");
    const redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => times > 1 ? null : 1000,
      reconnectOnError: () => false,
      connectTimeout: 5000,
    });
    redisClient.on('error', () => {});
    store = new RedisStore({
      sendCommand: (...args: any[]) => redisClient.call(...args),
    });
  }
} catch (error) {
  console.warn("Redis not available, using in-memory rate limiting");
}

export const apiLimiter = rateLimit({
  store,
  windowMs: 60 * 1000, // 1 minute
  max: 120, // default global: 120 req/min per IP
  standardHeaders: true,
  legacyHeaders: false,
});

export function createPerUserLimiter(opts?: { windowMs?: number; max?: number }) {
  return rateLimit({
    store,
    windowMs: opts?.windowMs ?? 60 * 1000,
    max: opts?.max ?? 30,
    keyGenerator: (req: any) => {
      if (req.user?.claims?.sub) {
        return `user:${req.user.claims.sub}`;
      }
      // express-rate-limit v8 requires ipKeyGenerator for IP fallback (IPv6-safe).
      return ipKeyGenerator(req.ip ?? "0.0.0.0");
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}