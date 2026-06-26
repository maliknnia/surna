import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const POOL_MAX = parseInt(process.env.DB_POOL_MAX || '10', 10);
const POOL_IDLE_MS = parseInt(process.env.DB_POOL_IDLE_MS || '30000', 10);
const POOL_CONN_TIMEOUT_MS = parseInt(process.env.DB_POOL_CONN_TIMEOUT_MS || '10000', 10);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: POOL_MAX,
  idleTimeoutMillis: POOL_IDLE_MS,
  connectionTimeoutMillis: POOL_CONN_TIMEOUT_MS,
});

pool.on("error", (err) => {
  console.error("[db] idle pool client error (non-fatal):", err.message);
});

console.log(`ðŸ—„ï¸  [db] Postgres pool: max=${POOL_MAX} idle=${POOL_IDLE_MS}ms connTimeout=${POOL_CONN_TIMEOUT_MS}ms`);

export const db = drizzle({ 
  client: pool, 
  schema,
  logger: {
    logQuery: (query, params) => {
      // lightweight slow-query log (threshold ~150ms)
      const start = Date.now();
      return {
        then: (onfulfilled: any, onrejected: any) =>
          Promise.resolve()
            .then(() => onfulfilled?.(null))
            .catch(onrejected)
            .finally(() => {
              const ms = Date.now() - start;
              if (ms > 150) console.warn(`[DB SLOW ${ms}ms]`, query.slice(0, 120), params?.slice?.(0, 5));
            }),
      } as any;
    },
  },
});
