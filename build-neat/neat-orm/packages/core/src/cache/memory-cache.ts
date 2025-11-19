/**
 * In-Memory LRU Cache
 *
 * High-performance in-memory cache with LRU (Least Recently Used) eviction.
 * Implements the SyncCache interface for synchronous operations.
 *
 * @module cache/memory-cache
 */

import {
  SyncCache,
  CacheOptions,
  CacheEntry,
  CacheStats,
  InvalidationRule,
  InvalidationPattern,
  calculateSize,
} from './cache-interface.js';

/**
 * Doubly-linked list node for LRU tracking.
 */
class LRUListNode<T = unknown> {
  constructor(
    public key: string,
    public value: CacheEntry<T>,
    public prev: LRUListNode<T> | null = null,
    public next: LRUListNode<T> | null = null
  ) {}
}

/**
 * LRU (Least Recently Used) doubly-linked list for eviction tracking.
 */
class LRUList<T = unknown> {
  private head: LRUListNode<T> | null = null;
  private tail: LRUListNode<T> | null = null;
  private size = 0;

  /**
   * Add a node to the front (most recently used).
   */
  addToFront(node: LRUListNode<T>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }

    this.size++;
  }

  /**
   * Move a node to the front (mark as recently used).
   */
  moveToFront(node: LRUListNode<T>): void {
    if (node === this.head) {
      return;
    }

    // Remove from current position
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node === this.tail) {
      this.tail = node.prev;
    }

    // Add to front
    this.addToFront(node);
    this.size--; // addToFront increments, so decrement to maintain count
  }

  /**
   * Remove the least recently used node (tail).
   */
  removeLRU(): LRUListNode<T> | null {
    if (!this.tail) {
      return null;
    }

    const lru = this.tail;
    this.tail = lru.prev;

    if (this.tail) {
      this.tail.next = null;
    } else {
      this.head = null;
    }

    lru.prev = null;
    lru.next = null;
    this.size--;

    return lru;
  }

  /**
   * Remove a specific node.
   */
  remove(node: LRUListNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node === this.head) {
      this.head = node.next;
    }
    if (node === this.tail) {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
    this.size--;
  }

  /**
   * Get the current size.
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Check if list is empty.
   */
  isEmpty(): boolean {
    return this.size === 0;
  }
}

/**
 * In-Memory LRU Cache
 *
 * High-performance synchronous cache with LRU eviction policy.
 * Perfect for caching frequently accessed data in memory.
 */
