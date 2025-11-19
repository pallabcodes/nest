/**
 * Cache Manager
 *
 * Intelligent cache management system that coordinates multiple cache layers,
 * implements cache invalidation strategies, and provides query result caching.
 *
 * @module cache/cache-manager
 */

import {
  Cache,
  SyncCache,
  CacheOptions,
  InvalidationRule,
  createCacheKey,
  createInvalidationRule,
} from './cache-interface.js';
import { MemoryCache } from './memory-cache.js';
import { RedisCache } from './redis-cache.js';

/**
 * Cache layer configuration.
 */
export interface CacheLayer {
  /**
   * Cache implementation.
   */
  cache: Cache | SyncCache;

  /**
   * Layer priority (lower numbers = higher priority).
   */
  priority: number;

  /**
   * Whether this layer should be used for reads.
   */
  readEnabled: boolean;

  /**
   * Whether this layer should be used for writes.
   */
  writeEnabled: boolean;

  /**
   * TTL multiplier for this layer (1.0 = same as requested TTL).
   */
  ttlMultiplier: number;
}

/**
 * Cache warming strategy.
 */
export interface CacheWarmingStrategy {
  /**
   * Strategy name.
   */
  name: string;

  /**
   * Whether the strategy is enabled.
   */
  enabled: boolean;

  /**
   * Execute the warming strategy.
   */
  execute: (cacheManager: CacheManager) => Promise<void>;
}

/**
 * Cache invalidation strategy.
 */
export interface InvalidationStrategy {
  /**
   * Strategy name.
   */
  name: string;

  /**
   * Pattern to match for invalidation.
   */
  pattern: string;

  /**
   * Type of invalidation.
   */
  type: 'table' | 'relationship' | 'custom';

  /**
   * Execute the invalidation strategy.
   */
  execute: (cacheManager: CacheManager, affectedTables: string[]) => Promise<number>;
}

/**
 * Cache manager configuration.
 */
export interface CacheManagerOptions {
  /**
   * Cache layers configuration.
   */
  layers?: CacheLayer[];

  /**
   * Default cache key prefix.
   */
  keyPrefix?: string;

  /**
   * Whether to enable query result caching.
   */
  enableQueryCaching?: boolean;

  /**
   * Default TTL for query results.
   */
  queryCacheTtl?: number;

  /**
   * Cache invalidation rules.
   */
  invalidationRules?: InvalidationRule[];

  /**
   * Cache invalidation strategies.
   */
  invalidationStrategies?: InvalidationStrategy[];

  /**
   * Whether to enable cache warming.
   */
  enableCacheWarming?: boolean;

  /**
   * Cache warming interval in milliseconds.
   */
  warmingInterval?: number;

  /**
   * Cache warming strategies.
   */
  warmingStrategies?: CacheWarmingStrategy[];

  /**
   * Custom cache key generator function.
   */
  keyGenerator?: (operation: string, params: unknown[]) => string;

  /**
   * Whether to enable relationship-based invalidation.
   */
  enableRelationshipInvalidation?: boolean;

  /**
   * Maximum cache warming queries per cycle.
   */
  maxWarmingQueries?: number;

  /**
   * Whether to enable cache metrics collection.
   */
  enableMetrics?: boolean;
}

/**
 * Query cache entry.
 */
export interface QueryCacheEntry {
  /**
   * SQL query string.
   */
  sql: string;

  /**
   * Query parameters.
   */
  params: unknown[];

  /**
   * Cached result.
   */
  result: unknown;

  /**
   * Tables involved in the query.
   */
  tables: string[];

  /**
   * Cache timestamp.
   */
  timestamp: number;
}

/**
 * Cache Manager
 *
 * Intelligent multi-layer cache management with automatic invalidation,
 * query result caching, and performance optimization.
 */
