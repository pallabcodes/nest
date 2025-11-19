/**
 * SQLite Connection Pool
 *
 * SQLite doesn't need traditional connection pooling since it's file-based
 * and single-connection by design. This implementation provides a consistent
 * interface for compatibility.
 *
 * @module pool/sqlite-pool
 */

import type { Database } from 'better-sqlite3';
import type {
  ConnectionPool,
  PoolConfig,
  PoolStats,
  PoolHealth,
} from './pool-interface.js';
import type { DatabaseConnection } from '../adapters/base-adapter.js';

/**
 * Wrapper for SQLite connection.
 */
class SQLitePoolConnection implements DatabaseConnection {
  constructor(private db: Database) {}

  async execute<T>(sql: string, params?: unknown[]) {
    const trimmedSql = sql.trim().toUpperCase();

    if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('WITH')) {
      const stmt = this.db.prepare(sql);
      const rows = params ? stmt.all(...params) : stmt.all();

      return {
        rows: rows as T[],
        rowCount: rows.length,
      };
    }

    const stmt = this.db.prepare(sql);
    const result = params ? stmt.run(...params) : stmt.run();

    return {
      rows: [] as T[],
      rowCount: result.changes,
    };
  }

  async release(): Promise<void> {
    // No-op for SQLite
  }

  async beginTransaction() {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.db.prepare('BEGIN').run();
    
    return {
      id: txId,
      isActive: () => true,
      commit: async () => {
        this.db.prepare('COMMIT').run();
      },
      rollback: async () => {
        this.db.prepare('ROLLBACK').run();
      },
      execute: async <T>(sql: string, params?: unknown[]) => {
        const trimmedSql = sql.trim().toUpperCase();

        if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('WITH')) {
          const stmt = this.db.prepare(sql);
          const rows = params ? stmt.all(...params) : stmt.all();

          return {
            rows: rows as T[],
            rowCount: rows.length,
          };
        }

        const stmt = this.db.prepare(sql);
        const result = params ? stmt.run(...params) : stmt.run();

        return {
          rows: [] as T[],
          rowCount: result.changes,
        };
      },
    };
  }
}

/**
 * SQLite Connection Pool (wrapper for compatibility).
 */
export class SQLiteConnectionPool implements ConnectionPool {
  private db: Database;
  private config: PoolConfig;
  private closed: boolean = false;
  private stats: PoolStats = {
    total: 1,
    idle: 1,
    active: 0,
    pending: 0,
    created: 1,
    destroyed: 0,
    acquired: 0,
    released: 0,
    errors: 0,
    averageAcquireTime: 0,
    maxAcquireTime: 0,
  };

  constructor(db: Database, config: PoolConfig = {}) {
    this.db = db;
    this.config = {
      min: 1,
      max: 1,
      acquireTimeout: 30000,
      idleTimeout: 30000,
      maxLifetime: 3600000,
      healthCheckInterval: 60000,
      healthCheckQuery: 'SELECT 1',
      validateOnAcquire: false,
      logging: false,
      ...config,
    };
  }

  async acquire(): Promise<DatabaseConnection> {
    if (this.closed) {
      throw new Error('Connection pool is closed');
    }

    this.stats.acquired++;
    this.stats.active = 1;
    this.stats.idle = 0;

    if (this.config.logging && this.config.logger) {
      this.config.logger('Connection acquired (SQLite single connection)');
    }

    return new SQLitePoolConnection(this.db);
  }

  async release(_connection: DatabaseConnection): Promise<void> {
    this.stats.released++;
    this.stats.active = 0;
    this.stats.idle = 1;

    if (this.config.logging && this.config.logger) {
      this.config.logger('Connection released (SQLite single connection)');
    }
  }

  async close(_force?: boolean): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.db.close();
    this.stats.destroyed = 1;
    this.stats.total = 0;
    this.stats.idle = 0;
    this.stats.active = 0;

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

    try {
      this.db.prepare(this.config.healthCheckQuery!).get();

      return {
        healthy: true,
        lastCheck: new Date(),
        healthyConnections: 1,
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
        unhealthyConnections: 1,
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
      if (this.config.logger) {
        this.config.logger('Health check error', error);
      }
    }
  }

  async drain(): Promise<void> {
    if (this.config.logging && this.config.logger) {
      this.config.logger('Drain requested (no-op for SQLite)');
    }
  }

  getConfig(): PoolConfig {
    return { ...this.config };
  }
}

