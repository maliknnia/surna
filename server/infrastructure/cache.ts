import Redis from "ioredis";

let redis: Redis | null = null;
const memCache = new Map<string, { data: any; exp: number }>();
const cacheInflight = new Map<string, Promise<unknown>>();

const MEM_MAX = 5000;

// Lifetime hit/miss counters exposed to /api/metrics and /metrics so we can
// compute cache hit ratios without poking Redis directly. We also keep
// per-surface counters keyed by the first colon-segment of the cache key
// (e.g. "map", "profile", "events", "search") so PromQL can compute hit
// ratio per surface, not just globally.
const cacheCounters = { hits: 0, misses: 0, sets: 0 };
const perSurface = new Map<string, { hits: number; misses: number; sets: number }>();
function bump(surface: string, kind: 'hits' | 'misses' | 'sets') {
  let s = perSurface.get(surface);
  if (!s) { s = { hits: 0, misses: 0, sets: 0 }; perSurface.set(surface, s); }
  s[kind]++;
}
function surfaceOf(key: string): string {
  const i = key.indexOf(':');
  return i === -1 ? key : key.slice(0, i);
}
export function getCacheCounters() {
  return { ...cacheCounters };
}
export function getCacheCountersBySurface(): Record<string, { hits: number; misses: number; sets: number }> {
  const out: Record<string, { hits: number; misses: number; sets: number }> = {};
  for (const [k, v] of perSurface) out[k] = { ...v };
  return out;
}

export const TTL = {
  FEED: 30,
  PROFILE: 120,
  TEAM: 120,
  MAP_MARKERS: 60,
  LEADERBOARD: 300,
  SEARCH: 60,
  ENTITLEMENTS: 600,
  SETTINGS: 600,
  SHORT: 10,
  MEDIUM: 60,
  LONG: 300,
} as const;

export function initCache() {
  if (!process.env.REDIS_URL) {
    console.warn("[cache] No REDIS_URL â€” in-memory cache only");
    return;
  }
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy: (t) => (t > 3 ? null : Math.min(t * 500, 3000)),
      connectTimeout: 5000,
      lazyConnect: true,
    });
    redis.on("error", () => {});
    redis.connect().then(() => console.log("[cache] âœ… Redis connected")).catch(() => {
      redis?.disconnect();
      redis = null;
      console.warn("[cache] Redis failed, using memory");
    });
  } catch {
    redis = null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const surface = surfaceOf(key);
  try {
    if (redis) {
      const val = await redis.get(key);
      if (val) { cacheCounters.hits++; bump(surface, 'hits'); return JSON.parse(val); }
      cacheCounters.misses++; bump(surface, 'misses');
      return null;
    }
    const entry = memCache.get(key);
    if (entry && entry.exp > Date.now()) { cacheCounters.hits++; bump(surface, 'hits'); return entry.data as T; }
    if (entry) memCache.delete(key);
    cacheCounters.misses++; bump(surface, 'misses');
    return null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, data: any, ttlSec: number): Promise<void> {
  try {
    cacheCounters.sets++;
    bump(surfaceOf(key), 'sets');
    if (redis) {
      await redis.setex(key, ttlSec, JSON.stringify(data));
    } else {
      if (memCache.size > MEM_MAX) {
        const oldest = memCache.keys().next().value;
        if (oldest) memCache.delete(oldest);
      }
      memCache.set(key, { data, exp: Date.now() + ttlSec * 1000 });
    }
  } catch {}
}

export async function cacheDel(key: string): Promise<void> {
  try {
    if (redis) await redis.del(key);
    else memCache.delete(key);
  } catch {}
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    if (redis) {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(...keys);
    } else {
      for (const k of memCache.keys()) {
        if (k.includes(pattern.replace("*", ""))) memCache.delete(k);
      }
    }
  } catch {}
}

export async function cacheAside<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const pending = cacheInflight.get(key);
  if (pending) return pending as Promise<T>;

  const p = (async () => {
    try {
      const fresh = await fetcher();
      await cacheSet(key, fresh, ttlSec);
      return fresh;
    } finally {
      cacheInflight.delete(key);
    }
  })();

  cacheInflight.set(key, p);
  return p;
}

export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(":");
}

export async function getCacheStats() {
  if (redis) {
    const info = await redis.info("memory").catch(() => "unavailable");
    const dbSize = await redis.dbsize().catch(() => 0);
    return { type: "redis", dbSize, info: info.slice(0, 200) };
  }
  return { type: "memory", size: memCache.size };
}

export { redis };

export async function closeCache(): Promise<void> {
  if (!redis) return;
  try {
    await redis.quit();
    console.log("[cache] Redis client closed");
  } catch (err: any) {
    console.error(`[cache] Redis close failed: ${err?.message || err}`);
    try { redis.disconnect(); } catch {}
  } finally {
    redis = null;
  }
}
