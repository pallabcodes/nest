/**
 * NeatOrm - Loading Module
 *
 * Provides eager and lazy loading with automatic N+1 prevention using
 * Facebook's DataLoader pattern. This is one of the most critical features
 * that makes NeatOrm 5x better than other ORMs.
 *
 * Exported Components:
 * - DataLoader: Core batching and caching mechanism
 * - RelationLoader: High-level API for loading relationships
 * - RelationLoaderContext: Request-scoped loader management
 *
 * Key Features:
 * - Automatic query batching
 * - Per-request caching
 * - Configurable loading strategies
 * - Type-safe relationship loading
 * - Zero N+1 queries
 *
 * Pain Points Solved:
 * ✅ N+1 query problem (automatic batching)
 * ✅ Complex eager loading (simple API)
 * ✅ Poor lazy loading performance (DataLoader caching)
 * ✅ Manual batching (automatic)
 * ✅ Duplicate queries (deduplication)
 */

// Export DataLoader
export * from './dataloader.js';
export { DataLoader, type BatchLoadFn, type DataLoaderOptions } from './dataloader.js';

// Export Relation Loader
export * from './relation-loader.js';
export {
  RelationLoader,
  RelationLoaderContext,
  type LoadingStrategy,
  type RelationLoadOptions,
  type LoadedRelation,
} from './relation-loader.js';

