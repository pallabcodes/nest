/**
 * Cache Interface
 *
 * Defines the contract for all cache implementations in NeatOrm.
 * Supports both in-memory and distributed caching for query result caching.
 *
 * @module cache/cache-interface
 */

/**
 * Cache entry metadata.
 */
export interface CacheEntry<T = unknown> {
  /**
   * Cached value.
   */
  value: T;

  /**
   * Timestamp when the entry was created.
   */
  createdAt: number;

  /**
   * Timestamp when the entry expires (optional).
   */
  expiresAt?: number;

  /**
   * Number of times this entry has been accessed.
   */
  accessCount: number;

  /**
   * Timestamp of last access.
   */
  lastAccessed: number;

  /**
   * Size of the cached value in bytes (approximate).
   */
  size: number;
}

/**
 * Cache statistics.
 */
export interface CacheStats {
  /**
   * Total number of entries in cache.
   */
  entries: number;

  /**
   * Cache hit count.
   */
  hits: number;

  /**
   * Cache miss count.
   */
  misses: number;

  /**
   * Hit rate (hits / (hits + misses)).
   */
  hitRate: number;

  /**
   * Total size of all cached entries in bytes.
   */
  totalSize: number;

  /**
   * Number of entries evicted due to size limits.
   */
  evictions: number;

  /**
   * Number of entries expired.
   */
  expirations: number;

  /**
   * Average time to retrieve a cached value in milliseconds.
   */
  averageRetrievalTime: number;
}

/**
 * Cache configuration options.
 */
export interface CacheOptions {
  /**
   * Default TTL (time to live) in milliseconds.
   */
  defaultTtl?: number;

  /**
   * Maximum number of entries in cache.
   */
  maxEntries?: number;

  /**
   * Maximum total size in bytes.
   */
  maxSize?: number;

  /**
   * Whether to enable statistics collection.
   */
  enableStats?: boolean;

  /**
   * Custom serializer for complex objects.
   */
  serializer?: {
    serialize: (value: unknown) => string;
    deserialize: (value: string) => unknown;
  };

  /**
   * Compression options for large values.
   */
  compression?: {
    enabled: boolean;
    threshold: number; // Minimum size to compress (bytes)
    algorithm: 'gzip' | 'deflate';
  };
}

/**
 * Cache invalidation patterns.
 */
export type InvalidationPattern =
  | 'exact'           // Exact key match
  | 'prefix'          // Keys starting with pattern
  | 'suffix'          // Keys ending with pattern
  | 'contains'        // Keys containing pattern
  | 'regex';          // Regular expression match

/**
 * Cache invalidation rule.
 */
export interface InvalidationRule {
  /**
   * Pattern to match.
   */
  pattern: string;

  /**
   * Type of pattern matching.
   */
  type: InvalidationPattern;

  /**
   * Whether this rule applies to the given key.
   */
  matches: (key: string) => boolean;
}

/**
 * Cache Interface
 *
 * Defines the contract that all cache implementations must follow.
 * Provides both synchronous and asynchronous operations for flexibility.
 */
export interface Cache {
  /**
   * Get a value from cache.
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found
   */
  get<T = unknown>(key: string): Promise<T | undefined>;

  /**
   * Set a value in cache.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (optional)
   * @returns Promise that resolves when operation completes
   */
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a value from cache.
   *
   * @param key - Cache key
   * @returns True if key existed and was deleted
   */
  delete(key: string): Promise<boolean>;

  /**
   * Clear all values from cache.
   *
   * @returns Promise that resolves when operation completes
   */
  clear(): Promise<void>;

  /**
   * Check if a key exists in cache.
   *
   * @param key - Cache key
   * @returns True if key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Get all keys matching a pattern.
   *
   * @param pattern - Pattern to match
   * @param type - Type of pattern matching
   * @returns Array of matching keys
   */
  keys(pattern?: string, type?: InvalidationPattern): Promise<string[]>;

