/**
 * PostgreSQL Connection Pool
 *
 * Implements connection pooling for PostgreSQL using pg.Pool.
 *
 * @module pool/postgres-pool
 */

import type { Pool as PgPool, PoolClient } from 'pg';
import type {
  ConnectionPool,
  PoolConfig,
  PoolStats,
  PoolHealth,
} from './pool-interface.js';
import type { DatabaseConnection } from '../adapters/base-adapter.js';

/**
 * Wrapper for PostgreSQL pool connection that implements DatabaseConnection.
 */
class PostgresPoolConnection implements DatabaseConnection {
  constructor(private client: PoolClient) {}

  async execute<T>(sql: string, params?: unknown[]) {
    const result = await this.client.query(sql, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount || 0,
      fields: result.fields?.map((field) => ({
        name: field.name,
        tableID: field.tableID,
        columnID: field.columnID,
        dataTypeID: field.dataTypeID,
        dataTypeSize: field.dataTypeSize,
        dataTypeModifier: field.dataTypeModifier,
        format: field.format,
      })),
    };
  }

  async release(): Promise<void> {
    this.client.release();
  }

  async beginTransaction() {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.client.query('BEGIN');
    
    return {
      id: txId,
      isActive: () => true,
      commit: async () => {
        await this.client.query('COMMIT');
      },
      rollback: async () => {
        await this.client.query('ROLLBACK');
      },
      execute: async <T>(sql: string, params?: unknown[]) => {
        const result = await this.client.query(sql, params);
        return {
          rows: result.rows as T[],
          rowCount: result.rowCount || 0,
          fields: result.fields?.map((field) => ({
            name: field.name,
            tableID: field.tableID,
            columnID: field.columnID,
            dataTypeID: field.dataTypeID,
            dataTypeSize: field.dataTypeSize,
            dataTypeModifier: field.dataTypeModifier,
            format: field.format,
          })),
        };
      },
    };
  }
}

/**
 * PostgreSQL Connection Pool
 */
export class PostgresConnectionPool implements ConnectionPool {
  private pool: PgPool;
  private config: PoolConfig;
  private closed: boolean = false;
  private stats: PoolStats = {
    total: 0,
    idle: 0,
    active: 0,
    pending: 0,
    created: 0,
    destroyed: 0,
    acquired: 0,
    released: 0,
    errors: 0,
    averageAcquireTime: 0,
    maxAcquireTime: 0,
  };
  private healthCheckTimer?: NodeJS.Timeout;
  private acquireTimes: number[] = [];

  constructor(pool: PgPool, config: PoolConfig = {}) {
    this.pool = pool;
    this.config = {
      min: 2,
      max: 10,
      acquireTimeout: 30000,
      idleTimeout: 30000,
      maxLifetime: 3600000,
      healthCheckInterval: 60000,
      healthCheckQuery: 'SELECT 1',
      validateOnAcquire: false,
      logging: false,
      ...config,
    };

    // Set up event listeners for statistics
    this.setupEventListeners();

    // Start health check timer
    if (this.config.healthCheckInterval) {
      this.startHealthCheckTimer();
    }
  }

