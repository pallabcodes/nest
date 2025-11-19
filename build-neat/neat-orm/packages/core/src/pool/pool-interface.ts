/**
 * Connection Pool Interface
 *
 * Defines the contract for database connection pools.
 * Connection pooling improves performance by reusing database connections
 * rather than creating new ones for each query.
 *
 * @module pool/pool-interface
 */

import type { DatabaseConnection } from '../adapters/base-adapter.js';

/**
 * Connection pool configuration.
 */
export interface PoolConfig {
  /**
   * Minimum number of connections to maintain in the pool.
   * @default 2
   */
  min?: number;

  /**
   * Maximum number of connections in the pool.
   * @default 10
   */
  max?: number;

  /**
   * Maximum time (in milliseconds) to wait for a connection.
   * @default 30000
   */
  acquireTimeout?: number;

  /**
   * Maximum time (in milliseconds) a connection can be idle before being released.
   * @default 30000
   */
  idleTimeout?: number;

  /**
   * Maximum lifetime (in milliseconds) of a connection.
   * After this time, the connection will be closed and removed from the pool.
   * @default 3600000 (1 hour)
   */
  maxLifetime?: number;

  /**
   * Interval (in milliseconds) for running connection health checks.
   * @default 60000 (1 minute)
   */
  healthCheckInterval?: number;

  /**
   * SQL query to use for health checks.
   * @default 'SELECT 1'
   */
  healthCheckQuery?: string;

  /**
   * Whether to validate connections before acquisition.
   * @default false
   */
  validateOnAcquire?: boolean;

  /**
   * Whether to log pool events (acquire, release, etc.).
   * @default false
   */
  logging?: boolean;

  /**
   * Custom logger function.
   */
  logger?: (message: string, data?: unknown) => void;
}

/**
 * Connection pool statistics.
 */
export interface PoolStats {
  /**
   * Total number of connections in the pool.
   */
  total: number;

  /**
   * Number of idle connections.
   */
  idle: number;

  /**
   * Number of connections currently in use.
   */
  active: number;

  /**
   * Number of pending acquire requests.
   */
  pending: number;

  /**
   * Total number of connections created.
   */
  created: number;

  /**
   * Total number of connections destroyed.
   */
  destroyed: number;

  /**
   * Total number of connections acquired.
   */
  acquired: number;

  /**
   * Total number of connections released.
   */
  released: number;

  /**
   * Number of failed connection attempts.
   */
  errors: number;

  /**
   * Average connection acquisition time in milliseconds.
   */
  averageAcquireTime: number;

  /**
   * Maximum connection acquisition time in milliseconds.
   */
  maxAcquireTime: number;
}

/**
 * Connection pool health status.
 */
export interface PoolHealth {
  /**
   * Whether the pool is healthy.
   */
  healthy: boolean;

  /**
   * Timestamp of last health check.
   */
  lastCheck: Date;

  /**
   * Number of healthy connections.
   */
  healthyConnections: number;

  /**
   * Number of unhealthy connections.
   */
  unhealthyConnections: number;

  /**
   * Health check errors, if any.
   */
  errors?: string[];
}

/**
 * Connection Pool Interface
 *
 * Manages a pool of database connections for efficient resource usage.
 */
export interface ConnectionPool {
  /**
   * Acquire a connection from the pool.
   * If no connections are available, waits until one becomes available
   * or timeout is reached.
   *
   * @returns Promise resolving to a database connection
   * @throws Error if timeout is reached or pool is closed
   */
  acquire(): Promise<DatabaseConnection>;

  /**
   * Release a connection back to the pool.
   * The connection becomes available for other acquire requests.
   *
   * @param connection - Connection to release
   */
  release(connection: DatabaseConnection): Promise<void>;

  /**
   * Close all connections in the pool and prevent new acquisitions.
   * This should be called when shutting down the application.
   *
   * @param force - If true, forcefully close all connections including active ones
   */
  close(force?: boolean): Promise<void>;

  /**
   * Check if the pool is closed.
   */
  isClosed(): boolean;

  /**
   * Get current pool statistics.
   */
  getStats(): PoolStats;

  /**
   * Get pool health status.
   */
  getHealth(): Promise<PoolHealth>;

  /**
   * Run health checks on all connections.
   * Removes unhealthy connections from the pool.
   */
  runHealthCheck(): Promise<void>;

  /**
   * Drain idle connections to the minimum pool size.
   * Useful for reducing resource usage during low activity periods.
   */
  drain(): Promise<void>;

  /**
   * Get pool configuration.
   */
  getConfig(): PoolConfig;
}