  /**
   * Invalidate cache entries based on patterns.
   *
   * @param patterns - Array of invalidation patterns
   * @returns Number of entries invalidated
   */
  invalidate(patterns: InvalidationRule[]): Promise<number>;

  /**
   * Get cache statistics.
   *
   * @returns Cache statistics
   */
  getStats(): Promise<CacheStats>;

  /**
   * Get cache configuration.
   *
   * @returns Current cache options
   */
  getOptions(): CacheOptions;

  /**
   * Update cache configuration.
   *
   * @param options - New cache options
   */
  updateOptions(options: Partial<CacheOptions>): Promise<void>;

  /**
   * Close the cache and clean up resources.
   *
   * @returns Promise that resolves when cleanup is complete
   */
  close(): Promise<void>;
}

/**
 * Synchronous cache interface for in-memory caches.
 */
export interface SyncCache extends Cache {
  /**
   * Synchronous get operation.
   */
  getSync<T = unknown>(key: string): T | undefined;

  /**
   * Synchronous set operation.
   */
  setSync<T = unknown>(key: string, value: T, ttl?: number): void;

  /**
   * Synchronous delete operation.
   */
  deleteSync(key: string): boolean;

  /**
   * Synchronous clear operation.
   */
  clearSync(): void;

  /**
   * Synchronous has operation.
   */
  hasSync(key: string): boolean;

  /**
   * Synchronous keys operation.
   */
  keysSync(pattern?: string, type?: InvalidationPattern): string[];

  /**
   * Synchronous invalidate operation.
   */
  invalidateSync(patterns: InvalidationRule[]): number;

  /**
   * Synchronous stats operation.
   */
  getStatsSync(): CacheStats;
}

/**
 * Cache factory function type.
 */
export type CacheFactory = (options?: CacheOptions) => Cache | SyncCache;

/**
 * Default cache key separator.
 */
export const CACHE_KEY_SEPARATOR = ':';

/**
 * Generate a cache key from multiple parts.
 *
 * @param parts - Key parts to combine
 * @returns Combined cache key
 *
 * @example
 * ```typescript
 * createCacheKey('users', '123', 'profile') // 'users:123:profile'
 * ```
 */
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.map(String).join(CACHE_KEY_SEPARATOR);
}

/**
 * Parse a cache key into its component parts.
 *
 * @param key - Cache key to parse
 * @returns Array of key parts
 *
 * @example
 * ```typescript
 * parseCacheKey('users:123:profile') // ['users', '123', 'profile']
 * ```
 */
export function parseCacheKey(key: string): string[] {
  return key.split(CACHE_KEY_SEPARATOR);
}

/**
 * Create an invalidation rule.
 *
 * @param pattern - Pattern to match
 * @param type - Type of pattern matching
 * @returns Invalidation rule
 */
export function createInvalidationRule(
  pattern: string,
  type: InvalidationPattern
): InvalidationRule {
  return {
    pattern,
    type,
    matches: (key: string) => {
      switch (type) {
        case 'exact':
          return key === pattern;
        case 'prefix':
          return key.startsWith(pattern);
        case 'suffix':
          return key.endsWith(pattern);
        case 'contains':
          return key.includes(pattern);
        case 'regex':
          return new RegExp(pattern).test(key);
        default:
          return false;
      }
    },
  };
}

/**
 * Calculate approximate size of a value in bytes.
 *
 * @param value - Value to measure
 * @returns Size in bytes
 */
export function calculateSize(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'string') {
    return value.length * 2; // UTF-16
  }

  if (typeof value === 'number') {
    return 8;
  }

  if (typeof value === 'boolean') {
    return 1;
  }

  if (Array.isArray(value)) {
    return value.reduce((size, item) => size + calculateSize(item), 0);
  }

  if (typeof value === 'object') {
    let size = 0;
    for (const [key, val] of Object.entries(value)) {
      size += key.length * 2 + calculateSize(val);
    }
    return size;
  }

  return 8; // Default size
}
