/**
 * SQL Server Connection Pool
 *
 * Implements connection pooling for SQL Server using the mssql library.
 * Provides advanced pooling features including health checks, statistics,
 * and connection lifecycle management.
 *
 * @module pool/sqlserver-pool
 */

import type { ConnectionPool } from 'mssql';
import type {
  DatabaseConnection,
  QueryResult,
  Transaction,
  TransactionOptions,
  DatabaseRow,
} from '../adapters/base-adapter.js';
import type {
  ConnectionPool as PoolInterface,
  PoolConfig,
  PoolStats,
  PoolHealth,
} from './pool-interface.js';

/**
 * SQL Server Pool Connection Wrapper
 */
class SqlServerPoolConnection implements DatabaseConnection {
  private mssql: typeof import('mssql');

  constructor(
    private connection: ConnectionPool,
    mssqlModule: typeof import('mssql')
  ) {
    this.mssql = mssqlModule;
  }

  async execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    try {
      const request = this.connection.request();

      // Bind parameters
      if (params) {
        params.forEach((param, index) => {
          request.input(`p${index}`, param);
        });
      }

      const result = await request.query(sql);

      return {
        rows: (result.recordset || []) as T[],
        rowCount: result.rowsAffected?.[0] || 0,
        fields: result.columns?.map(col => ({
          name: col.name,
        })),
      };
    } catch (error) {
      throw new Error(
        `Connection query execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async release(): Promise<void> {
    // SQL Server connections are managed by the pool automatically
    // No explicit release needed
  }

  async beginTransaction(options?: TransactionOptions): Promise<Transaction> {
    try {
      const transaction = new this.mssql.Transaction(this.connection);

      // Set isolation level
      if (options?.isolationLevel) {
        const isolationLevel = this.mapIsolationLevel(options.isolationLevel);
        await transaction.begin(isolationLevel);
      } else {
        await transaction.begin();
      }

      return new SqlServerPoolTransaction(transaction, this.mssql);
    } catch (error) {
      throw new Error(
        `Failed to begin transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private mapIsolationLevel(level: TransactionOptions['isolationLevel']): number {
    const levels = {
      READ_UNCOMMITTED: this.mssql.ISOLATION_LEVEL.READ_UNCOMMITTED,
      READ_COMMITTED: this.mssql.ISOLATION_LEVEL.READ_COMMITTED,
      REPEATABLE_READ: this.mssql.ISOLATION_LEVEL.REPEATABLE_READ,
      SERIALIZABLE: this.mssql.ISOLATION_LEVEL.SERIALIZABLE,
    };

    return levels[level as keyof typeof levels] || levels.READ_COMMITTED;
  }
}

/**
 * SQL Server Pool Transaction
 */
class SqlServerPoolTransaction implements Transaction {
  constructor(
    private transaction: import('mssql').Transaction,
    private mssql: typeof import('mssql')
  ) {}

  get id(): string {
    return `sqlserver-pool-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async commit(): Promise<void> {
    try {
      await this.transaction.commit();
    } catch (error) {
      throw new Error(
        `Transaction commit failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async rollback(): Promise<void> {
    try {
      await this.transaction.rollback();
    } catch (error) {
      throw new Error(
        `Transaction rollback failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    try {
      const request = this.transaction.request();

      // Bind parameters
      if (params) {
        params.forEach((param, index) => {
          request.input(`p${index}`, param);
        });
      }

      const result = await request.query(sql);

      return {
        rows: (result.recordset || []) as T[],
        rowCount: result.rowsAffected?.[0] || 0,
        fields: result.columns?.map(col => ({
          name: col.name,
        })),
      };
    } catch (error) {
      throw new Error(
        `Transaction query execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  isActive(): boolean {
    return true; // SQL Server transactions don't have an explicit active state check
  }
}

/**
 * SQL Server Connection Pool Implementation
 *
 * Uses the mssql library's built-in connection pooling capabilities.
 */
export class SqlServerConnectionPool implements PoolInterface {
  private pool: ConnectionPool;
  private config: PoolConfig;
  private closed: boolean = false;
  private mssql: typeof import('mssql');
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

  constructor(pool: ConnectionPool, config: PoolConfig = {}, mssqlModule?: typeof import('mssql')) {
    this.pool = pool;
    this.mssql = mssqlModule || require('mssql');
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

    // Initialize stats
    this.updateStats();
  }

  async acquire(): Promise<DatabaseConnection> {
    if (this.closed) {
      throw new Error('Connection pool is closed');
    }

    const startTime = Date.now();

    try {
      // SQL Server manages connections internally
      // We just return a wrapper that uses the pool
      this.stats.acquired++;
      this.updateStats();

      if (this.config.logging && this.config.logger) {
        this.config.logger('Connection acquired from SQL Server pool');
      }

      return new SqlServerPoolConnection(this.pool, this.mssql);
    } catch (error) {
      this.stats.errors++;
      throw new Error(
        `Failed to acquire connection: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      const acquireTime = Date.now() - startTime;
      this.stats.averageAcquireTime = (this.stats.averageAcquireTime + acquireTime) / 2;
      this.stats.maxAcquireTime = Math.max(this.stats.maxAcquireTime, acquireTime);
    }
  }

  async release(_connection: DatabaseConnection): Promise<void> {
    this.stats.released++;
    this.updateStats();

    if (this.config.logging && this.config.logger) {
      this.config.logger('Connection released to SQL Server pool');
    }
  }

  async close(force: boolean = false): Promise<void> {
    if (this.closed) {
      return;
    }

    try {
      if (force) {
        await this.pool.close();
      } else {
        // Wait for active connections to complete
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (this.stats.active === 0) {
              clearInterval(checkInterval);
              this.pool.close().then(resolve);
            }
          }, 100);

          // Timeout after 30 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            this.pool.close().then(resolve);
          }, 30000);
        });
      }

      this.closed = true;
      this.updateStats();

      if (this.config.logging && this.config.logger) {
        this.config.logger('SQL Server connection pool closed');
      }
    } catch (error) {
      throw new Error(
        `Failed to close connection pool: ${error instanceof Error ? error.message : String(error)}`
      );
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

    try {
      if (this.closed) {
        return {
          healthy: false,
          lastCheck: new Date(),
          healthyConnections: 0,
          unhealthyConnections: this.stats.total,
          errors: ['Connection pool is closed'],
        };
      }

      // Test connection with health check query
      const connection = await this.pool.connect();
      const request = connection.request();
      await request.query(this.config.healthCheckQuery!);

      return {
        healthy: true,
        lastCheck: new Date(),
        healthyConnections: this.stats.total,
        unhealthyConnections: 0,
      };
    } catch (error) {
      errors.push(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`
      );

      return {
        healthy: false,
        lastCheck: new Date(),
        healthyConnections: 0,
        unhealthyConnections: this.stats.total,
        errors,
      };
    }
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
      this.stats.errors++;
      if (this.config.logger) {
        this.config.logger('Health check error', error);
      }
    }
  }

  async drain(): Promise<void> {
    if (this.config.logging && this.config.logger) {
      this.config.logger('Drain requested - waiting for active connections to complete');
    }

    // Wait for all active connections to be released
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.stats.active === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 30000);
    });

    if (this.config.logging && this.config.logger) {
      this.config.logger('Pool drained successfully');
    }
  }

  getConfig(): PoolConfig {
    return { ...this.config };
  }

  /**
   * Update pool statistics
   */
  private updateStats(): void {
    // SQL Server doesn't provide detailed pool statistics like pg
    // We'll estimate based on our tracking
    this.stats.total = this.config.max || 10;
    this.stats.idle = Math.max(0, this.stats.total - this.stats.active);
  }
}
