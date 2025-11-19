/**
 * SQL Server Database Adapter
 *
 * Implements the DatabaseAdapter interface for SQL Server databases.
 * Uses the `mssql` library for connection management and query execution.
 *
 * @module adapters/sqlserver-adapter
 */

import type {
  ConnectionPool,
  IResult,
  IRecordSet,
  config as MssqlConfig,
  Transaction as MssqlTransaction
} from 'mssql';
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
 * SQL Server adapter implementation.
 *
 * Features:
 * - Connection pooling via mssql.ConnectionPool
 * - Parameterized query support (@p1, @p2, etc.)
 * - Transaction management with isolation levels
 * - SQL Server-specific type handling
 */
export class SqlServerAdapter extends BaseAdapter {
  readonly dialect = 'sqlserver' as const;

  private pool: ConnectionPool | null = null;
  private mssql: typeof import('mssql') | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
    this.validateConfig();
  }

  /**
   * Connect to SQL Server database and initialize connection pool.
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Dynamically import mssql to avoid bundling it if not used
      this.mssql = await import('mssql');

      const poolConfig: MssqlConfig = {
        server: this.config.host,
        port: this.config.port || 1433,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        connectionString: this.config.connectionString,
        pool: {
          max: this.config.maxConnections || 10,
          min: this.config.minConnections || 2,
          idleTimeoutMillis: this.config.idleTimeout || 30000,
          acquireTimeoutMillis: this.config.connectionTimeout || 30000,
        },
        options: {
          encrypt: this.config.ssl === true || (typeof this.config.ssl === 'object' && this.config.ssl.encrypt !== false),
          trustServerCertificate: this.config.ssl === false || (typeof this.config.ssl === 'object' && this.config.ssl.trustServerCertificate === true),
          ...this.config.options,
        },
      };

      // Remove undefined values
      Object.keys(poolConfig).forEach(key => {
        if (poolConfig[key as keyof MssqlConfig] === undefined) {
          delete poolConfig[key as keyof MssqlConfig];
        }
      });

      this.pool = new this.mssql.ConnectionPool(poolConfig);

      // Test connection
      await this.pool.connect();

      this.connected = true;
    } catch (error) {
      throw new Error(
        `Failed to connect to SQL Server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from SQL Server database and close all connections.
   */
  async disconnect(): Promise<void> {
    if (!this.connected || !this.pool) {
      return;
    }

    try {
      await this.pool.close();
      this.pool = null;
      this.connected = false;
    } catch (error) {
      throw new Error(
        `Failed to disconnect from SQL Server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute a query with optional parameter binding.
   */
  async execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.connected || !this.pool) {
      throw new Error('Not connected to database');
    }

    try {
      const request = this.pool.request();

      // Bind parameters
      if (params) {
        params.forEach((param, index) => {
          request.input(`p${index}`, param);
        });
      }

      const result: IResult<IRecordSet<T>> = await request.query(sql);

      return {
        rows: result.recordset || [],
        rowCount: result.rowsAffected?.[0] || 0,
        fields: result.columns?.map(col => ({
          name: col.name,
        })),
      };
    } catch (error) {
      throw new Error(
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Begin a new transaction.
   */
  async beginTransaction(options?: TransactionOptions): Promise<Transaction> {
    if (!this.connected || !this.pool || !this.mssql) {
      throw new Error('Not connected to database');
    }

    try {
      const connection = await this.pool.connect();
      const transaction = new this.mssql.Transaction(connection);

      // Set isolation level
      if (options?.isolationLevel) {
        const isolationLevel = this.mapIsolationLevel(options.isolationLevel);
        await transaction.begin(isolationLevel);
      } else {
        await transaction.begin();
      }

      return new SqlServerTransaction(transaction, this.mssql);
    } catch (error) {
      throw new Error(
        `Failed to begin transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Acquire a connection from the pool.
   */
  async getConnection(): Promise<DatabaseConnection> {
    if (!this.connected || !this.pool) {
      throw new Error('Not connected to database');
    }

    try {
      const connection = await this.pool.connect();
      return new SqlServerConnection(connection, this.mssql!);
    } catch (error) {
      throw new Error(
        `Failed to acquire connection: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Escape an identifier for SQL Server (table name, column name).
   */
  escapeIdentifier(identifier: string): string {
    // SQL Server uses [identifier] syntax
    return `[${identifier.replace(/\]/g, ']]')}]`;
  }

  /**
   * Escape a value for SQL Server (should prefer parameterized queries).
   */
  escapeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }

    return String(value);
  }

  /**
   * Test the database connection.
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.connected || !this.pool) {
        return false;
      }

      await this.execute('SELECT 1 as test');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format a parameter placeholder for SQL Server.
   */
  protected formatPlaceholder(index: number): string {
    return `@p${index}`;
  }

  /**
   * Map NeatOrm isolation levels to SQL Server isolation levels.
   */
  private mapIsolationLevel(level: IsolationLevel): number {
    const levels = {
      READ_UNCOMMITTED: this.mssql!.ISOLATION_LEVEL.READ_UNCOMMITTED,
      READ_COMMITTED: this.mssql!.ISOLATION_LEVEL.READ_COMMITTED,
      REPEATABLE_READ: this.mssql!.ISOLATION_LEVEL.REPEATABLE_READ,
      SERIALIZABLE: this.mssql!.ISOLATION_LEVEL.SERIALIZABLE,
    };

    return levels[level] || levels.READ_COMMITTED;
  }
}

/**
 * SQL Server transaction implementation.
 */
class SqlServerTransaction implements Transaction {
  constructor(
    private transaction: MssqlTransaction,
    private mssql: typeof import('mssql')
  ) {}

  get id(): string {
    return `sqlserver-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

      const result: IResult<IRecordSet<T>> = await request.query(sql);

      return {
        rows: result.recordset || [],
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
 * SQL Server connection implementation.
 */
class SqlServerConnection implements DatabaseConnection {
  constructor(
    private connection: ConnectionPool,
    private mssql: typeof import('mssql')
  ) {}

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

      const result: IResult<IRecordSet<T>> = await request.query(sql);

      return {
        rows: result.recordset || [],
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

      return new SqlServerTransaction(transaction, this.mssql);
    } catch (error) {
      throw new Error(
        `Failed to begin transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Map NeatOrm isolation levels to SQL Server isolation levels.
   */
  private mapIsolationLevel(level: IsolationLevel): number {
    const levels = {
      READ_UNCOMMITTED: this.mssql.ISOLATION_LEVEL.READ_UNCOMMITTED,
      READ_COMMITTED: this.mssql.ISOLATION_LEVEL.READ_COMMITTED,
      REPEATABLE_READ: this.mssql.ISOLATION_LEVEL.REPEATABLE_READ,
      SERIALIZABLE: this.mssql.ISOLATION_LEVEL.SERIALIZABLE,
    };

    return levels[level] || levels.READ_COMMITTED;
  }
}
