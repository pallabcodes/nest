import { Injectable, Logger } from '@nestjs/common';
import type { CacheEntry } from '../cache.service';
import type { ICacheStorage } from './cache-storage.interface';

/**
 * Memory Cache Storage
 *
 * In-memory cache implementation using Map.
 * Used as fallback when Redis is unavailable.
 */
@Injectable()
export class MemoryCacheStorage implements ICacheStorage {
  private readonly logger = new Logger(MemoryCacheStorage.name);
  private readonly cache = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key);
    if (entry && this.isValidEntry(entry)) {
      return entry as CacheEntry<T>;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  async set<T>(key: string, entry: CacheEntry<T>, ttl: number): Promise<void> {
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    return entry ? this.isValidEntry(entry) : false;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async deleteByTags(_tags: string[]): Promise<number> {
    // Memory cache doesn't support tag-based deletion
    return 0;
  }

  private isValidEntry(entry: CacheEntry): boolean {
    const now = Date.now();
    const expiry = entry.timestamp + entry.ttl * 1000;
    return now < expiry;
  }

  cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const expiry = entry.timestamp + entry.ttl * 1000;
      if (now >= expiry) {
        this.cache.delete(key);
      }
    }
  }
}
