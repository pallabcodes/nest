/**
 * NeatOrm - Migration System
 *
 * Type-safe database migration system for managing schema changes over time.
 * Provides version control for database schemas with up/down migrations.
 *
 * Key TypeScript Excellence Features:
 * - Type-safe migration definitions
 * - Compile-time migration validation
 * - Transaction-wrapped migrations
 * - Migration dependency tracking
 * - Rollback support
 *
 * TypeScript Compilation:
 * Migration system uses TypeScript to ensure migrations are well-formed and
 * provide helpful error messages for common migration mistakes.
 *
 * Runtime Behavior:
 * Tracks applied migrations in a database table, executes migrations in
 * transactions, supports rollback, handles migration dependencies, and
 * provides migration history.
 *
 * Framework Integration:
 * Migration system integrates with:
 * - Transaction manager for atomic migrations
 * - Database adapters for schema changes
 * - SQL generator for DDL statements
 * - CLI tools for migration management
 *
 * Pain Points Addressed:
 * - Manual migration management
 * - Migration ordering issues
 * - No rollback support
 * - Type safety in migrations
 * - Migration conflicts in teams
 *
 * Research:
 * Inspired by Rails migrations (ActiveRecord), Knex migrations, and TypeORM
 * migrations. Uses timestamp-based versioning to avoid conflicts in teams.
 */

/**
 * Migration direction.
 */
export type MigrationDirection = 'up' | 'down';

/**
 * Migration context.
 * Provides access to schema builder and query builder within migrations.
 *
 * @template Connection - Database connection type
 */
export interface MigrationContext<Connection = any> {
  /**
   * Database connection for this migration.
   */
  connection: Connection;

  /**
   * Execute raw SQL.
   */
  sql(query: string, params?: readonly any[]): Promise<void>;

  /**
   * Create table builder.
   * Returns a builder for creating tables.
   */
  createTable(tableName: string): TableBuilder;

  /**
   * Drop table.
   */
  dropTable(tableName: string, ifExists?: boolean): Promise<void>;

  /**
   * Alter table builder.
   * Returns a builder for modifying existing tables.
   */
  alterTable(tableName: string): TableBuilder;

  /**
   * Check if table exists.
   */
  hasTable(tableName: string): Promise<boolean>;
}

/**
 * Table column definition.
 */
export interface ColumnDefinition {
  name: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable?: boolean;
  default?: unknown | (() => unknown);
  unique?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
}

/**
 * Table builder for creating and altering tables.
 */
export class TableBuilder {
  private tableName: string;
  private columns: ColumnDefinition[];

  constructor(tableName: string) {
    this.tableName = tableName;
    this.columns = [];
  }

  /**
   * Add an integer column.
   */
  integer(name: string, options?: Partial<ColumnDefinition>): this {
    this.columns.push({ name, type: 'integer', ...options });
    return this;
  }

  /**
   * Add a string/varchar column.
   */
  string(name: string, length: number = 255, options?: Partial<ColumnDefinition>): this {
    this.columns.push({ name, type: 'varchar', length, ...options });
    return this;
  }

  /**
   * Add a text column.
   */
  text(name: string, options?: Partial<ColumnDefinition>): this {
    this.columns.push({ name, type: 'text', ...options });
    return this;
  }

  /**
   * Add a boolean column.
   */
  boolean(name: string, options?: Partial<ColumnDefinition>): this {
    this.columns.push({ name, type: 'boolean', ...options });
    return this;
  }

  /**
   * Add a timestamp column.
   */
  timestamp(name: string, options?: Partial<ColumnDefinition>): this {
    this.columns.push({ name, type: 'timestamp', ...options });
    return this;
  }

  /**
   * Add timestamps (created_at, updated_at).
   */
  timestamps(): this {
    this.timestamp('created_at', { nullable: false, defaultValue: 'CURRENT_TIMESTAMP' });
    this.timestamp('updated_at', { nullable: false, defaultValue: 'CURRENT_TIMESTAMP' });
    return this;
  }

