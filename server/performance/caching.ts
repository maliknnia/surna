// Redis caching service for performance optimization
import Redis from 'ioredis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean;
  serialize?: boolean;
}

class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { data: any; expires: number }> = new Map();
  private useRedis: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis() {
    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => times > 1 ? null : 1000,
          reconnectOnError: () => false,
          connectTimeout: 5000,
          lazyConnect: true,
        });

        this.redis.on('connect', () => {
          this.useRedis = true;
        });

        this.redis.on('error', () => {
          this.useRedis = false;
        });
      } catch (error) {
        console.warn('âš ï¸ Redis initialization failed, using memory cache');
        this.useRedis = false;
      }
    } else {
      console.log('âš ï¸ No REDIS_URL found, using in-memory cache');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        return this.getFromMemory<T>(key);
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const { ttl = 300, serialize = true } = options; // Default 5 minutes TTL
    
    try {
      const data = serialize ? JSON.stringify(value) : value;
      
      if (this.useRedis && this.redis) {
        if (ttl > 0) {
          await this.redis.setex(key, ttl, data);
        } else {
          await this.redis.set(key, data);
        }
      } else {
        this.setInMemory(key, value, ttl);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.flushall();
      } else {
        this.memoryCache.clear();
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // Memory cache fallback methods
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    if (entry.expires > 0 && Date.now() > entry.expires) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setInMemory(key: string, value: any, ttl: number): void {
    const expires = ttl > 0 ? Date.now() + (ttl * 1000) : 0;
    this.memoryCache.set(key, { data: value, expires });
    
    // Clean up expired entries periodically
    if (this.memoryCache.size > 1000) {
      this.cleanupMemoryCache();
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires > 0 && now > entry.expires) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Cache key utilities
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // For memory cache, convert pattern to regex
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('Cache pattern invalidation error:', error);
    }
  }

  // Cache warming utilities
  async warmCache(warmers: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>): Promise<void> {
    const promises = warmers.map(async ({ key, fetcher, ttl = 300 }) => {
      try {
        const data = await fetcher();
        await this.set(key, data, { ttl });
        console.log(`Cache warmed: ${key}`);
      } catch (error) {
        console.error(`Cache warming failed for ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache decorators for easy use
export function cached(options: CacheOptions & { keyGenerator?: (...args: any[]) => string } = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const { ttl = 300, keyGenerator } = options;
      
      // Generate cache key
      const baseKey = `${target.constructor.name}:${propertyName}`;
      const key = keyGenerator ? keyGenerator(...args) : `${baseKey}:${JSON.stringify(args)}`;

      // Try to get from cache
      let result = await cacheService.get(key);
      
      if (result === null) {
        // Cache miss, execute original method
        result = await method.apply(this, args);
        
        // Cache the result
        await cacheService.set(key, result, { ttl });
      }

      return result;
    };

    return descriptor;
  };
}

// Common cache patterns
export class CachePatterns {
  // User data cache
  static async getUserData(userId: string, fetcher: () => Promise<any>) {
    const key = CacheService.generateKey('user', userId);
    let data = await cacheService.get(key);
    
    if (!data) {
      data = await fetcher();
      await cacheService.set(key, data, { ttl: 600 }); // 10 minutes
    }
    
    return data;
  }

  // Feed cache with invalidation
  static async getFeedData(userId: string, page: number, fetcher: () => Promise<any>) {
    const key = CacheService.generateKey('feed', userId, page);
    let data = await cacheService.get(key);
    
    if (!data) {
      data = await fetcher();
      await cacheService.set(key, data, { ttl: 180 }); // 3 minutes for feeds
    }
    
    return data;
  }

  // Invalidate user-related caches
  static async invalidateUserCaches(userId: string) {
    await cacheService.invalidatePattern(`user:${userId}*`);
    await cacheService.invalidatePattern(`feed:${userId}*`);
  }

  // Global data cache (less frequent changes)
  static async getGlobalData(key: string, fetcher: () => Promise<any>) {
    const cacheKey = CacheService.generateKey('global', key);
    let data = await cacheService.get(cacheKey);
    
    if (!data) {
      data = await fetcher();
      await cacheService.set(cacheKey, data, { ttl: 1800 }); // 30 minutes
    }
    
    return data;
  }
}

export default cacheService;
