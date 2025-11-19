/**
 * Database Seeder
 *
 * Provides infrastructure for seeding databases with test or initial data.
 * Supports dependency ordering, transaction safety, and idempotency.
 *
 * @module seeding/seeder
 */

import type { DatabaseAdapter, Transaction } from '../adapters/base-adapter.js';
import { QueryExecutor } from '../execution/query-executor.js';

/**
 * Seeder interface that all seeders must implement.
 */
export interface Seeder {
  /**
   * Unique name for the seeder.
   */
  name: string;

  /**
   * Order in which this seeder should run.
   * Lower numbers run first.
   * Default: 100
   */
  order?: number;

  /**
   * Dependencies (other seeders that must run before this one).
   */
  dependencies?: string[];

  /**
   * Run the seeder.
   *
   * @param executor - Query executor for database operations
   * @param transaction - Optional transaction context
   */
  run(executor: QueryExecutor, transaction?: Transaction): Promise<void>;

  /**
   * Optional: Rollback/cleanup the seeder.
   *
   * @param executor - Query executor for database operations
   * @param transaction - Optional transaction context
   */
  rollback?(executor: QueryExecutor, transaction?: Transaction): Promise<void>;
}

/**
 * Seeder execution context.
 */
export interface SeederContext {
  /**
   * Database adapter.
   */
  adapter: DatabaseAdapter;

  /**
   * Query executor.
   */
  executor: QueryExecutor;

  /**
   * Current transaction (if any).
   */
  transaction?: Transaction;

  /**
   * Seeder execution history.
   */
  history: SeederHistory;
}

/**
 * Seeder execution history entry.
 */
export interface SeederHistoryEntry {
  /**
   * Seeder name.
   */
  name: string;

  /**
   * Execution timestamp.
   */
  executedAt: Date;

  /**
   * Execution status.
   */
  status: 'success' | 'failed' | 'rolled_back';

  /**
   * Error message (if failed).
   */
  error?: string;

  /**
   * Execution time in milliseconds.
   */
  executionTime: number;
}

/**
 * Seeder execution history.
 */
export class SeederHistory {
  private entries: Map<string, SeederHistoryEntry> = new Map();
  private tableName: string = 'neat_seeders';

  constructor(private executor: QueryExecutor) {}

  /**
   * Initialize seeder history table.
   */
  async initialize(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        name VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP NOT NULL,
        status VARCHAR(50) NOT NULL,
        error TEXT,
        execution_time INTEGER NOT NULL
      )
    `;

    await this.executor.executeRaw(sql);
  }

  /**
   * Check if a seeder has been executed.
   */
  async hasBeenExecuted(name: string): Promise<boolean> {
    const sql = `SELECT name FROM ${this.tableName} WHERE name = $1 AND status = 'success'`;
    const result = await this.executor.queryRaw(sql, [name]);
    return result.length > 0;
  }

  /**
   * Record seeder execution.
   */
  async recordExecution(entry: SeederHistoryEntry): Promise<void> {
    const sql = `
      INSERT INTO ${this.tableName} (name, executed_at, status, error, execution_time)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) DO UPDATE SET
        executed_at = EXCLUDED.executed_at,
        status = EXCLUDED.status,
        error = EXCLUDED.error,
        execution_time = EXCLUDED.execution_time
    `;

    await this.executor.executeRaw(sql, [
      entry.name,
      entry.executedAt,
      entry.status,
      entry.error || null,
      entry.executionTime,
    ]);

    this.entries.set(entry.name, entry);
  }

  /**
   * Get execution history for a seeder.
   */
  async getEntry(name: string): Promise<SeederHistoryEntry | undefined> {
    const sql = `SELECT * FROM ${this.tableName} WHERE name = $1`;
    const result = await this.executor.queryRaw<SeederHistoryEntry>(sql, [name]);
    return result[0];
  }

  /**
   * Get all execution history.
   */
  async getAllEntries(): Promise<SeederHistoryEntry[]> {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY executed_at DESC`;
    return this.executor.queryRaw<SeederHistoryEntry>(sql);
  }

  /**
   * Clear history for a seeder (for re-running).
   */
  async clearEntry(name: string): Promise<void> {
    const sql = `DELETE FROM ${this.tableName} WHERE name = $1`;
    await this.executor.executeRaw(sql, [name]);
    this.entries.delete(name);
  }

  /**
   * Clear all history.
   */
  async clearAll(): Promise<void> {
    const sql = `DELETE FROM ${this.tableName}`;
    await this.executor.executeRaw(sql);
    this.entries.clear();
  }
}

/**
 * Options for seeder runner.
 */
export interface SeederRunnerOptions {
  /**
   * Whether to use transactions.
   * Default: true
   */
  useTransactions?: boolean;

  /**
   * Whether to skip already executed seeders.
   * Default: true
   */
  skipExecuted?: boolean;

  /**
   * Whether to force re-run all seeders.
   * Default: false
   */
  force?: boolean;

  /**
   * Maximum concurrent seeders.
   * Default: 1 (sequential)
   */
  concurrency?: number;

  /**
   * Logger function.
   */
  logger?: (message: string, data?: unknown) => void;

  /**
   * Whether to stop on first error.
   * Default: true
   */
  stopOnError?: boolean;
}

/**
 * Seeder runner for executing seeders.
 */
export class SeederRunner {
  private history: SeederHistory;
  private executor: QueryExecutor;

