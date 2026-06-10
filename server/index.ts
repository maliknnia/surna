// Entry point: pre-check Redis connectivity, then launch the app.
// This file MUST have no static imports of modules that use REDIS_URL.
import { promises as dns } from 'dns';
import { config } from 'dotenv';
config();

console.log("[surna] Starting dev server… (first boot can take 1–2 minutes)");

// Check Redis before importing any modules that create Redis connections
const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  try {
    const parsedUrl = new URL(redisUrl);
    await Promise.race([
      dns.lookup(parsedUrl.hostname),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);
    console.log('âœ… Redis host is reachable');
  } catch {
    console.warn('âš ï¸ Redis host unreachable, disabling Redis and using in-memory fallbacks');
    process.env.REDIS_URL = '';
  }
} else {
  console.log('â„¹ï¸ No REDIS_URL configured');
}

await import('./app.js');
