/** Production-only security gates and shared secret helpers. */

import { createHash } from "node:crypto";

export const DEV_JWT_FALLBACK =
  "temporary_jwt_secret_for_testing_auth_module_must_be_at_least_16_chars";

export function isRailwayHost(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PUBLIC_DOMAIN ||
      process.env.RAILWAY_SERVICE_NAME,
  );
}

/**
 * First deploy on Railway: fill missing auth secrets from DATABASE_URL so you
 * don't need to paste five secrets before the app boots. Set real secrets in
 * Variables when you have time.
 */
export function bootstrapRailwaySecrets(): void {
  if (!isProduction() || !isRailwayHost()) return;

  const seed = process.env.DATABASE_URL?.trim() || "surna-railway-bootstrap";
  const derive = (label: string) =>
    createHash("sha256").update(`${seed}:${label}:surna-v1`).digest("hex");

  const auto: Array<[string, string]> = [];
  if (!process.env.SESSION_SECRET?.trim()) {
    process.env.SESSION_SECRET = derive("session");
    auto.push(["SESSION_SECRET", "SESSION_SECRET"]);
  }
  if (!process.env.JWT_SECRET?.trim()) {
    process.env.JWT_SECRET = derive("jwt");
    auto.push(["JWT_SECRET", "JWT_SECRET"]);
  }
  if (!process.env.JWT_ACCESS_SECRET?.trim()) {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_SECRET;
    auto.push(["JWT_ACCESS_SECRET", "JWT_ACCESS_SECRET"]);
  }
  if (!process.env.JWT_REFRESH_SECRET?.trim()) {
    process.env.JWT_REFRESH_SECRET = derive("refresh");
    auto.push(["JWT_REFRESH_SECRET", "JWT_REFRESH_SECRET"]);
  }
  if (!process.env.FRONTEND_ORIGIN?.trim() && process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) {
    process.env.FRONTEND_ORIGIN = `https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim()}`;
    auto.push(["FRONTEND_ORIGIN", "FRONTEND_ORIGIN"]);
  }

  if (auto.length) {
    console.warn(
      `[bootstrap] Auto-set ${auto.map(([n]) => n).join(", ")} for Railway — replace with your own random secrets in Variables when ready.`,
    );
  }
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Public HTTPS URL — Railway sets RAILWAY_PUBLIC_DOMAIN automatically. */
export function resolvePublicAppUrl(): string | undefined {
  if (process.env.PUBLIC_APP_URL?.trim()) {
    return process.env.PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim()}`;
  }
  if (process.env.RENDER_EXTERNAL_URL?.trim()) {
    return process.env.RENDER_EXTERNAL_URL.trim().replace(/\/$/, "");
  }
  return undefined;
}

/** CORS / cookie origin list — falls back to Railway public domain in production. */
export function resolveFrontendOriginList(): string {
  const explicit = process.env.FRONTEND_ORIGIN?.trim();
  if (explicit) return explicit;
  const publicUrl = resolvePublicAppUrl();
  if (publicUrl) return publicUrl;
  return "";
}

export function requireEnv(name: string, minLength = 1): string {
  const value = process.env[name]?.trim();
  if (!value || value.length < minLength) {
    throw new Error(`Missing or invalid environment variable: ${name}`);
  }
  return value;
}

/** Fail fast when production is misconfigured. */
export function validateProductionSecurity(): void {
  if (!isProduction()) return;

  bootstrapRailwaySecrets();

  if (process.env.LOCAL_AUTH_BYPASS === "1") {
    throw new Error("LOCAL_AUTH_BYPASS must not be enabled in production");
  }

  requireEnv("SESSION_SECRET", 32);
  requireEnv("JWT_SECRET", 32);
  const origins = resolveFrontendOriginList();
  if (!origins || origins.length < 8) {
    throw new Error(
      "FRONTEND_ORIGIN is required in production (or enable a Railway public domain)",
    );
  }

  const jwt = process.env.JWT_SECRET || "";
  if (jwt === DEV_JWT_FALLBACK) {
    throw new Error("JWT_SECRET must not use the development fallback in production");
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn("[security] STRIPE_WEBHOOK_SECRET not set — Stripe webhooks will reject events");
  }
}

export function resolveJwtSecret(): string {
  const secret =
    process.env.JWT_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    (!isProduction() ? DEV_JWT_FALLBACK : undefined);

  if (!secret) {
    throw new Error("JWT_SECRET is required in production");
  }
  return secret;
}

export function resolveSessionSecret(): string {
  if (isProduction()) {
    return requireEnv("SESSION_SECRET", 32);
  }
  return process.env.SESSION_SECRET || "dev-session-secret-change-me-not-for-production";
}

export function corsAllowedOrigins(): string[] | true {
  const raw = resolveFrontendOriginList();
  if (isProduction()) {
    if (!raw) throw new Error("FRONTEND_ORIGIN is required in production");
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!list.length) throw new Error("FRONTEND_ORIGIN must list at least one origin");
    return list;
  }
  if (!raw) return true;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const port = process.env.PORT?.trim() || "5000";
  const devDefaults = [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  for (const origin of devDefaults) {
    if (!list.includes(origin)) list.push(origin);
  }
  return list;
}

/** Dev-only: allow phone/LAN origins (same Wi‑Fi) without listing every IP in .env */
export function isDevCorsOriginAllowed(origin: string): boolean {
  if (isProduction()) return false;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    // npm run phone — localtunnel (*.loca.lt)
    if (host.endsWith(".loca.lt")) return true;
    // npm run phone:cf — cloudflare quick tunnel (*.trycloudflare.com)
    if (host.endsWith(".trycloudflare.com")) return true;
    return false;
  } catch {
    return false;
  }
}

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "csrfToken",
  "accessToken",
  "refreshToken",
  "devCode",
  "code",
  "secret",
  "authorization",
]);

export function redactForLogs(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  if (Array.isArray(body)) return body.map(redactForLogs);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      out[key] = redactForLogs(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}
