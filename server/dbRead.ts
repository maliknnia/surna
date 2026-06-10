// Optional Postgres read-replica client. If `DATABASE_REPLICA_URL` is set, all
// `dbRead` queries hit the replica; otherwise they transparently fall back to
// the primary `db` pool. This lets us shed read traffic from the primary as
// soon as we provision a Neon read replica â€” no call-site changes required.
//
// Runtime failover: even when a replica is configured, individual query
// failures (replica down, lagging, transient network) automatically fall back
// to the primary via `readWithFallback()`, so a sick replica never takes the
// app down.
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';
import { db, pool as primaryPool } from './db';

neonConfig.webSocketConstructor = ws;

const REPLICA_URL = process.env.DATABASE_REPLICA_URL;
const POOL_MAX = parseInt(process.env.DB_POOL_MAX_REPLICA || process.env.DB_POOL_MAX || '10', 10);
const POOL_IDLE_MS = parseInt(process.env.DB_POOL_IDLE_MS || '30000', 10);
const POOL_CONN_TIMEOUT_MS = parseInt(process.env.DB_POOL_CONN_TIMEOUT_MS || '10000', 10);

export const replicaPool = REPLICA_URL
  ? new Pool({
      connectionString: REPLICA_URL,
      max: POOL_MAX,
      idleTimeoutMillis: POOL_IDLE_MS,
      connectionTimeoutMillis: POOL_CONN_TIMEOUT_MS,
    })
  : primaryPool;

// Neon `Pool` and `pg` `Pool` differ; replica URL uses Neon serverless driver only.
const replicaDb = REPLICA_URL ? drizzle(replicaPool as never, { schema }) : db;

// Default export: the replica client when configured, otherwise the primary.
// Use this for read-only queries where the call site is fine with whatever
// the available pool gives back.
export const dbRead = replicaDb;

// `readWithFallback(fn)` runs `fn` against the replica first; if it throws
// (replica unreachable, query error) and we have a separate primary, retries
// against the primary. When no replica is configured this collapses to a
// single primary call. Use this around queries that must succeed even when
// the replica is degraded.
export async function readWithFallback<T>(
  fn: (client: NeonDatabase<typeof schema>) => Promise<T>
): Promise<T> {
  if (!REPLICA_URL) {
    return fn(db);
  }
  try {
    return await fn(replicaDb);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[dbRead] replica failed, retrying on primary: ${msg}`);
    return fn(db);
  }
}

if (REPLICA_URL) {
  console.log(`ðŸ—„ï¸  [db] Read replica pool: max=${POOL_MAX} (DATABASE_REPLICA_URL set, runtime failover to primary on error)`);
} else {
  console.log(`ðŸ—„ï¸  [db] No DATABASE_REPLICA_URL set â€” dbRead falls back to primary pool`);
}

export async function closeReplicaPool(): Promise<void> {
  if (!REPLICA_URL) return;
  try {
    await replicaPool.end();
  } catch {}
}
