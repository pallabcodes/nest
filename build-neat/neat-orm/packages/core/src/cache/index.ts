/**
 * Cache Module
 *
 * Provides caching functionality for query results and entity data.
 *
 * @module cache
 */

// Export cache interface and types
export type {
  Cache,
  SyncCache,
  CacheEntry,
  CacheStats,
  CacheOptions,
  InvalidationRule,
  InvalidationPattern,
  CacheFactory,
} from './cache-interface.js';

// Export cache implementations
export { MemoryCache } from './memory-cache.js';
export { RedisCache } from './redis-cache.js';

// Export cache manager
export { CacheManager } from './cache-manager.js';
export type {
  CacheLayer,
  CacheManagerOptions,
  QueryCacheEntry,
  CacheWarmingStrategy,
  InvalidationStrategy,
} from './cache-manager.js';

// Export utilities
export {
  createCacheKey,
  parseCacheKey,
  createInvalidationRule,
  calculateSize,
} from './cache-interface.js';
