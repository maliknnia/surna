import { createClient } from "redis";

const client = process.env.REDIS_URL ? createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 5000, reconnectStrategy: (retries) => retries > 1 ? false as any : 1000 } }) : null;
if (client) client.on('error', () => {});
let ready = false;
let failed = false;

async function ensure() {
  if (failed || !client) return;
  if (!ready) {
    try { await client.connect(); ready = true; } catch { failed = true; }
  }
}

export async function cached<T>(key: string, ttlSec: number, loader: () => Promise<T>): Promise<T> {
  if (!client || failed) return loader();
  await ensure();
  if (failed) return loader();
  const hit = await client.get(key);
  if (hit) return JSON.parse(hit) as T;
  const val = await loader();
  await client.setEx(key, ttlSec, JSON.stringify(val));
  return val;
}

export async function invalidate(pattern: string) {
  if (!client) return;
  await ensure();
  const keys = await client.keys(pattern);
  if (keys.length) await client.del(keys);
}