export class CacheManager {
  private layers: CacheLayer[] = [];
  private options: Required<CacheManagerOptions>;
  private warmingTimer?: NodeJS.Timeout;
  private queryCache = new Map<string, QueryCacheEntry>();
  private warmingStrategies: CacheWarmingStrategy[] = [];
  private invalidationStrategies: InvalidationStrategy[] = [];
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    cacheInvalidations: 0,
    warmingCycles: 0,
    totalWarmedQueries: 0,
  };

  constructor(options: CacheManagerOptions = {}) {
    this.options = {
      layers: [],
      keyPrefix: 'neatorm:',
      enableQueryCaching: true,
      queryCacheTtl: 300000, // 5 minutes
      invalidationRules: [],
      invalidationStrategies: [],
      enableCacheWarming: false,
      warmingInterval: 300000, // 5 minutes
      warmingStrategies: [],
      keyGenerator: this.defaultKeyGenerator,
      enableRelationshipInvalidation: true,
      maxWarmingQueries: 50,
      enableMetrics: true,
      ...options,
    };

    // Initialize default layers if none provided
    if (this.options.layers.length === 0) {
      this.initializeDefaultLayers();
    } else {
      this.layers = [...this.options.layers].sort((a, b) => a.priority - b.priority);
    }

    // Initialize default strategies
    this.initializeDefaultStrategies();

    // Start cache warming if enabled
    if (this.options.enableCacheWarming) {
      this.startCacheWarming();
    }
  }

  /**
   * Initialize default cache warming and invalidation strategies.
   */
  private initializeDefaultStrategies(): void {
    // Default warming strategies
    this.warmingStrategies = [
      {
        name: 'frequently-accessed-tables',
        enabled: true,
        execute: async (cacheManager) => {
          // Warm frequently accessed tables (users, products, orders, etc.)
          const commonTables = ['users', 'products', 'orders', 'categories'];
          for (const table of commonTables.slice(0, this.options.maxWarmingQueries!)) {
            // In a real implementation, this would query the table and cache results
            // For now, just log the warming activity
            if (this.options.enableMetrics) {
              this.metrics.totalWarmedQueries++;
            }
          }
        },
      },
      {
        name: 'recent-queries',
        enabled: true,
        execute: async (cacheManager) => {
          // Re-warm recently cached queries
          const recentEntries = Array.from(this.queryCache.entries())
            .sort(([, a], [, b]) => b.timestamp - a.timestamp)
            .slice(0, Math.floor(this.options.maxWarmingQueries! / 2));

          for (const [cacheKey, entry] of recentEntries) {
            // Re-cache the query result with extended TTL
            await cacheManager.set(cacheKey, entry.result, this.options.queryCacheTtl! * 2);
            if (this.options.enableMetrics) {
              this.metrics.totalWarmedQueries++;
            }
          }
        },
      },
      ...this.options.warmingStrategies!,
    ];

    // Default invalidation strategies
    this.invalidationStrategies = [
      {
        name: 'table-based',
        pattern: 'table:*',
        type: 'table',
        execute: async (cacheManager, affectedTables) => {
          let totalInvalidated = 0;
          for (const table of affectedTables) {
            const invalidated = await cacheManager.invalidate([
              createInvalidationRule(`${table}:`, 'prefix'),
            ]);
            totalInvalidated += invalidated;
          }
          return totalInvalidated;
        },
      },
      {
        name: 'relationship-based',
        pattern: 'relationship:*',
        type: 'relationship',
        execute: async (cacheManager, affectedTables) => {
          if (!this.options.enableRelationshipInvalidation) return 0;

          // Invalidate related table caches
          const relationshipMappings: Record<string, string[]> = {
            users: ['orders', 'user_profiles'],
            products: ['order_items', 'product_categories'],
            orders: ['order_items', 'payments'],
            categories: ['products', 'subcategories'],
          };

          let totalInvalidated = 0;
          for (const table of affectedTables) {
            const relatedTables = relationshipMappings[table] || [];
            for (const relatedTable of relatedTables) {
              const invalidated = await cacheManager.invalidate([
                createInvalidationRule(`${relatedTable}:`, 'prefix'),
              ]);
              totalInvalidated += invalidated;
            }
          }
          return totalInvalidated;
        },
      },
      ...this.options.invalidationStrategies!,
    ];
  }

  /**
   * Initialize default cache layers (L1 memory + L2 Redis if available).
   */
  private async initializeDefaultLayers(): Promise<void> {
    // L1: In-memory cache (highest priority)
    const l1Cache = new MemoryCache({
      maxEntries: 10000,
      maxSize: 50 * 1024 * 1024, // 50MB
      defaultTtl: 300000, // 5 minutes
    });

    this.layers.push({
      cache: l1Cache,
      priority: 1,
      readEnabled: true,
      writeEnabled: true,
      ttlMultiplier: 1.0,
    });

    // L2: Redis cache (lower priority, longer TTL)
    try {
      const l2Cache = new RedisCache({
        defaultTtl: 1800000, // 30 minutes
      });

      // Test connection
      await l2Cache.get('test');
      await l2Cache.delete('test');

      this.layers.push({
        cache: l2Cache,
        priority: 2,
        readEnabled: true,
        writeEnabled: true,
        ttlMultiplier: 6.0, // 6x longer TTL
      });

      console.log('Cache Manager: Redis L2 cache initialized');
    } catch (error) {
      console.warn('Cache Manager: Redis not available, using memory-only caching');
    }
  }

  /**
   * Get a value from cache (checks all layers).
   */
  async get<T = unknown>(key: string): Promise<T | undefined> {
    // Check layers in priority order
    for (const layer of this.layers) {
      if (!layer.readEnabled) continue;

      try {
        const value = await layer.cache.get<T>(key);
        if (value !== undefined) {
          // Update higher priority layers with the found value
          await this.updateHigherPriorityLayers(key, value, layer.priority);

          if (this.options.enableMetrics) {
            this.metrics.cacheHits++;
          }

          return value;
        }
      } catch (error) {
        console.warn(`Cache layer ${layer.priority} read error:`, error);
      }
    }

    if (this.options.enableMetrics) {
      this.metrics.cacheMisses++;
    }

    return undefined;
  }

  /**
   * Set a value in all enabled write layers.
   */
  async set<T = unknown>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const layer of this.layers) {
      if (!layer.writeEnabled) continue;

      const layerTtl = ttl ? ttl * layer.ttlMultiplier : undefined;
      promises.push(layer.cache.set(key, value, layerTtl));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Delete a value from all layers.
   */
  async delete(key: string): Promise<boolean> {
    const promises: Promise<boolean>[] = [];

    for (const layer of this.layers) {
      promises.push(layer.cache.delete(key));
    }

    const results = await Promise.allSettled(promises);
    return results.some(result =>
      result.status === 'fulfilled' && result.value
    );
  }

  /**
   * Clear all cache layers.
   */
  async clear(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const layer of this.layers) {
      promises.push(layer.cache.clear());
    }

    await Promise.allSettled(promises);
  }

  /**
   * Invalidate cache entries based on patterns.
   */
  async invalidate(patterns: InvalidationRule[]): Promise<number> {
    let totalInvalidated = 0;

    for (const layer of this.layers) {
      try {
        const invalidated = await layer.cache.invalidate(patterns);
        totalInvalidated += invalidated;
      } catch (error) {
        console.warn(`Cache layer ${layer.priority} invalidate error:`, error);
      }
    }

    return totalInvalidated;
  }

  /**
   * Cache a query result with automatic invalidation.
   */
  async cacheQueryResult(
    sql: string,
    params: unknown[],
    result: unknown,
    tables: string[] = [],
    ttl?: number
  ): Promise<void> {
    if (!this.options.enableQueryCaching) return;

    const cacheKey = this.generateQueryKey(sql, params);
    const effectiveTtl = ttl || this.options.queryCacheTtl;

    // Store in query cache for invalidation tracking
    this.queryCache.set(cacheKey, {
      sql,
      params,
      result,
      tables,
      timestamp: Date.now(),
    });

    // Store in cache layers
    await this.set(cacheKey, result, effectiveTtl);

    // Set up table-based invalidation rules
    if (tables.length > 0) {
      const invalidationRules = tables.map(table =>
        createInvalidationRule(table, 'prefix')
      );
      // Note: We don't immediately invalidate, but track for future invalidation
    }
  }

  /**
   * Get a cached query result.
   */
  async getCachedQueryResult(
    sql: string,
    params: unknown[]
  ): Promise<unknown | undefined> {
    if (!this.options.enableQueryCaching) return undefined;

    const cacheKey = this.generateQueryKey(sql, params);
    return this.get(cacheKey);
  }

  /**
   * Invalidate cached queries for specific tables using strategies.
   */
  async invalidateTableCache(tables: string[]): Promise<void> {
    if (!this.options.enableQueryCaching) return;

    // Execute invalidation strategies
    let totalInvalidated = 0;
    for (const strategy of this.invalidationStrategies) {
      if (strategy.enabled !== false) { // Default to enabled
        try {
          const invalidated = await strategy.execute(this, tables);
          totalInvalidated += invalidated;
        } catch (error) {
          console.warn(`Invalidation strategy ${strategy.name} failed:`, error);
        }
      }
    }

    // Fallback: direct query cache invalidation
    const keysToDelete: string[] = [];
    for (const [cacheKey, entry] of this.queryCache.entries()) {
      if (entry.tables.some(table => tables.includes(table))) {
        keysToDelete.push(cacheKey);
      }
    }

    // Delete from query cache
    for (const key of keysToDelete) {
      this.queryCache.delete(key);
    }

    // Delete from cache layers
    for (const key of keysToDelete) {
      await this.delete(key);
    }

    if (this.options.enableMetrics) {
      this.metrics.cacheInvalidations += totalInvalidated;
    }
  }

  /**
   * Get cache statistics including new metrics.
   */
  async getStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {
      layers: [],
      queryCache: {
        entries: this.queryCache.size,
      },
      metrics: this.options.enableMetrics ? { ...this.metrics } : null,
      strategies: {
        warming: this.warmingStrategies.map(s => ({
          name: s.name,
          enabled: s.enabled,
        })),
        invalidation: this.invalidationStrategies.map(s => ({
          name: s.name,
          type: s.type,
          enabled: s.enabled !== false,
        })),
      },
      configuration: {
        enableQueryCaching: this.options.enableQueryCaching,
        enableCacheWarming: this.options.enableCacheWarming,
        enableRelationshipInvalidation: this.options.enableRelationshipInvalidation,
        enableMetrics: this.options.enableMetrics,
        queryCacheTtl: this.options.queryCacheTtl,
        warmingInterval: this.options.warmingInterval,
        maxWarmingQueries: this.options.maxWarmingQueries,
      },
    };

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      try {
        const layerStats = await layer.cache.getStats();
        stats.layers.push({
          priority: layer.priority,
          type: layer.cache.constructor.name,
          readEnabled: layer.readEnabled,
          writeEnabled: layer.writeEnabled,
          ttlMultiplier: layer.ttlMultiplier,
          ...layerStats,
        });
      } catch (error) {
        stats.layers.push({
          priority: layer.priority,
          type: layer.cache.constructor.name,
          readEnabled: layer.readEnabled,
          writeEnabled: layer.writeEnabled,
          ttlMultiplier: layer.ttlMultiplier,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return stats;
  }

  /**
   * Add a cache layer.
   */
  addLayer(layer: CacheLayer): void {
    this.layers.push(layer);
    this.layers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a cache layer by priority.
   */
  removeLayer(priority: number): void {
    this.layers = this.layers.filter(layer => layer.priority !== priority);
  }

  /**
   * Close all cache layers and clean up resources.
   */
  async close(): Promise<void> {
    if (this.warmingTimer) {
      clearInterval(this.warmingTimer);
    }

    const promises: Promise<void>[] = [];

    for (const layer of this.layers) {
      promises.push(layer.cache.close());
    }

    await Promise.allSettled(promises);
    this.layers = [];
  }

  /**
   * Update higher priority layers with a found value.
   */
  private async updateHigherPriorityLayers<T>(
    key: string,
    value: T,
    foundInPriority: number
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const layer of this.layers) {
      if (layer.priority < foundInPriority && layer.writeEnabled) {
        promises.push(layer.cache.set(key, value));
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * Generate a cache key for a query.
   */
  private generateQueryKey(sql: string, params: unknown[]): string {
    return this.options.keyGenerator('query', [sql, ...params]);
  }

  /**
   * Default cache key generator.
   */
  private defaultKeyGenerator(operation: string, params: unknown[]): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify([operation, params]))
      .digest('hex');

    return createCacheKey(this.options.keyPrefix, operation, hash);
  }

  /**
   * Start cache warming timer.
   */
  private startCacheWarming(): void {
    this.warmingTimer = setInterval(() => {
      this.performCacheWarming().catch(error => {
        console.warn('Cache warming error:', error);
      });
    }, this.options.warmingInterval!);

    this.warmingTimer.unref();
  }

  /**
   * Perform cache warming using configured strategies.
   */
  private async performCacheWarming(): Promise<void> {
    if (!this.options.enableCacheWarming) return;

    if (this.options.enableMetrics) {
      this.metrics.warmingCycles++;
    }

    for (const strategy of this.warmingStrategies) {
      if (strategy.enabled) {
        try {
          await strategy.execute(this);
        } catch (error) {
          console.warn(`Cache warming strategy ${strategy.name} failed:`, error);
        }
      }
    }

    console.log(`Cache warming cycle ${this.metrics.warmingCycles} completed`);
  }
}