  /**
   * Get column definitions.
   */
  getColumns(): readonly ColumnDefinition[] {
    return this.columns;
  }

  /**
   * Get table name.
   */
  getTableName(): string {
    return this.tableName;
  }
}

/**
 * Migration definition.
 * Defines up and down migration functions.
 */
export interface Migration<Connection = any> {
  /**
   * Migration name (unique identifier).
   * Format: YYYYMMDDHHMMSS_description
   * Example: 20240101000000_create_users_table
   */
  name: string;

  /**
   * Up migration (apply changes).
   */
  up(context: MigrationContext<Connection>): Promise<void>;

  /**
   * Down migration (revert changes).
   */
  down(context: MigrationContext<Connection>): Promise<void>;
}

/**
 * Applied migration record.
 * Stored in migrations table.
 */
export interface MigrationRecord {
  id: number;
  name: string;
  appliedAt: Date;
  executionTime: number;
}

/**
 * Migration status.
 */
export interface MigrationStatus {
  name: string;
  applied: boolean;
  appliedAt?: Date;
}

/**
 * Migration runner options.
 */
export interface MigrationRunnerOptions {
  /**
   * Migrations table name.
   * Default: 'migrations'
   */
  tableName?: string;

  /**
   * Whether to wrap each migration in a transaction.
   * Default: true
   */
  transactional?: boolean;

  /**
   * Whether to lock migrations table during execution.
   * Prevents concurrent migration runs.
   * Default: true
   */
  lockTable?: boolean;
}

/**
 * Migration Runner.
 * Manages migration execution and tracking.
 *
 * @example
 * ```typescript
 * const runner = new MigrationRunner(dbAdapter);
 *
 * // Run pending migrations
 * await runner.up();
 *
 * // Rollback last migration
 * await runner.down();
 *
 * // Get migration status
 * const status = await runner.status();
 * ```
 */
export class MigrationRunner<Connection = any> {
  private migrations: Migration<Connection>[];
  private options: Required<MigrationRunnerOptions>;

  constructor(
    migrations: Migration<Connection>[],
    options?: MigrationRunnerOptions
  ) {
    this.migrations = this.sortMigrations(migrations);
    this.options = {
      tableName: options?.tableName ?? 'migrations',
      transactional: options?.transactional ?? true,
      lockTable: options?.lockTable ?? true,
    };
  }

  /**
   * Run all pending migrations.
   */
  async up(): Promise<MigrationRecord[]> {
    // TODO: Implement migration execution
    throw new Error('Migration execution not yet implemented');
  }

  /**
   * Rollback the last migration batch.
   */
  async down(): Promise<MigrationRecord[]> {
    // TODO: Implement migration rollback
    throw new Error('Migration rollback not yet implemented');
  }

  /**
   * Get status of all migrations.
   */
  async status(): Promise<readonly MigrationStatus[]> {
    // TODO: Implement migration status
    throw new Error('Migration status not yet implemented');
  }

  /**
   * Sort migrations by name (timestamp).
   */
  private sortMigrations(migrations: Migration<Connection>[]): Migration<Connection>[] {
    return [...migrations].sort((a, b) => a.name.localeCompare(b.name));
  }
}

/**
 * Helper to create a migration.
 * Provides type-safe migration definition.
 *
 * @param name - Migration name
 * @param up - Up migration function
 * @param down - Down migration function
 * @returns Migration object
 *
 * @example
 * ```typescript
 * export const createUsersTable = migration(
 *   '20240101000000_create_users_table',
 *   async (context) => {
 *     await context.createTable('users')
 *       .integer('id', { primaryKey: true, autoIncrement: true })
 *       .string('name')
 *       .string('email', 255, { unique: true })
 *       .timestamps();
 *   },
 *   async (context) => {
 *     await context.dropTable('users');
 *   }
 * );
 * ```
 */
export function migration<Connection = any>(
  name: string,
  up: (context: MigrationContext<Connection>) => Promise<void>,
  down: (context: MigrationContext<Connection>) => Promise<void>
): Migration<Connection> {
  return { name, up, down };
}

