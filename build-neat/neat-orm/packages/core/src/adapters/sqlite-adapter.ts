/**
 * SQLite Database Adapter
 *
 * Implements the DatabaseAdapter interface for SQLite databases.
 * Uses the `better-sqlite3` library for connection management and query execution.
 *
 * @module adapters/sqlite-adapter
 */

import type { Database, Statement, RunResult } from 'better-sqlite3';
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
 * SQLite adapter implementation.
 *
 * Features:
 * - File-based and in-memory database support
 * - Parameterized query support (?)
 * - Transaction management
 * - SQLite-specific type handling
 *
 * Note: SQLite is single-connection by design, so connection pooling
 * is not applicable. However, we implement the same interface for consistency.
 */
export class SQLiteAdapter extends BaseAdapter {
  readonly dialect = 'sqlite' as const;

  private db: Database | null = null;
  private sqlite: typeof import('better-sqlite3') | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
    this.validateConfig();
  }

  /**
   * Connect to SQLite database.
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Dynamically import better-sqlite3 to avoid bundling it if not used
      const betterSqlite3Module = await import('better-sqlite3');
      this.sqlite = betterSqlite3Module.default;

      const options = {
        readonly: false,
        fileMustExist: false,
        timeout: this.config.connectionTimeout || 5000,
        verbose: undefined,
        ...(this.config.options || {}),
      };

      this.db = new this.sqlite(this.config.database, options as never);

      // Enable foreign keys (disabled by default in SQLite)
      this.db.pragma('foreign_keys = ON');

      // Set busy timeout
      this.db.pragma(`busy_timeout = ${options.timeout}`);

      this.connected = true;
    } catch (error) {
      throw new Error(
        `Failed to connect to SQLite: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from SQLite database.
   */
  async disconnect(): Promise<void> {
    if (!this.connected || !this.db) {
      return;
    }

    try {
      this.db.close();
      this.db = null;
      this.connected = false;
    } catch (error) {
      throw new Error(
        `Failed to disconnect from SQLite: ${error instanceof Error ? error.message : String(error)}`
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
    if (!this.connected || !this.db) {
      throw new Error('Not connected to database');
    }

    try {
      const trimmedSql = sql.trim().toUpperCase();

      // Determine if this is a SELECT query or a mutation
      if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('WITH')) {
        const stmt = this.db.prepare(sql);
        const rows = params ? stmt.all(...params) : stmt.all();

        return {
          rows: rows as T[],
          rowCount: rows.length,
          fields: this.extractFields(stmt),
        };
      }

      // Handle INSERT/UPDATE/DELETE
      const stmt = this.db.prepare(sql);
      const result: RunResult = params ? stmt.run(...params) : stmt.run();

      return {
        rows: [] as T[],
        rowCount: result.changes,
        fields: undefined,
      };
    } catch (error) {
      throw new Error(
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Begin a new transaction.
   *
   * Note: SQLite supports limited isolation levels.
   * All transactions are SERIALIZABLE by default.
   */
  async beginTransaction(options?: TransactionOptions): Promise<Transaction> {
    if (!this.connected || !this.db) {
      throw new Error('Not connected to database');
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // SQLite only supports DEFERRED, IMMEDIATE, and EXCLUSIVE transactions
      let beginSql = 'BEGIN';

      if (options?.isolationLevel === 'SERIALIZABLE') {
        beginSql = 'BEGIN EXCLUSIVE';
      } else if (options?.isolationLevel === 'READ_COMMITTED') {
        beginSql = 'BEGIN IMMEDIATE';
      } else {
        beginSql = 'BEGIN DEFERRED';
      }

      this.db.prepare(beginSql).run();

      return new SQLiteTransaction(txId, this.db);
    } catch (error) {
      throw new Error(
        `Failed to begin transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get a connection (returns a wrapper around the single SQLite connection).
   */
  async getConnection(): Promise<DatabaseConnection> {
    if (!this.connected || !this.db) {
      throw new Error('Not connected to database');
    }

    return new SQLiteConnection(this.db);
  }

  /**
   * Escape a SQLite identifier (table name, column name).
   */
  escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Escape a value for SQLite (prefer parameterized queries).
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
      return `'${value.toISOString()}'`;
    }

    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }

    return String(value);
  }

  /**
   * Test the SQLite connection.
   */
  async testConnection(): Promise<boolean> {
    if (!this.connected || !this.db) {
      return false;
    }

    try {
      const result = this.db.prepare('SELECT 1 AS test').get();
      return result !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Format a parameter placeholder for SQLite (?).
   */
  protected formatPlaceholder(_index: number): string {
    return '?';
  }

  /**
   * Extract field information from a prepared statement.
   */
  private extractFields(stmt: Statement) {
    try {
      const columns = stmt.columns();
      return columns.map((col) => ({
        name: col.name,
        tableID: undefined,
        columnID: undefined,
        dataTypeID: undefined,
        dataTypeSize: undefined,
        dataTypeModifier: undefined,
        format: col.type || undefined,
      }));
    } catch {
      return undefined;
    }
  }
}

/**
 * SQLite transaction implementation.
 */
class SQLiteTransaction implements Transaction {
  private active: boolean = true;

  constructor(
    public readonly id: string,
    private db: Database
  ) {}

  async commit(): Promise<void> {
    if (!this.active) {
      throw new Error('Transaction is not active');
    }

    try {
      this.db.prepare('COMMIT').run();
      this.active = false;
    } catch (error) {
      throw new Error(
        `Transaction commit failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async rollback(): Promise<void> {
    if (!this.active) {
      throw new Error('Transaction is not active');
    }

    try {
      this.db.prepare('ROLLBACK').run();
      this.active = false;
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
    if (!this.active) {
      throw new Error('Transaction is not active');
    }

    try {
      const trimmedSql = sql.trim().toUpperCase();

      if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('WITH')) {
        const stmt = this.db.prepare(sql);
        const rows = params ? stmt.all(...params) : stmt.all();

        return {
          rows: rows as T[],
          rowCount: rows.length,
          fields: this.extractFields(stmt),
        };
      }

      const stmt = this.db.prepare(sql);
      const result: RunResult = params ? stmt.run(...params) : stmt.run();

      return {
        rows: [] as T[],
        rowCount: result.changes,
        fields: undefined,
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

  private extractFields(stmt: Statement) {
    try {
      const columns = stmt.columns();
      return columns.map((col) => ({
        name: col.name,
        tableID: undefined,
        columnID: undefined,
        dataTypeID: undefined,
        dataTypeSize: undefined,
        dataTypeModifier: undefined,
        format: col.type || undefined,
      }));
    } catch {
      return undefined;
    }
  }
}

/**
 * SQLite connection implementation.
 */
class SQLiteConnection implements DatabaseConnection {
  constructor(private db: Database) {}

  async execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    try {
      const trimmedSql = sql.trim().toUpperCase();

      if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('WITH')) {
        const stmt = this.db.prepare(sql);
        const rows = params ? stmt.all(...params) : stmt.all();

        return {
          rows: rows as T[],
          rowCount: rows.length,
          fields: this.extractFields(stmt),
        };
      }

      const stmt = this.db.prepare(sql);
      const result: RunResult = params ? stmt.run(...params) : stmt.run();

      return {
        rows: [] as T[],
        rowCount: result.changes,
        fields: undefined,
      };
    } catch (error) {
      throw new Error(
        `Connection query failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async release(): Promise<void> {
    // SQLite doesn't have connection pooling, so this is a no-op
  }

  async beginTransaction(options?: TransactionOptions): Promise<Transaction> {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      let beginSql = 'BEGIN';

      if (options?.isolationLevel === 'SERIALIZABLE') {
        beginSql = 'BEGIN EXCLUSIVE';
      } else if (options?.isolationLevel === 'READ_COMMITTED') {
        beginSql = 'BEGIN IMMEDIATE';
      } else {
        beginSql = 'BEGIN DEFERRED';
      }

      this.db.prepare(beginSql).run();

      return new SQLiteTransaction(txId, this.db);
    } catch (error) {
      throw new Error(
        `Failed to begin transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private extractFields(stmt: Statement) {
    try {
      const columns = stmt.columns();
      return columns.map((col) => ({
        name: col.name,
        tableID: undefined,
        columnID: undefined,
        dataTypeID: undefined,
        dataTypeSize: undefined,
        dataTypeModifier: undefined,
        format: col.type || undefined,
      }));
    } catch {
      return undefined;
    }
  }
}