export class MemoryCache implements SyncCache {
  private cache = new Map<string, LRUListNode>();
  private lruList = new LRUList();
  private options: Required<CacheOptions>;
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

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTtl: 0, // No default TTL
      maxEntries: 10000,
      maxSize: 100 * 1024 * 1024, // 100MB
      enableStats: true,
      ...options,
    };
  }

  /**
   * Get a value from cache.
   */
  async get<T = unknown>(key: string): Promise<T | undefined> {
    const startTime = Date.now();
    const result = this.getSync<T>(key);

    if (this.options.enableStats) {
      this.retrievalTimes.push(Date.now() - startTime);
      if (this.retrievalTimes.length > 100) {
        this.retrievalTimes.shift();
      }
    }

    return result;
  }

  /**
   * Synchronous get operation.
   */
  getSync<T = unknown>(key: string): T | undefined {
    const node = this.cache.get(key);

    if (!node) {
      if (this.options.enableStats) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(node.value)) {
      this.deleteSync(key);
      if (this.options.enableStats) {
        this.stats.expirations++;
        this.stats.misses++;
        this.updateHitRate();
      }
      return undefined;
    }

    // Mark as recently used
    this.lruList.moveToFront(node);
    node.value.accessCount++;
    node.value.lastAccessed = Date.now();

    if (this.options.enableStats) {
      this.stats.hits++;
      this.updateHitRate();
    }

    return node.value.value as T;
  }

  /**
   * Set a value in cache.
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    this.setSync(key, value, ttl);
  }

  /**
   * Synchronous set operation.
   */
  setSync<T = unknown>(key: string, value: T, ttl?: number): void {
    const size = calculateSize(value);
    const expiresAt = ttl ? Date.now() + ttl : undefined;

    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
    };

    // Remove existing entry if it exists
    this.deleteSync(key);

    // Check size limits before adding
    this.enforceSizeLimits();

    // Create new node and add to cache
    const node = new LRUListNode(key, entry);
    this.cache.set(key, node);
    this.lruList.addToFront(node);

    if (this.options.enableStats) {
      this.stats.entries++;
      this.stats.totalSize += size;
    }
  }

  /**
   * Delete a value from cache.
   */
  async delete(key: string): Promise<boolean> {
    return this.deleteSync(key);
  }

  /**
   * Synchronous delete operation.
   */
  deleteSync(key: string): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    this.cache.delete(key);
    this.lruList.remove(node);

    if (this.options.enableStats) {
      this.stats.entries--;
      this.stats.totalSize -= node.value.size;
    }

    return true;
  }

  /**
   * Clear all values from cache.
   */
  async clear(): Promise<void> {
    this.clearSync();
  }

  /**
   * Synchronous clear operation.
   */
  clearSync(): void {
    this.cache.clear();
    this.lruList = new LRUList();

    if (this.options.enableStats) {
      this.stats.entries = 0;
      this.stats.totalSize = 0;
      this.stats.evictions = 0;
      this.stats.expirations = 0;
    }
  }

  /**
   * Check if a key exists in cache.
   */
  async has(key: string): Promise<boolean> {
    return this.hasSync(key);
  }

  /**
   * Synchronous has operation.
   */
  hasSync(key: string): boolean {
    const node = this.cache.get(key);
    return node !== undefined && !this.isExpired(node.value);
  }

  /**
   * Get all keys matching a pattern.
   */
  async keys(pattern?: string, type: InvalidationPattern = 'exact'): Promise<string[]> {
    return this.keysSync(pattern, type);
  }

  /**
   * Synchronous keys operation.
   */
  keysSync(pattern?: string, type: InvalidationPattern = 'exact'): string[] {
    let keys = Array.from(this.cache.keys());

    if (pattern) {
      keys = keys.filter(key => {
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
      });
    }

    return keys;
  }

  /**
   * Invalidate cache entries based on patterns.
   */
  async invalidate(patterns: InvalidationRule[]): Promise<number> {
    return this.invalidateSync(patterns);
  }

  /**
   * Synchronous invalidate operation.
   */
  invalidateSync(patterns: InvalidationRule[]): number {
    let invalidated = 0;

    for (const pattern of patterns) {
      const keysToDelete = this.keysSync(pattern.pattern, pattern.type);
      for (const key of keysToDelete) {
        if (this.deleteSync(key)) {
          invalidated++;
        }
      }
    }

    return invalidated;
  }

  /**
   * Get cache statistics.
   */
  async getStats(): Promise<CacheStats> {
    return this.getStatsSync();
  }

  /**
   * Synchronous stats operation.
   */
  getStatsSync(): CacheStats {
    return {
      ...this.stats,
      averageRetrievalTime: this.retrievalTimes.length > 0
        ? this.retrievalTimes.reduce((a, b) => a + b, 0) / this.retrievalTimes.length
        : 0,
    };
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
    this.clearSync();
  }

  /**
   * Check if a cache entry has expired.
   */
  private isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt ? Date.now() > entry.expiresAt : false;
  }

  /**
   * Enforce size limits by evicting entries if necessary.
   */
  private enforceSizeLimits(): void {
    // Evict expired entries first
    for (const [key, node] of this.cache.entries()) {
      if (this.isExpired(node.value)) {
        this.deleteSync(key);
        if (this.options.enableStats) {
          this.stats.expirations++;
        }
      }
    }

    // Evict based on max entries
    while (
      this.options.maxEntries &&
      this.cache.size >= this.options.maxEntries
    ) {
      this.evictLRU();
    }

    // Evict based on max size
    while (
      this.options.maxSize &&
      this.stats.totalSize >= this.options.maxSize
    ) {
      this.evictLRU();
    }
  }

  /**
   * Evict the least recently used entry.
   */
  private evictLRU(): void {
    const lruNode = this.lruList.removeLRU();

    if (lruNode) {
      this.cache.delete(lruNode.key);

      if (this.options.enableStats) {
        this.stats.entries--;
        this.stats.totalSize -= lruNode.value.size;
        this.stats.evictions++;
      }
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
