/**
 * MySQL Connection Pool
 *
 * Implements connection pooling for MySQL using mysql2.Pool.
 *
 * @module pool/mysql-pool
 */

import type { Pool as MySQLPool, PoolConnection } from 'mysql2/promise';
import type {
  ConnectionPool,
  PoolConfig,
  PoolStats,
  PoolHealth,
} from './pool-interface.js';
import type { DatabaseConnection } from '../adapters/base-adapter.js';

/**
 * Wrapper for MySQL pool connection.
 */
class MySQLPoolConnection implements DatabaseConnection {
  constructor(private connection: PoolConnection) {}

  async execute<T>(sql: string, params?: unknown[]) {
    const [results, fields] = await this.connection.execute(sql, params);
    
    if (Array.isArray(results)) {
      return {
        rows: results as T[],
        rowCount: results.length,
        fields: Array.isArray(fields)
          ? fields.map((field) => ({
              name: field.name,
              format: field.type ? String(field.type) : undefined,
            }))
          : undefined,
      };
    }

    return {
      rows: [] as T[],
      rowCount: (results as { affectedRows?: number }).affectedRows || 0,
    };
  }

  async release(): Promise<void> {
    this.connection.release();
  }

  async beginTransaction() {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.connection.beginTransaction();
    
    return {
      id: txId,
      isActive: () => true,
      commit: async () => {
        await this.connection.commit();
      },
      rollback: async () => {
        await this.connection.rollback();
      },
      execute: async <T>(sql: string, params?: unknown[]) => {
        const [results, fields] = await this.connection.execute(sql, params);
        
        if (Array.isArray(results)) {
          return {
            rows: results as T[],
            rowCount: results.length,
            fields: Array.isArray(fields)
              ? fields.map((field) => ({
                  name: field.name,
                  format: field.type ? String(field.type) : undefined,
                }))
              : undefined,
          };
        }

        return {
          rows: [] as T[],
          rowCount: (results as { affectedRows?: number }).affectedRows || 0,
        };
      },
    };
  }
}

/**
 * MySQL Connection Pool
 */
export class MySQLConnectionPool implements ConnectionPool {
  private pool: MySQLPool;
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

  constructor(pool: MySQLPool, config: PoolConfig = {}) {
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
      const connection = await Promise.race([
        this.pool.getConnection(),
        this.createTimeoutPromise<PoolConnection>(
          this.config.acquireTimeout!
        ),
      ]);

      const acquireTime = Date.now() - startTime;
      this.trackAcquireTime(acquireTime);
      this.stats.acquired++;

      if (this.config.validateOnAcquire) {
        await connection.query(this.config.healthCheckQuery!);
      }

      if (this.config.logging && this.config.logger) {
        this.config.logger('Connection acquired', { acquireTime });
      }

      return new MySQLPoolConnection(connection);
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  async release(connection: DatabaseConnection): Promise<void> {
    await connection.release();
    this.stats.released++;

    if (this.config.logging && this.config.logger) {
      this.config.logger('Connection released');
    }
  }

  async close(force?: boolean): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    await this.pool.end();

    if (this.config.logging && this.config.logger) {
      this.config.logger('Connection pool closed');
    }
  }

  isClosed(): boolean {
    return this.closed;
  }

  getStats(): PoolStats {
    return { ...this.stats };
  }

  async getHealth(): Promise<PoolHealth> {
    const errors: string[] = [];
    let healthyConnections = 0;
    let unhealthyConnections = 0;

    try {
      const connection = await this.pool.getConnection();
      try {
        await connection.query(this.config.healthCheckQuery!);
        healthyConnections++;
      } catch (error) {
        unhealthyConnections++;
        errors.push(
          `Health check failed: ${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        connection.release();
      }
    } catch (error) {
      unhealthyConnections++;
      errors.push(
        `Failed to acquire: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      healthy: unhealthyConnections === 0,
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
    } catch (error) {
      if (this.config.logger) {
        this.config.logger('Health check error', error);
      }
    }
  }

  async drain(): Promise<void> {
    if (this.config.logging && this.config.logger) {
      this.config.logger('Drain requested');
    }
  }

  getConfig(): PoolConfig {
    return { ...this.config };
  }

  private startHealthCheckTimer(): void {
    this.healthCheckTimer = setInterval(() => {
      this.runHealthCheck().catch((error) => {
        if (this.config.logger) {
          this.config.logger('Health check timer error', error);
        }
      });
    }, this.config.healthCheckInterval!);

    this.healthCheckTimer.unref();
  }

  private trackAcquireTime(time: number): void {
    this.acquireTimes.push(time);

    if (this.acquireTimes.length > 100) {
      this.acquireTimes.shift();
    }

    this.stats.averageAcquireTime =
      this.acquireTimes.reduce((a, b) => a + b, 0) /
      this.acquireTimes.length;
    this.stats.maxAcquireTime = Math.max(...this.acquireTimes);
  }

  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`Connection acquisition timeout after ${timeout}ms`));
      }, timeout);
    });
  }
}

