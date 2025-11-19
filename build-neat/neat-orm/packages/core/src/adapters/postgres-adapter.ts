/**
 * PostgreSQL Database Adapter
 *
 * Implements the DatabaseAdapter interface for PostgreSQL databases.
 * Uses the `pg` library for connection management and query execution.
 *
 * @module adapters/postgres-adapter
 */

import type { Pool, PoolClient, PoolConfig, QueryResult as PgQueryResult } from 'pg';
import {
  BaseAdapter,
  type ConnectionConfig,
  type QueryResult,
  type Transaction,
  type TransactionOptions,
  type DatabaseConnection,
  type DatabaseRow,
  type IsolationLevel,
} from './base-adapter.js';

/**
 * PostgreSQL adapter implementation.
 *
 * Features:
 * - Connection pooling via pg.Pool
 * - Parameterized query support ($1, $2, etc.)
 * - Transaction management with isolation levels
 * - PostgreSQL-specific type handling
 */
export class PostgresAdapter extends BaseAdapter {
  readonly dialect = 'postgres' as const;

  private pool: Pool | null = null;
  private pg: typeof import('pg') | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
    this.validateConfig();
  }

  /**
   * Connect to PostgreSQL database and initialize connection pool.
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Dynamically import pg to avoid bundling it if not used
      this.pg = await import('pg');

      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        connectionString: this.config.connectionString,
        max: this.config.maxConnections || 10,
        min: this.config.minConnections || 2,
        connectionTimeoutMillis: this.config.connectionTimeout || 30000,
        idleTimeoutMillis: this.config.idleTimeout || 30000,
        ...this.config.options,
      };

      if (this.config.ssl !== undefined) {
        poolConfig.ssl = this.config.ssl;
      }

      this.pool = new this.pg.Pool(poolConfig);

      // Test connection
      const client = await this.pool.connect();
      client.release();

      this.connected = true;
    } catch (error) {
      throw new Error(
        `Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from PostgreSQL database and close all connections.
   */
  async disconnect(): Promise<void> {
    if (!this.connected || !this.pool) {
      return;
    }

    try {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
    } catch (error) {
      throw new Error(
        `Failed to disconnect from PostgreSQL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute a SQL query with optional parameters.
   */
  async execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.connected || !this.pool) {
      throw new Error('Not connected to database');
    }

    try {
      const result: PgQueryResult = await this.pool.query(sql, params);

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
    } catch (error) {
      throw new Error(
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Begin a new transaction with optional isolation level.
   */
  async beginTransaction(options?: TransactionOptions): Promise<Transaction> {
    if (!this.connected || !this.pool) {
      throw new Error('Not connected to database');
    }

    const client = await this.pool.connect();
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Build BEGIN statement with options
      let beginSql = 'BEGIN';

      if (options?.isolationLevel) {
        beginSql += ` ISOLATION LEVEL ${this.mapIsolationLevel(options.isolationLevel)}`;
      }

      if (options?.readOnly) {
        beginSql += ' READ ONLY';
      }

      if (options?.deferrable) {
        beginSql += ' DEFERRABLE';
      }

      await client.query(beginSql);

      return new PostgresTransaction(txId, client);
    } catch (error) {
      client.release();
      throw new Error(
        `Failed to begin transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get a connection from the pool.
   */
  async getConnection(): Promise<DatabaseConnection> {
    if (!this.connected || !this.pool) {
      throw new Error('Not connected to database');
    }

    const client = await this.pool.connect();
    return new PostgresConnection(client);
  }

  /**
   * Escape a PostgreSQL identifier (table name, column name).
   */
  escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Escape a value for PostgreSQL (prefer parameterized queries).
   */
  escapeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }

    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (Array.isArray(value)) {
      return `ARRAY[${value.map((v) => this.escapeValue(v)).join(', ')}]`;
    }

    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }

    return String(value);
  }

  /**
   * Test the PostgreSQL connection.
   */
  async testConnection(): Promise<boolean> {
    if (!this.connected || !this.pool) {
      return false;
    }

    try {
      const result = await this.pool.query('SELECT 1 AS test');
      return result.rows.length === 1;
    } catch {
      return false;
    }
  }

  /**
   * Format a parameter placeholder for PostgreSQL ($1, $2, etc.).
   */
  protected formatPlaceholder(index: number): string {
    return `$${index + 1}`;
  }

  /**
   * Map NeatOrm isolation level to PostgreSQL isolation level.
   */
  private mapIsolationLevel(level: IsolationLevel): string {
    const mapping: Record<IsolationLevel, string> = {
      READ_UNCOMMITTED: 'READ UNCOMMITTED',
      READ_COMMITTED: 'READ COMMITTED',
      REPEATABLE_READ: 'REPEATABLE READ',
      SERIALIZABLE: 'SERIALIZABLE',
    };
    return mapping[level];
  }
}

/**
 * PostgreSQL transaction implementation.
 */
class PostgresTransaction implements Transaction {
  private active: boolean = true;

  constructor(
    public readonly id: string,
    private client: PoolClient
  ) {}

  async commit(): Promise<void> {
    if (!this.active) {
      throw new Error('Transaction is not active');
    }

    try {
      await this.client.query('COMMIT');
      this.active = false;
    } finally {
      this.client.release();
    }
  }

  async rollback(): Promise<void> {
    if (!this.active) {
      throw new Error('Transaction is not active');
    }

    try {
      await this.client.query('ROLLBACK');
      this.active = false;
    } finally {
      this.client.release();
    }
  }

  async execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.active) {
      throw new Error('Transaction is not active');
    }

    try {
      const result: PgQueryResult = await this.client.query(sql, params);

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
    } catch (error) {
      throw new Error(
        `Transaction query failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  isActive(): boolean {
    return this.active;
  }
}

/**
 * PostgreSQL connection implementation.
 */
class PostgresConnection implements DatabaseConnection {
  constructor(private client: PoolClient) {}

  async execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    try {
      const result: PgQueryResult = await this.client.query(sql, params);

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
    } catch (error) {
      throw new Error(
        `Connection query failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async release(): Promise<void> {
    this.client.release();
  }

  async beginTransaction(options?: TransactionOptions): Promise<Transaction> {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      let beginSql = 'BEGIN';

      if (options?.isolationLevel) {
        const mapping: Record<IsolationLevel, string> = {
          READ_UNCOMMITTED: 'READ UNCOMMITTED',
          READ_COMMITTED: 'READ COMMITTED',
          REPEATABLE_READ: 'REPEATABLE READ',
          SERIALIZABLE: 'SERIALIZABLE',
        };
        beginSql += ` ISOLATION LEVEL ${mapping[options.isolationLevel]}`;
      }

      if (options?.readOnly) {
        beginSql += ' READ ONLY';
      }

      if (options?.deferrable) {
        beginSql += ' DEFERRABLE';
      }

      await this.client.query(beginSql);

      return new PostgresTransaction(txId, this.client);
    } catch (error) {
      throw new Error(
        `Failed to begin transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

