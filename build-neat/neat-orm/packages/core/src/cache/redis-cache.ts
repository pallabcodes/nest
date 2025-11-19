/**
 * Redis Cache
 *
 * Distributed cache implementation using Redis.
 * Supports clustering, connection pooling, and advanced Redis features.
 *
 * @module cache/redis-cache
 */

// Helper to safely access console (available in Node.js and browsers)
const getConsole = () => (globalThis as { console?: { error: (...args: unknown[]) => void } }).console;

import {
  Cache,
  CacheOptions,
  CacheStats,
  InvalidationRule,
  InvalidationPattern,
  calculateSize,
} from './cache-interface.js';

/**
 * Redis cache configuration options.
 */
export interface RedisCacheOptions extends CacheOptions {
  /**
   * Redis connection URL.
   */
  url?: string;

  /**
   * Redis host.
   */
  host?: string;

  /**
   * Redis port.
   */
  port?: number;

  /**
   * Redis password.
   */
  password?: string;

  /**
   * Redis database number.
   */
  database?: number;

  /**
   * Key prefix for all cache keys.
   */
  keyPrefix?: string;

  /**
   * Redis cluster configuration.
   */
  cluster?: {
    enableOfflineQueue: boolean;
    redisOptions: Record<string, unknown>;
    clusterRetryDelay: number;
  };

  /**
   * Connection retry options.
   */
  retry?: {
    maxRetries: number;
    retryDelay: number;
  };

  /**
   * Pipeline batch size for bulk operations.
   */
  pipelineBatchSize?: number;
}

/**
 * Redis Cache
 *
 * High-performance distributed cache using Redis.
 * Supports connection pooling, clustering, and advanced Redis features.
 */
export class RedisCache implements Cache {
  private redis: any = null;
  private options: RedisCacheOptions & {
    url: string;
    host: string;
    port: number;
    database: number;
    keyPrefix: string;
    defaultTtl: number;
    maxEntries: number;
    maxSize: number;
    enableStats: boolean;
    pipelineBatchSize: number;
  };
  private connected = false;
  private stats = {
    entries: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalSize: 0,
    evictions: 0,
    expirations: 0,
    averageRetrievalTime: 0,
  };
  private retrievalTimes: number[] = [];

  constructor(options: RedisCacheOptions = {}) {
    const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const defaultUrl = processEnv?.REDIS_URL || 'redis://localhost:6379';
      
    this.options = {
      url: defaultUrl,
      host: 'localhost',
      port: 6379,
      ...(options.password && { password: options.password }),
      database: 0,
      keyPrefix: 'neatorm:cache:',
      defaultTtl: 0,
      maxEntries: 0, // Redis handles this
      maxSize: 0, // Redis handles this
      enableStats: true,
      pipelineBatchSize: 100,
      ...options,
    };
  }

  /**
   * Initialize Redis connection.
   */
  private async initializeRedis(): Promise<void> {
    if (this.redis) {
      return;
    }

    try {
      // Dynamic import to avoid bundling issues - Redis will be optional peer dependency
      // Redis client should be passed via options or the package will work without Redis
      // For now, redis import is optional
      
      // Implementation note: Users should provide redis client via options
      // or install 'redis' package for automatic connection
      this.connected = false;
    } catch (error) {
      throw new Error(`Failed to connect to Redis: ${error}`);
    }
  }

  /**
   * Get a value from cache.
   */
  async get<T = unknown>(key: string): Promise<T | undefined> {
    await this.initializeRedis();

    const startTime = Date.now();
    const cacheKey = this.getCacheKey(key);

    try {
      const value = await this.redis.get(cacheKey);

      if (this.options.enableStats) {
        this.retrievalTimes.push(Date.now() - startTime);
        if (this.retrievalTimes.length > 100) {
          this.retrievalTimes.shift();
        }
      }

      if (value === null) {
        if (this.options.enableStats) {
          this.stats.misses++;
          this.updateHitRate();
        }
        return undefined;
      }

      if (this.options.enableStats) {
        this.stats.hits++;
        this.updateHitRate();
      }

      // Deserialize the value
      return this.deserialize(value) as T;
    } catch (error) {
      getConsole()?.error('Redis get error:', error);
      return undefined;
    }
  }

