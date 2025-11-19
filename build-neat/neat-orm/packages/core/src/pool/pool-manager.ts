/**
 * Pool Manager
 *
 * Manages multiple connection pools and provides centralized pool monitoring.
 *
 * @module pool/pool-manager
 */

import type {
  ConnectionPool,
  PoolStats,
  PoolHealth,
  PoolConfig,
} from './pool-interface.js';
import type { DatabaseAdapter } from '../adapters/base-adapter.js';

/**
 * Pool manager configuration.
 */
export interface PoolManagerConfig {
  /**
   * Default pool configuration for all pools.
   */
  defaultPoolConfig?: PoolConfig;

  /**
   * Whether to log pool manager events.
   */
  logging?: boolean;

  /**
   * Custom logger function.
   */
  logger?: (message: string, data?: unknown) => void;

  /**
   * Interval for collecting pool metrics (in milliseconds).
   */
  metricsInterval?: number;
}

/**
 * Aggregated pool metrics.
 */
export interface AggregatedPoolMetrics {
  /**
   * Total number of managed pools.
   */
  totalPools: number;

  /**
   * Total connections across all pools.
   */
  totalConnections: number;

  /**
   * Total active connections.
   */
  totalActive: number;

  /**
   * Total idle connections.
   */
  totalIdle: number;

  /**
   * Total pending requests.
   */
  totalPending: number;

  /**
   * Total connections created.
   */
  totalCreated: number;

  /**
   * Total connections destroyed.
   */
  totalDestroyed: number;

  /**
   * Total errors across all pools.
   */
  totalErrors: number;

  /**
   * Average connection acquisition time across all pools.
   */
  averageAcquireTime: number;

  /**
   * Per-pool statistics.
   */
  pools: Record<string, PoolStats>;
}

/**
 * Pool Manager
 *
 * Centralized management of multiple connection pools.
 */
export class PoolManager {
  private pools: Map<string, ConnectionPool> = new Map();
  private adapters: Map<string, DatabaseAdapter> = new Map();
  private config: PoolManagerConfig;
  private metricsTimer?: NodeJS.Timeout;

  constructor(config: PoolManagerConfig = {}) {
    this.config = {
      logging: false,
      metricsInterval: 60000,
      ...config,
    };

    if (this.config.metricsInterval) {
      this.startMetricsCollection();
    }
  }

  /**
   * Register a connection pool with an identifier.
   *
   * @param name - Unique identifier for the pool
   * @param pool - Connection pool instance
   * @param adapter - Associated database adapter
   */
  registerPool(
    name: string,
    pool: ConnectionPool,
    adapter: DatabaseAdapter
  ): void {
    if (this.pools.has(name)) {
      throw new Error(`Pool with name '${name}' is already registered`);
    }

    this.pools.set(name, pool);
    this.adapters.set(name, adapter);

    if (this.config.logging && this.config.logger) {
      this.config.logger(`Pool registered: ${name}`, {
        dialect: adapter.dialect,
      });
    }
  }

  /**
   * Unregister and close a connection pool.
   *
   * @param name - Pool identifier
   * @param force - Force close all connections
   */
  async unregisterPool(name: string, force?: boolean): Promise<void> {
    const pool = this.pools.get(name);
    if (!pool) {
      throw new Error(`Pool with name '${name}' not found`);
    }

    await pool.close(force);
    this.pools.delete(name);
    this.adapters.delete(name);

    if (this.config.logging && this.config.logger) {
      this.config.logger(`Pool unregistered: ${name}`);
    }
  }

  /**
   * Get a registered connection pool by name.
   *
   * @param name - Pool identifier
   * @returns Connection pool instance
   */
  getPool(name: string): ConnectionPool {
    const pool = this.pools.get(name);
    if (!pool) {
      throw new Error(`Pool with name '${name}' not found`);
    }
    return pool;
  }

  /**
   * Get the database adapter associated with a pool.
   *
   * @param name - Pool identifier
   * @returns Database adapter instance
   */
  getAdapter(name: string): DatabaseAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter for pool '${name}' not found`);
    }
    return adapter;
  }

  /**
   * Check if a pool is registered.
   *
   * @param name - Pool identifier
   * @returns True if pool is registered
   */
  hasPool(name: string): boolean {
    return this.pools.has(name);
  }

  /**
   * Get all registered pool names.
   *
   * @returns Array of pool names
   */
  getPoolNames(): string[] {
    return Array.from(this.pools.keys());
  }

  /**
   * Get aggregated metrics for all pools.
   *
   * @returns Aggregated pool metrics
   */
  getMetrics(): AggregatedPoolMetrics {
    const poolStats: Record<string, PoolStats> = {};
    let totalConnections = 0;
    let totalActive = 0;
    let totalIdle = 0;
    let totalPending = 0;
    let totalCreated = 0;
    let totalDestroyed = 0;
    let totalErrors = 0;
    let totalAcquireTime = 0;
    let poolCount = 0;

    for (const [name, pool] of this.pools.entries()) {
      const stats = pool.getStats();
      poolStats[name] = stats;

      totalConnections += stats.total;
      totalActive += stats.active;
      totalIdle += stats.idle;
      totalPending += stats.pending;
      totalCreated += stats.created;
      totalDestroyed += stats.destroyed;
      totalErrors += stats.errors;
      totalAcquireTime += stats.averageAcquireTime;
      poolCount++;
    }

    return {
      totalPools: this.pools.size,
      totalConnections,
      totalActive,
      totalIdle,
      totalPending,
      totalCreated,
      totalDestroyed,
      totalErrors,
      averageAcquireTime:
        poolCount > 0 ? totalAcquireTime / poolCount : 0,
      pools: poolStats,
    };
  }

  /**
   * Get health status for all pools.
   *
   * @returns Health status for each pool
   */
  async getHealth(): Promise<Record<string, PoolHealth>> {
    const health: Record<string, PoolHealth> = {};

    for (const [name, pool] of this.pools.entries()) {
      health[name] = await pool.getHealth();
    }

    return health;
  }

  /**
   * Run health checks on all pools.
   */
  async runHealthChecks(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const pool of this.pools.values()) {
      promises.push(pool.runHealthCheck());
    }

    await Promise.allSettled(promises);
  }

  /**
   * Drain all pools to minimum size.
   */
  async drainAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const pool of this.pools.values()) {
      promises.push(pool.drain());
    }

    await Promise.allSettled(promises);

    if (this.config.logging && this.config.logger) {
      this.config.logger('All pools drained');
    }
  }

  /**
   * Close all pools.
   *
   * @param force - Force close all connections
   */
  async closeAll(force?: boolean): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const pool of this.pools.values()) {
      promises.push(pool.close(force));
    }

    await Promise.allSettled(promises);

    this.pools.clear();
    this.adapters.clear();

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    if (this.config.logging && this.config.logger) {
      this.config.logger('All pools closed');
    }
  }

  /**
   * Get configuration for the pool manager.
   */
  getConfig(): PoolManagerConfig {
    return { ...this.config };
  }

  /**
   * Start collecting and logging metrics.
   *
   * @private
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      if (this.config.logging && this.config.logger) {
        const metrics = this.getMetrics();
        this.config.logger('Pool metrics', metrics);
      }
    }, this.config.metricsInterval!);

    this.metricsTimer.unref();
  }
}