  async acquire(): Promise<DatabaseConnection> {
    if (this.closed) {
      throw new Error('Connection pool is closed');
    }

    const startTime = Date.now();

    try {
      // Acquire with timeout
      const client = await Promise.race([
        this.pool.connect(),
        this.createTimeoutPromise<PoolClient>(
          this.config.acquireTimeout!
        ),
      ]);

      const acquireTime = Date.now() - startTime;
      this.trackAcquireTime(acquireTime);

      this.stats.acquired++;

      // Validate connection if configured
      if (this.config.validateOnAcquire) {
        await this.validateConnection(client);
      }

      if (this.config.logging && this.config.logger) {
        this.config.logger('Connection acquired', {
          acquireTime,
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
        });
      }

      return new PostgresPoolConnection(client);
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  async release(connection: DatabaseConnection): Promise<void> {
    await connection.release();
    this.stats.released++;

    if (this.config.logging && this.config.logger) {
      this.config.logger('Connection released', {
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
      });
    }
  }

  async close(force?: boolean): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    // Stop health check timer
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    if (force) {
      // Force close all connections
      await this.pool.end();
    } else {
      // Wait for active connections to be released, then close
      await this.pool.end();
    }

    if (this.config.logging && this.config.logger) {
      this.config.logger('Connection pool closed', {
        totalAcquired: this.stats.acquired,
        totalReleased: this.stats.released,
        totalErrors: this.stats.errors,
      });
    }
  }

  isClosed(): boolean {
    return this.closed;
  }

  getStats(): PoolStats {
    return {
      ...this.stats,
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      active: this.pool.totalCount - this.pool.idleCount,
      pending: this.pool.waitingCount,
    };
  }

  async getHealth(): Promise<PoolHealth> {
    const stats = this.getStats();
    const errors: string[] = [];

    // Check pool health
    let healthyConnections = 0;
    let unhealthyConnections = 0;

    try {
      // Try to acquire and test a connection
      const client = await this.pool.connect();
      try {
        await client.query(this.config.healthCheckQuery!);
        healthyConnections++;
      } catch (error) {
        unhealthyConnections++;
        errors.push(
          `Health check query failed: ${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        client.release();
      }
    } catch (error) {
      unhealthyConnections++;
      errors.push(
        `Failed to acquire connection: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const healthy = unhealthyConnections === 0 && stats.total > 0;

    return {
      healthy,
      lastCheck: new Date(),
      healthyConnections,
      unhealthyConnections,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async runHealthCheck(): Promise<void> {
    if (this.closed) {
      return;
    }

    try {
      const health = await this.getHealth();

      if (this.config.logging && this.config.logger) {
        this.config.logger('Health check completed', health);
      }

      if (!health.healthy && this.config.logger) {
        this.config.logger('Pool health check failed', health);
      }
    } catch (error) {
      if (this.config.logger) {
        this.config.logger('Health check error', error);
      }
    }
  }

  async drain(): Promise<void> {
    // PostgreSQL's pg pool doesn't expose a direct drain method
    // This is a no-op as pg handles connection lifecycle automatically
    if (this.config.logging && this.config.logger) {
      this.config.logger('Drain requested (handled automatically by pg)');
    }
  }

  getConfig(): PoolConfig {
    return { ...this.config };
  }

  private setupEventListeners(): void {
    this.pool.on('connect', () => {
      this.stats.created++;
    });

    this.pool.on('remove', () => {
      this.stats.destroyed++;
    });

    this.pool.on('error', (error) => {
      this.stats.errors++;
      if (this.config.logger) {
        this.config.logger('Pool error', error);
      }
    });
  }

  private startHealthCheckTimer(): void {
    this.healthCheckTimer = setInterval(() => {
      this.runHealthCheck().catch((error) => {
        if (this.config.logger) {
          this.config.logger('Health check timer error', error);
        }
      });
    }, this.config.healthCheckInterval!);

    // Don't keep the process alive
    this.healthCheckTimer.unref();
  }

  private async validateConnection(client: PoolClient): Promise<void> {
    await client.query(this.config.healthCheckQuery!);
  }

  private trackAcquireTime(time: number): void {
    this.acquireTimes.push(time);

    // Keep only last 100 measurements
    if (this.acquireTimes.length > 100) {
      this.acquireTimes.shift();
    }

    // Update statistics
    this.stats.averageAcquireTime =
      this.acquireTimes.reduce((a, b) => a + b, 0) /
      this.acquireTimes.length;
    this.stats.maxAcquireTime = Math.max(...this.acquireTimes);
  }

  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Connection acquisition timeout after ${timeout}ms`
          )
        );
      }, timeout);
    });
  }
}

