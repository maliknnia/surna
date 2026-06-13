import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response } from "express";

type RateLimitedRequest = Request & { rateLimit?: { resetTime?: Date } };

/** 5 attempts per IP per 15 minutes in dev; relaxed on production deploys (shared IPs, retries). */
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX = process.env.NODE_ENV === "production" ? 30 : 5;

console.log("[Fix 9] Auth rate limiting active: max", AUTH_RATE_LIMIT_MAX, "attempts per", AUTH_RATE_LIMIT_WINDOW_MS / 60000, "minutes per IP");

export function authRateLimitHandler(req: Request, res: Response): void {
  const resetTime = (req as RateLimitedRequest).rateLimit?.resetTime;
  const retryAfterSec = resetTime
    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
    : Math.ceil(AUTH_RATE_LIMIT_WINDOW_MS / 1000);

  console.log("[Fix 9] Auth rate limit exceeded for IP", req.ip, "path", req.path);

  res.status(429).json({
    error: "Too many attempts",
    message: `Maximum ${AUTH_RATE_LIMIT_MAX} authentication attempts per 15 minutes. Please try again later.`,
    retryAfter: retryAfterSec,
  });
}

export const authRouteRateLimit = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "0.0.0.0"),
  handler: authRateLimitHandler,
});

/** @deprecated Use authRouteRateLimit */
export const loginLimiter = authRouteRateLimit;