  constructor(
    private adapter: DatabaseAdapter,
    private options: SeederRunnerOptions = {}
  ) {
    this.executor = new QueryExecutor(adapter);
    this.history = new SeederHistory(this.executor);
  }

  /**
   * Run seeders.
   *
   * @param seeders - Array of seeders to run
   */
  async run(seeders: Seeder[]): Promise<void> {
    await this.history.initialize();

    // Sort seeders by order and dependencies
    const sortedSeeders = this.sortSeeders(seeders);

    this.log(`Running ${sortedSeeders.length} seeders...`);

    for (const seeder of sortedSeeders) {
      await this.runSeeder(seeder);
    }

    this.log('All seeders completed successfully');
  }

  /**
   * Run a single seeder.
   *
   * @private
   */
  private async runSeeder(seeder: Seeder): Promise<void> {
    // Check if already executed
    if (this.options.skipExecuted && !this.options.force) {
      const executed = await this.history.hasBeenExecuted(seeder.name);
      if (executed) {
        this.log(`Skipping ${seeder.name} (already executed)`);
        return;
      }
    }

    // Force re-run if specified
    if (this.options.force) {
      await this.history.clearEntry(seeder.name);
    }

    this.log(`Running seeder: ${seeder.name}`);
    const startTime = Date.now();

    try {
      // Run with or without transaction
      if (this.options.useTransactions !== false) {
        const transaction = await this.adapter.beginTransaction();
        try {
          await seeder.run(this.executor, transaction);
          await transaction.commit();
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      } else {
        await seeder.run(this.executor);
      }

      // Record success
      const executionTime = Date.now() - startTime;
      await this.history.recordExecution({
        name: seeder.name,
        executedAt: new Date(),
        status: 'success',
        executionTime,
      });

      this.log(`✓ ${seeder.name} completed (${executionTime}ms)`);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Record failure
      await this.history.recordExecution({
        name: seeder.name,
        executedAt: new Date(),
        status: 'failed',
        error: errorMessage,
        executionTime,
      });

      this.log(`✗ ${seeder.name} failed: ${errorMessage}`, error);

      if (this.options.stopOnError !== false) {
        throw new Error(`Seeder ${seeder.name} failed: ${errorMessage}`);
      }
    }
  }

  /**
   * Rollback seeders.
   *
   * @param seeders - Array of seeders to rollback
   */
  async rollback(seeders: Seeder[]): Promise<void> {
    await this.history.initialize();

    // Rollback in reverse order
    const sortedSeeders = this.sortSeeders(seeders).reverse();

    this.log(`Rolling back ${sortedSeeders.length} seeders...`);

    for (const seeder of sortedSeeders) {
      if (!seeder.rollback) {
        this.log(`Skipping ${seeder.name} (no rollback method)`);
        continue;
      }

      this.log(`Rolling back seeder: ${seeder.name}`);
      const startTime = Date.now();

      try {
        // Rollback with or without transaction
        if (this.options.useTransactions !== false) {
          const transaction = await this.adapter.beginTransaction();
          try {
            await seeder.rollback(this.executor, transaction);
            await transaction.commit();
          } catch (error) {
            await transaction.rollback();
            throw error;
          }
        } else {
          await seeder.rollback(this.executor);
        }

        // Record rollback
        const executionTime = Date.now() - startTime;
        await this.history.recordExecution({
          name: seeder.name,
          executedAt: new Date(),
          status: 'rolled_back',
          executionTime,
        });

        this.log(`✓ ${seeder.name} rolled back (${executionTime}ms)`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(`✗ ${seeder.name} rollback failed: ${errorMessage}`, error);

        if (this.options.stopOnError !== false) {
          throw new Error(`Seeder ${seeder.name} rollback failed: ${errorMessage}`);
        }
      }
    }

    this.log('All seeders rolled back successfully');
  }

  /**
   * Sort seeders by order and dependencies.
   *
   * @private
   */
  private sortSeeders(seeders: Seeder[]): Seeder[] {
    const sorted: Seeder[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const seederMap = new Map(seeders.map(s => [s.name, s]));

    const visit = (seeder: Seeder) => {
      if (visited.has(seeder.name)) {
        return;
      }

      if (visiting.has(seeder.name)) {
        throw new Error(`Circular dependency detected: ${seeder.name}`);
      }

      visiting.add(seeder.name);

      // Visit dependencies first
      if (seeder.dependencies) {
        for (const depName of seeder.dependencies) {
          const dep = seederMap.get(depName);
          if (!dep) {
            throw new Error(`Dependency not found: ${depName} (required by ${seeder.name})`);
          }
          visit(dep);
        }
      }

      visiting.delete(seeder.name);
      visited.add(seeder.name);
      sorted.push(seeder);
    };

    // Sort by order first
    const orderedSeeders = [...seeders].sort((a, b) => {
      const orderA = a.order ?? 100;
      const orderB = b.order ?? 100;
      return orderA - orderB;
    });

    // Then visit with dependency resolution
    for (const seeder of orderedSeeders) {
      visit(seeder);
    }

    return sorted;
  }

  /**
   * Get seeder history.
   */
  async getHistory(): Promise<SeederHistoryEntry[]> {
    await this.history.initialize();
    return this.history.getAllEntries();
  }

  /**
   * Clear seeder history.
   */
  async clearHistory(): Promise<void> {
    await this.history.initialize();
    await this.history.clearAll();
  }

  /**
   * Log message.
   *
   * @private
   */
  private log(message: string, data?: unknown): void {
    if (this.options.logger) {
      this.options.logger(message, data);
    }
  }
}

