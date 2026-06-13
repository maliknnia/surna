import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";

/** 4 minutes — keeps Railway and Neon free tiers from idling out. */
export const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000;

let pingTimer: ReturnType<typeof setInterval> | null = null;

export function registerPingRoute(app: Express): void {
  app.get("/api/ping", async (_req: Request, res: Response) => {
    try {
      if (process.env.DATABASE_URL) {
        await db.execute(sql`SELECT 1`);
      }
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  /** Runtime client config — avoids rebuilding when map keys change on Railway. */
  app.get("/api/public-config", async (_req: Request, res: Response) => {
    const mapTilerKey = (process.env.MAPTILER_KEY || process.env.VITE_MAPTILER_KEY || "").trim();
    let mapTilerValid = false;
    if (mapTilerKey) {
      try {
        const check = await fetch(
          `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${encodeURIComponent(mapTilerKey)}`,
          { signal: AbortSignal.timeout(8000) },
        );
        mapTilerValid = check.ok;
      } catch {
        mapTilerValid = false;
      }
    }
    res.json({ mapTilerKey, mapTilerValid });
  });
}

function resolvePingUrl(port: number): string {
  if (process.env.KEEP_ALIVE_URL) {
    return process.env.KEEP_ALIVE_URL.replace(/\/$/, "");
  }

  const publicBase =
    (process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`) ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_APP_URL;

  if (publicBase) {
    return `${publicBase.replace(/\/$/, "")}/api/ping`;
  }

  return `http://127.0.0.1:${port}/api/ping`;
}

async function runKeepAlivePing(url: string): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Surna-KeepAlive/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn(`[keepAlive] ${url} → HTTP ${res.status}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[keepAlive] ping failed: ${msg}`);
  }
}

export function startKeepAlivePing(port: number): void {
  if (pingTimer) return;

  const url = resolvePingUrl(port);
  const minutes = KEEP_ALIVE_INTERVAL_MS / 60_000;

  void runKeepAlivePing(url);
  pingTimer = setInterval(() => {
    void runKeepAlivePing(url);
  }, KEEP_ALIVE_INTERVAL_MS);

  console.log(`[keepAlive] pinging ${url} every ${minutes} minutes`);
}

export function stopKeepAlivePing(): void {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}
