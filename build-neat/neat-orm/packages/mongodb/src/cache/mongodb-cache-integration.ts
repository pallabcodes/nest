/**
 * MongoDB Cache Integration
 *
 * Integrates MongoDB queries with NeatORM's caching layer.
 *
 * @module mongodb/cache
 */

import type { CacheManager } from '@neat-orm/core';
import type { MongoDBAdapter } from '../adapter/mongodb-adapter.js';
import type { MongoDBQueryBuilder } from '../query-builder/mongodb-query-builder.js';
import type { Document, Filter } from 'mongodb';

/**
 * Cached MongoDB query options.
 */
export interface CachedQueryOptions {
  /**
   * Enable caching for this query.
   */
  cache?: boolean;

  /**
   * Cache TTL (time to live) in milliseconds.
   */
  ttl?: number;

  /**
   * Cache key prefix.
   */
  keyPrefix?: string;

  /**
   * Tables/collections that affect this query (for invalidation).
   */
  tables?: string[];
}

/**
 * Create a cache key for a MongoDB query.
 *
 * @param collection - Collection name
 * @param filter - Query filter
 * @param options - Query options
 * @returns Cache key
 */
export function createMongoCacheKey(
  collection: string,
  filter: Filter<Document>,
  options?: any
): string {
  const filterStr = JSON.stringify(filter);
  const optionsStr = options ? JSON.stringify(options) : '';
  return `mongodb:${collection}:${filterStr}:${optionsStr}`;
}

/**
 * Wrapper for MongoDB adapter with caching support.
 */
export class CachedMongoDBAdapter {
  constructor(
    private readonly adapter: MongoDBAdapter,
    private readonly cacheManager: CacheManager
  ) {}

  /**
   * Execute a cached query.
   *
   * @param query - MongoDB query builder
   * @param options - Cache options
   * @returns Query result
   */
  async executeCached<T extends Document>(
    query: MongoDBQueryBuilder<T>,
    options?: CachedQueryOptions
  ): Promise<T[]> {
    if (!options?.cache) {
      // No caching, execute directly
      return query.all();
    }

    // Generate cache key
    const queryJson = query.toJSON();
    const parsed = JSON.parse(queryJson);
    const cacheKey = createMongoCacheKey(
      parsed.collection,
      parsed.filter || {},
      parsed.options
    );

    // Try to get from cache
    const cached = await this.cacheManager.get<T[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute query
    const result = await query.all();

    // Store in cache
    await this.cacheManager.set(cacheKey, result, {
      ttl: options.ttl,
      tags: options.tables || [parsed.collection],
    });

    return result;
  }

  /**
   * Invalidate cache for specific collections.
   *
   * @param collections - Collection names to invalidate
   */
  async invalidateCollections(collections: string[]): Promise<void> {
    for (const collection of collections) {
      await this.cacheManager.invalidate({
        tags: [collection],
      });
    }
  }

  /**
   * Clear all MongoDB caches.
   */
  async clearAll(): Promise<void> {
    await this.cacheManager.clear();
  }

  /**
   * Get the underlying adapter.
   */
  getAdapter(): MongoDBAdapter {
    return this.adapter;
  }

  /**
   * Get the cache manager.
   */
  getCacheManager(): CacheManager {
    return this.cacheManager;
  }
}

