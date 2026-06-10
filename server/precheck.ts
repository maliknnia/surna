import { promises as dns } from 'dns';

if (process.env.REDIS_URL) {
  try {
    const url = new URL(process.env.REDIS_URL);
    await Promise.race([
      dns.lookup(url.hostname),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);
  } catch {
    console.warn('âš ï¸ Redis host unreachable, disabling Redis and using in-memory fallbacks');
    process.env.REDIS_URL = '';
  }
}

await import('./index.js');
