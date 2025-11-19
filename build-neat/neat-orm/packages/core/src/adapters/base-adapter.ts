/**
 * Base Database Adapter Interface
 *
 * Defines the contract that all database adapters must implement.
 * This abstraction layer allows NeatOrm to support multiple databases
 * while maintaining a consistent API.
 *
 * @module adapters/base-adapter
 */

/**
 * Represents a single database row result.
 */
export interface DatabaseRow {
  [column: string]: unknown;
}

/**
 * Result of a query execution.
 */
export interface QueryResult<T = DatabaseRow> {
  /**
   * The rows returned by the query.
   */
  rows: T[];

  /**
   * Number of rows affected by the query (for INSERT/UPDATE/DELETE).
   */
  rowCount: number;

  /**
   * Fields metadata (column names, types, etc.).
   */
  fields?: FieldInfo[];
}

/**
 * Information about a result field/column.
 */
export interface FieldInfo {
  name: string;
  tableID?: number;
  columnID?: number;
  dataTypeID?: number;
  dataTypeSize?: number;
  dataTypeModifier?: number;
  format?: string;
}

/**
 * Configuration for establishing a database connection.
 */
export interface ConnectionConfig {
  /**
   * Database dialect (postgres, mysql, sqlite, mongodb).
   */
  dialect: 'postgres' | 'mysql' | 'sqlite' | 'sqlserver' | 'oracle' | 'mongodb';

  /**
   * Database host (not applicable for SQLite).
   */
  host?: string;

  /**
   * Database port.
   */
  port?: number;

  /**
   * Database name.
   */
  database: string;

  /**
   * Database user (not applicable for SQLite).
   */
  user?: string;

  /**
   * Database password (not applicable for SQLite).
   */
  password?: string;

  /**
   * Connection string (alternative to individual config properties).
   */
  connectionString?: string;

  /**
   * SSL/TLS configuration.
   */
  ssl?: boolean | Record<string, unknown>;

  /**
   * Connection timeout in milliseconds.
   */
  connectionTimeout?: number;

  /**
   * Idle timeout in milliseconds.
   */
  idleTimeout?: number;

  /**
   * Maximum number of connections in the pool.
   */
  maxConnections?: number;

  /**
   * Minimum number of connections in the pool.
   */
  minConnections?: number;

  /**
   * Additional driver-specific options.
   */
  options?: Record<string, unknown>;
}

/**
 * Transaction isolation levels.
 */
export type IsolationLevel =
  | 'READ_UNCOMMITTED'
  | 'READ_COMMITTED'
  | 'REPEATABLE_READ'
  | 'SERIALIZABLE';

/**
 * Options for beginning a transaction.
 */
export interface TransactionOptions {
  /**
   * Transaction isolation level.
   */
  isolationLevel?: IsolationLevel;

  /**
   * Read-only transaction flag.
   */
  readOnly?: boolean;

  /**
   * Deferrable transaction (PostgreSQL only).
   */
  deferrable?: boolean;
}

/**
 * Represents an active database transaction.
 */
export interface Transaction {
  /**
   * Unique transaction identifier.
   */
  id: string;

  /**
   * Commit the transaction.
   */
  commit(): Promise<void>;

  /**
   * Rollback the transaction.
   */
  rollback(): Promise<void>;

  /**
   * Execute a query within this transaction.
   */
  execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;

  /**
   * Check if the transaction is active.
   */
  isActive(): boolean;
}

/**
 * Database connection interface.
 */
export interface DatabaseConnection {
  /**
   * Execute a query on this connection.
   */
  execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;

  /**
   * Release the connection back to the pool.
   */
  release(): Promise<void>;

  /**
   * Begin a transaction on this connection.
   */
  beginTransaction(options?: TransactionOptions): Promise<Transaction>;
}

/**
 * Base interface for all database adapters.
 *
 * Adapters are responsible for:
 * - Managing database connections
 * - Executing queries with parameter binding
 * - Handling transactions
 * - Converting database-specific types to JavaScript types
 */
export interface DatabaseAdapter {
  /**
   * The database dialect this adapter supports.
   */
  readonly dialect: ConnectionConfig['dialect'];

  /**
   * Connect to the database.
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database.
   */
  disconnect(): Promise<void>;

  /**
   * Check if the adapter is connected.
   */
  isConnected(): boolean;

  /**
   * Execute a query with optional parameter binding.
   *
   * @param sql - The SQL query to execute
   * @param params - Optional query parameters (for parameterized queries)
   * @returns Query result containing rows and metadata
   */
  execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;

  /**
   * Begin a new transaction.
   *
   * @param options - Transaction options (isolation level, read-only, etc.)
   * @returns Transaction instance
   */
  beginTransaction(options?: TransactionOptions): Promise<Transaction>;

  /**
   * Acquire a connection from the pool.
   *
   * @returns Database connection
   */
  getConnection(): Promise<DatabaseConnection>;

  /**
   * Escape an identifier (table name, column name) for safe use in SQL.
   *
   * @param identifier - The identifier to escape
   * @returns Escaped identifier
   */
  escapeIdentifier(identifier: string): string;

  /**
   * Escape a value for safe use in SQL (should prefer parameterized queries).
   *
   * @param value - The value to escape
   * @returns Escaped value
   */
  escapeValue(value: unknown): string;

  /**
   * Get the current database configuration.
   */
  getConfig(): ConnectionConfig;

  /**
   * Test the database connection.
   *
   * @returns True if connection is healthy, false otherwise
   */
  testConnection(): Promise<boolean>;
}

/**
 * Abstract base class for database adapters.
 * Provides common functionality that can be shared across adapters.
 */
export abstract class BaseAdapter implements DatabaseAdapter {
  protected config: ConnectionConfig;
  protected connected: boolean = false;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  abstract readonly dialect: ConnectionConfig['dialect'];

  abstract connect(): Promise<void>;

  abstract disconnect(): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  abstract execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;

  abstract beginTransaction(options?: TransactionOptions): Promise<Transaction>;

  abstract getConnection(): Promise<DatabaseConnection>;

  abstract escapeIdentifier(identifier: string): string;

  abstract escapeValue(value: unknown): string;

  getConfig(): ConnectionConfig {
    return { ...this.config };
  }

  abstract testConnection(): Promise<boolean>;

  /**
   * Validate the connection configuration.
   * Throws an error if configuration is invalid.
   */
  protected validateConfig(): void {
    if (!this.config.dialect) {
      throw new Error('Database dialect is required');
    }

    if (this.config.dialect !== 'sqlite' && !this.config.database) {
      throw new Error('Database name is required');
    }

    if (
      this.config.dialect !== 'sqlite' &&
      !this.config.host &&
      !this.config.connectionString
    ) {
      throw new Error('Database host or connection string is required');
    }
  }

  /**
   * Format a parameter placeholder for the specific database dialect.
   *
   * @param index - Parameter index (0-based)
   * @returns Formatted placeholder (e.g., $1 for PostgreSQL, ? for MySQL)
   */
  protected abstract formatPlaceholder(index: number): string;
}

