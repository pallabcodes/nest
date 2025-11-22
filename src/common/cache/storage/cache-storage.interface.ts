import type { CacheEntry } from '../cache.service';

/**
 * Cache Storage Interface
 *
 * Abstraction for different cache storage backends (Redis, Memory, etc.)
 */
export interface ICacheStorage {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, entry: CacheEntry<T>, ttl: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  deleteByTags(tags: string[]): Promise<number>;
}
