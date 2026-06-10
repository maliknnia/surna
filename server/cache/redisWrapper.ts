// Redis caching wrapper for Stage 2 scaling
import Redis from 'ioredis';

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 2) return null;
        return Math.min(times * 500, 2000);
      },
      reconnectOnError: () => false,
      connectTimeout: 5000,
      lazyConnect: true,
    });
    redis.on('error', () => {});
    redis.connect().then(() => {
      console.log('âœ… Redis connected for caching');
    }).catch(() => {
      console.warn('âš ï¸ Redis connection failed, using in-memory fallback');
      redis?.disconnect();
      redis = null;
    });
  } catch (error) {
    console.warn('âš ï¸ Redis connection failed, using in-memory fallback');
    redis = null;
  }
} else {
  console.warn('âš ï¸ REDIS_URL not set, using in-memory cache fallback');
}

// In-memory cache fallback
const memoryCache = new Map<string, { data: any; expires: number }>();

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
}

export async function cached<T>(
  func: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 60, key } = options;
  const cacheKey = key || `cache:${func.name || "fn"}:${Date.now()}`;

  try {
    // Try Redis first
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      const result = await func();
      await redis.setex(cacheKey, ttl, JSON.stringify(result));
      return result;
    }
    
    // Fallback to memory cache
    const now = Date.now();
    const cached = memoryCache.get(cacheKey);
    
    if (cached && cached.expires > now) {
      return cached.data;
    }
    
    const result = await func();
    memoryCache.set(cacheKey, {
      data: result,
      expires: now + (ttl * 1000)
    });
    
    return result;
  } catch (error) {
    console.error('Cache error, executing function directly:', error);
    return await func();
  }
}

export function cacheDecorator(ttl: number = 60) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return cached(
        () => method.apply(this, args),
        { 
          ttl,
          key: `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`
        }
      );
    };
  };
}

// Cache invalidation
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    if (redis) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      // Memory cache invalidation
      for (const key of Array.from(memoryCache.keys())) {
        if (key.includes(pattern)) {
          memoryCache.delete(key);
        }
      }
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

// Cache statistics
export async function getCacheStats(): Promise<any> {
  try {
    if (redis) {
      const info = await redis.info('memory');
      return { type: 'redis', info };
    } else {
      return { 
        type: 'memory', 
        size: memoryCache.size,
        keys: Array.from(memoryCache.keys())
      };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
