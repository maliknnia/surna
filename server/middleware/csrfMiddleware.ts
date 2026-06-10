import csrf from "csurf";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { isProduction } from "../lib/productionSecurity";

/** Double-submit cookie CSRF — session cookie auth only; Bearer JWT is exempt. */
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
  },
});

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Paths that must accept POST without a CSRF token (login, external webhooks, public beacons). */
const CSRF_EXEMPT_PREFIXES = [
  "/api/auth/sign-in/",
  "/api/auth/sign-up/",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/email/",
  "/api/auth/password/forgot",
  "/api/auth/password/reset",
  "/api/webhooks/",
  "/api/payments/webhook",
  "/api/analytics/pageview",
  "/api/analytics/event",
  "/api/analytics/events/batch",
  "/api/analytics/conversion",
];

function isCsrfExempt(req: Request): boolean {
  const path = req.path || req.url.split("?")[0];
  return CSRF_EXEMPT_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

function usesBearerAuth(req: Request): boolean {
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ");
}

/** Apply CSRF to all mutating /api/* requests that rely on session cookies. */
export function apiCsrfMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api/")) return next();
    if (SAFE_METHODS.has(req.method)) return next();
    if (usesBearerAuth(req)) return next();
    if (isCsrfExempt(req)) return next();
    return csrfProtection(req, res, next);
  };
}