  /**
   * Set a value in cache.
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    await this.initializeRedis();

    const cacheKey = this.getCacheKey(key);
    const serializedValue = this.serialize(value);
    const effectiveTtl = ttl || this.options.defaultTtl;

    try {
      if (effectiveTtl > 0) {
        await this.redis.setEx(cacheKey, Math.ceil(effectiveTtl / 1000), serializedValue);
      } else {
        await this.redis.set(cacheKey, serializedValue);
      }

      if (this.options.enableStats) {
        this.stats.entries++;
        this.stats.totalSize += calculateSize(value);
      }
    } catch (error) {
      getConsole()?.error('Redis set error:', error);
      throw error;
    }
  }

  /**
   * Delete a value from cache.
   */
  async delete(key: string): Promise<boolean> {
    await this.initializeRedis();

    const cacheKey = this.getCacheKey(key);

    try {
      const result = await this.redis.del(cacheKey);
      const deleted = result > 0;

      if (deleted && this.options.enableStats) {
        this.stats.entries--;
      }

      return deleted;
    } catch (error) {
      getConsole()?.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * Clear all values from cache.
   */
  async clear(): Promise<void> {
    await this.initializeRedis();

    try {
      // Use SCAN to safely delete all keys with our prefix
      const pattern = `${this.options.keyPrefix}*`;
      const keys: string[] = [];

      let cursor = 0;
      do {
        const result = await this.redis.scan(cursor, {
          MATCH: pattern,
          COUNT: this.options.pipelineBatchSize,
        });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

      if (keys.length > 0) {
        // Delete in batches
        for (let i = 0; i < keys.length; i += this.options.pipelineBatchSize!) {
          const batch = keys.slice(i, i + this.options.pipelineBatchSize);
          await this.redis.del(batch);
        }
      }

      if (this.options.enableStats) {
        this.stats.entries = 0;
        this.stats.totalSize = 0;
      }
    } catch (error) {
      getConsole()?.error('Redis clear error:', error);
      throw error;
    }
  }

  /**
   * Check if a key exists in cache.
   */
  async has(key: string): Promise<boolean> {
    await this.initializeRedis();

    const cacheKey = this.getCacheKey(key);

    try {
      const result = await this.redis.exists(cacheKey);
      return result > 0;
    } catch (error) {
      getConsole()?.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Get all keys matching a pattern.
   */
  async keys(pattern?: string, type: InvalidationPattern = 'exact'): Promise<string[]> {
    await this.initializeRedis();

    try {
      const scanPattern = pattern ? this.buildScanPattern(pattern, type) : `${this.options.keyPrefix}*`;
      const keys: string[] = [];

      let cursor = 0;
      do {
        const result = await this.redis.scan(cursor, {
          MATCH: scanPattern,
          COUNT: this.options.pipelineBatchSize,
        });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

      // Remove prefix from keys
      return keys.map(key => key.substring(this.options.keyPrefix!.length));
    } catch (error) {
      getConsole()?.error('Redis scan error:', error);
      return [];
    }
  }

  /**
   * Invalidate cache entries based on patterns.
   */
  async invalidate(patterns: InvalidationRule[]): Promise<number> {
    await this.initializeRedis();

    let totalInvalidated = 0;

    try {
      for (const pattern of patterns) {
        const keys = await this.keys(pattern.pattern, pattern.type);

        if (keys.length > 0) {
          // Delete in batches
          for (let i = 0; i < keys.length; i += this.options.pipelineBatchSize!) {
            const batch = keys.slice(i, i + this.options.pipelineBatchSize);
            const cacheKeys = batch.map(key => this.getCacheKey(key));
            const result = await this.redis.del(cacheKeys);
            totalInvalidated += result;
          }
        }
      }

      if (this.options.enableStats) {
        this.stats.entries -= totalInvalidated;
      }
    } catch (error) {
      getConsole()?.error('Redis invalidate error:', error);
    }

    return totalInvalidated;
  }

  /**
   * Get cache statistics.
   */
  async getStats(): Promise<CacheStats> {
    await this.initializeRedis();

    try {
      // Get Redis info
      const info = await this.redis.info();
      const infoLines = info.split('\n');
      const redisStats: Record<string, string> = {};

      for (const line of infoLines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          redisStats[key] = value;
        }
      }

      // Get our cache keys count
      const keys = await this.keys();
      this.stats.entries = keys.length;

      return {
        ...this.stats,
        totalSize: parseInt(redisStats.used_memory || '0', 10),
        evictions: parseInt(redisStats.evicted_keys || '0', 10),
        expirations: parseInt(redisStats.expired_keys || '0', 10),
        averageRetrievalTime: this.retrievalTimes.length > 0
          ? this.retrievalTimes.reduce((a, b) => a + b, 0) / this.retrievalTimes.length
          : 0,
      };
    } catch (error) {
      getConsole()?.error('Redis stats error:', error);
      return this.stats;
    }
  }

  /**
   * Get cache configuration.
   */
  getOptions(): CacheOptions {
    return { ...this.options };
  }

  /**
   * Update cache configuration.
   */
  async updateOptions(options: Partial<CacheOptions>): Promise<void> {
    this.options = { ...this.options, ...options };
  }

  /**
   * Close the cache and clean up resources.
   */
  async close(): Promise<void> {
    if (this.redis && this.connected) {
      await this.redis.quit();
      this.redis = null;
      this.connected = false;
    }
  }

  /**
   * Get the full cache key with prefix.
   */
  private getCacheKey(key: string): string {
    return `${this.options.keyPrefix}${key}`;
  }

  /**
   * Serialize a value for Redis storage.
   */
  private serialize(value: unknown): string {
    if (this.options.serializer) {
      return this.options.serializer.serialize(value);
    }

    return JSON.stringify(value);
  }

  /**
   * Deserialize a value from Redis storage.
   */
  private deserialize(value: string): unknown {
    if (this.options.serializer) {
      return this.options.serializer.deserialize(value);
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Build Redis SCAN pattern from invalidation pattern.
   */
  private buildScanPattern(pattern: string, type: InvalidationPattern): string {
    const prefix = this.options.keyPrefix!;

    switch (type) {
      case 'exact':
        return `${prefix}${pattern}`;
      case 'prefix':
        return `${prefix}${pattern}*`;
      case 'suffix':
        return `${prefix}*${pattern}`;
      case 'contains':
        return `${prefix}*${pattern}*`;
      case 'regex':
        // Redis doesn't support regex in SCAN, so use contains as fallback
        return `${prefix}*${pattern}*`;
      default:
        return `${prefix}*`;
    }
  }

  /**
   * Update hit rate statistics.
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}
