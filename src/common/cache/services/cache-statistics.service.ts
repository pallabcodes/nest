/**
 * Cache Statistics Service
 *
 * Tracks cache performance metrics.
 * Separated from CacheService for better single responsibility.
 */
export class CacheStatisticsService {
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  recordHit(): void {
    this.stats.hits++;
  }

  recordMiss(): void {
    this.stats.misses++;
  }

  recordSet(): void {
    this.stats.sets++;
  }

  recordDelete(): void {
    this.stats.deletes++;
  }

  recordError(): void {
    this.stats.errors++;
  }

  getStats(cacheType: 'redis' | 'memory', enabled: boolean) {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate.toFixed(2)}%`,
      totalRequests,
      cacheType,
      enabled,
    };
  }

  reset(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }
}
