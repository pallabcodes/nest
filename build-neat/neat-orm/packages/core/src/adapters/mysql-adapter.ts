/**
 * MySQL Database Adapter
 *
 * Implements the DatabaseAdapter interface for MySQL/MariaDB databases.
 * Uses the `mysql2` library for connection management and query execution.
 *
 * @module adapters/mysql-adapter
 */

import type {
  Pool,
  PoolConnection,
  PoolOptions,
  RowDataPacket,
  ResultSetHeader,
  FieldPacket,
} from 'mysql2/promise';
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
 * MySQL adapter implementation.
 *
 * Features:
 * - Connection pooling via mysql2.Pool
 * - Parameterized query support (?)
 * - Transaction management with isolation levels
 * - MySQL-specific type handling
 */
export class MySQLAdapter extends BaseAdapter {
  readonly dialect = 'mysql' as const;

  private pool: Pool | null = null;
  private mysql: typeof import('mysql2/promise') | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
    this.validateConfig();
  }

  /**
   * Connect to MySQL database and initialize connection pool.
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Dynamically import mysql2 to avoid bundling it if not used
      this.mysql = await import('mysql2/promise');

      const poolConfig: PoolOptions = {
        host: this.config.host,
        port: this.config.port || 3306,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        uri: this.config.connectionString,
        connectionLimit: this.config.maxConnections || 10,
        connectTimeout: this.config.connectionTimeout || 30000,
        ...(this.config.options as PoolOptions),
      };

      if (this.config.ssl !== undefined) {
        poolConfig.ssl = this.config.ssl;
      }

      this.pool = this.mysql.createPool(poolConfig);

      // Test connection
      const connection = await this.pool.getConnection();
      connection.release();

      this.connected = true;
    } catch (error) {
      throw new Error(
        `Failed to connect to MySQL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from MySQL database and close all connections.
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
        `Failed to disconnect from MySQL: ${error instanceof Error ? error.message : String(error)}`
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
      const [results, fields] = await this.pool.execute(sql, params);

      // Handle different result types
      if (Array.isArray(results)) {
        return {
          rows: results as T[],
          rowCount: results.length,
          fields: this.mapFields(fields),
        };
      }

      // Handle INSERT/UPDATE/DELETE results
      const header = results as ResultSetHeader;
      return {
        rows: [] as T[],
        rowCount: header.affectedRows || 0,
        fields: this.mapFields(fields),
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

    const connection = await this.pool.getConnection();
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Set isolation level if specified
      if (options?.isolationLevel) {
        await connection.query(
          `SET TRANSACTION ISOLATION LEVEL ${this.mapIsolationLevel(options.isolationLevel)}`
        );
      }

      await connection.beginTransaction();

      return new MySQLTransaction(txId, connection);
    } catch (error) {
      connection.release();
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

    const connection = await this.pool.getConnection();
    return new MySQLConnection(connection);
  }

  /**
   * Escape a MySQL identifier (table name, column name).
   */
  escapeIdentifier(identifier: string): string {
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  /**
   * Escape a value for MySQL (prefer parameterized queries).
   */
  escapeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (value instanceof Date) {
      return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }

    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
    }

    if (Array.isArray(value)) {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }

    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }

    return String(value);
  }

  /**
   * Test the MySQL connection.
   */
  async testConnection(): Promise<boolean> {
    if (!this.connected || !this.pool) {
      return false;
    }

    try {
      const [results] = await this.pool.execute('SELECT 1 AS test');
      return Array.isArray(results) && results.length === 1;
    } catch {
      return false;
    }
  }

  /**
   * Format a parameter placeholder for MySQL (?).
   */
  protected formatPlaceholder(_index: number): string {
    return '?';
  }

  /**
   * Map NeatOrm isolation level to MySQL isolation level.
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

  /**
   * Map MySQL field packets to NeatOrm field info.
   */
  private mapFields(fields: FieldPacket[] | undefined) {
    if (!fields) {
      return undefined;
    }

    return fields.map((field) => ({
      name: field.name,
      tableID: undefined,
      columnID: undefined,
      dataTypeID: undefined,
      dataTypeSize: undefined,
      dataTypeModifier: undefined,
      format: field.type ? String(field.type) : undefined,
    }));
  }
}

/**
 * MySQL transaction implementation.
 */
class MySQLTransaction implements Transaction {
  private active: boolean = true;

  constructor(
    public readonly id: string,
    private connection: PoolConnection
  ) {}

  async commit(): Promise<void> {
    if (!this.active) {
      throw new Error('Transaction is not active');
    }

    try {
      await this.connection.commit();
      this.active = false;
    } finally {
      this.connection.release();
    }
  }

  async rollback(): Promise<void> {
    if (!this.active) {
      throw new Error('Transaction is not active');
    }

    try {
      await this.connection.rollback();
      this.active = false;
    } finally {
      this.connection.release();
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
      const [results, fields] = await this.connection.execute(sql, params);

      if (Array.isArray(results)) {
        return {
          rows: results as T[],
          rowCount: results.length,
          fields: this.mapFields(fields),
        };
      }

      const header = results as ResultSetHeader;
      return {
        rows: [] as T[],
        rowCount: header.affectedRows || 0,
        fields: this.mapFields(fields),
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

  private mapFields(fields: FieldPacket[] | undefined) {
    if (!fields) {
      return undefined;
    }

    return fields.map((field) => ({
      name: field.name,
      tableID: undefined,
      columnID: undefined,
      dataTypeID: undefined,
      dataTypeSize: undefined,
      dataTypeModifier: undefined,
      format: field.type ? String(field.type) : undefined,
    }));
  }
}

/**
 * MySQL connection implementation.
 */
class MySQLConnection implements DatabaseConnection {
  constructor(private connection: PoolConnection) {}

  async execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    try {
      const [results, fields] = await this.connection.execute(sql, params);

      if (Array.isArray(results)) {
        return {
          rows: results as T[],
          rowCount: results.length,
          fields: this.mapFields(fields),
        };
      }

      const header = results as ResultSetHeader;
      return {
        rows: [] as T[],
        rowCount: header.affectedRows || 0,
        fields: this.mapFields(fields),
      };
    } catch (error) {
      throw new Error(
        `Connection query failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async release(): Promise<void> {
    this.connection.release();
  }

  async beginTransaction(options?: TransactionOptions): Promise<Transaction> {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      if (options?.isolationLevel) {
        const mapping: Record<IsolationLevel, string> = {
          READ_UNCOMMITTED: 'READ UNCOMMITTED',
          READ_COMMITTED: 'READ COMMITTED',
          REPEATABLE_READ: 'REPEATABLE READ',
          SERIALIZABLE: 'SERIALIZABLE',
        };
        await this.connection.query(
          `SET TRANSACTION ISOLATION LEVEL ${mapping[options.isolationLevel]}`
        );
      }

      await this.connection.beginTransaction();

      return new MySQLTransaction(txId, this.connection);
    } catch (error) {
      throw new Error(
        `Failed to begin transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private mapFields(fields: FieldPacket[] | undefined) {
    if (!fields) {
      return undefined;
    }

    return fields.map((field) => ({
      name: field.name,
      tableID: undefined,
      columnID: undefined,
      dataTypeID: undefined,
      dataTypeSize: undefined,
      dataTypeModifier: undefined,
      format: field.type ? String(field.type) : undefined,
    }));
  }
}

