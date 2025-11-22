import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { MemoryCacheStorage } from './storage/memory-cache.storage';
import { CacheStatisticsService } from './services/cache-statistics.service';

export interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
  tags?: string[];
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

/**
 * Cache Service
 *
 * Redis-based caching with memory fallback.
 * Delegates statistics tracking to CacheStatisticsService.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis | null;
  private readonly defaultTtl: number;
  private readonly keyPrefix: string;
  private readonly enabled: boolean;
  private readonly memoryStorage: MemoryCacheStorage;
  private readonly statistics: CacheStatisticsService;

  constructor(private configService: ConfigService) {
    const cacheConfig = this.configService.get('cache') || {};
    this.defaultTtl = cacheConfig.ttl || 300;
    this.keyPrefix = cacheConfig.keyPrefix || 'cache:';
    this.enabled = cacheConfig.enabled !== false;

    this.redis = null;
    this.memoryStorage = new MemoryCacheStorage();
    this.statistics = new CacheStatisticsService();

    if (this.enabled) {
      this.logger.log('Using memory cache (Redis not configured)');
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }

    const fullKey = this.getFullKey(key);

    try {
      if (this.redis) {
        const data = await this.redis.get(fullKey);
        if (data) {
          this.statistics.recordHit();
          const entry: CacheEntry<T> = JSON.parse(data);
          return entry.data;
        }
      } else {
        const entry = await this.memoryStorage.get<T>(fullKey);
        if (entry) {
          this.statistics.recordHit();
          return entry.data;
        }
      }

      this.statistics.recordMiss();
      return null;
    } catch (error) {
      this.statistics.recordError();
      this.logger.error(`Cache get error for key ${key}`, error);
      return null;
    }
  }

  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const fullKey = this.getFullKey(key);
    const ttl = options.ttl || this.defaultTtl;
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
      tags: options.tags,
    };

    try {
      if (this.redis) {
        await this.redis.setex(fullKey, ttl, JSON.stringify(entry));

        if (options.tags) {
          for (const tag of options.tags) {
            await this.redis.sadd(`tag:${tag}`, fullKey);
          }
        }
      } else {
        await this.memoryStorage.set(fullKey, entry, ttl);
      }

      this.statistics.recordSet();
    } catch (error) {
      this.statistics.recordError();
      this.logger.error(`Cache set error for key ${key}`, error);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const fullKey = this.getFullKey(key);

    try {
      if (this.redis) {
        const result = await this.redis.del(fullKey);
        if (result > 0) {
          this.statistics.recordDelete();
        }
        return result > 0;
      }
      const deleted = await this.memoryStorage.delete(fullKey);
      if (deleted) {
        this.statistics.recordDelete();
      }
      return deleted;
    } catch (error) {
      this.statistics.recordError();
      this.logger.error(`Cache delete error for key ${key}`, error);
      return false;
    }
  }

  async deleteByTags(tags: string[]): Promise<number> {
    if (!this.enabled || !this.redis) {
      return 0;
    }

    try {
      let totalDeleted = 0;

      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await this.redis.smembers(tagKey);

        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;
          await this.redis.del(tagKey);
        }
      }

      this.statistics.recordDelete();
      return totalDeleted;
    } catch (error) {
      this.statistics.recordError();
      this.logger.error(`Cache delete by tags error`, error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      if (this.redis) {
        const keys = await this.redis.keys(`${this.keyPrefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        await this.memoryStorage.clear();
      }

      this.logger.log('Cache cleared successfully');
    } catch (error) {
      this.statistics.recordError();
      this.logger.error('Cache clear error', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const fullKey = this.getFullKey(key);

    try {
      if (this.redis) {
        return (await this.redis.exists(fullKey)) > 0;
      }
      return await this.memoryStorage.exists(fullKey);
    } catch (error) {
      this.statistics.recordError();
      this.logger.error(`Cache exists error for key ${key}`, error);
      return false;
    }
  }

  getStats() {
    return this.statistics.getStats(this.redis ? 'redis' : 'memory', this.enabled);
  }

  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  cleanupExpiredEntries(): void {
    if (this.redis) {
      return;
    }
    this.memoryStorage.cleanupExpiredEntries();
  }
}
