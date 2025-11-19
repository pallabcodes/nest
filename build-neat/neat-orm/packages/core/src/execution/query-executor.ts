/**
 * Query Executor
 *
 * Executes SQL queries using database adapters and handles result processing.
 * Converts raw database results into typed entity instances with proper error handling.
 *
 * @module execution/query-executor
 */

import type {
  DatabaseAdapter,
  QueryResult,
  DatabaseRow,
  Transaction,
} from '../adapters/base-adapter.js';
import { ResultMapper } from './result-mapper.js';
import type { RowResult } from '../query-builder/query-result.js';
import type { CacheManager } from '../cache/cache-manager.js';

/**
 * Options for query execution.
 */
export interface QueryExecutionOptions {
  /**
   * Transaction to execute the query within.
   */
  transaction?: Transaction;

  /**
   * Maximum execution time in milliseconds.
   */
  timeout?: number;

  /**
   * Whether to return raw results without mapping.
   */
  raw?: boolean;

  /**
   * Entity class to map results to.
   */
  entityClass?: new () => unknown;

  /**
   * Custom result mapper function.
   */
  mapper?: <T>(rows: DatabaseRow[]) => T[];

  /**
   * Whether to log the query.
   */
  logging?: boolean;

  /**
   * Custom logger function.
   */
  logger?: (sql: string, params?: unknown[], duration?: number) => void;

  /**
   * Whether to use caching for this query.
   */
  cache?: boolean;

  /**
   * Cache TTL in milliseconds.
   */
  cacheTtl?: number;

  /**
   * Cache key for this query.
   */
  cacheKey?: string;

  /**
   * Tables involved in this query (for invalidation).
   */
  tables?: string[];
}

/**
 * Execution result with metadata.
 */
export interface ExecutionResult<T = RowResult> {
  /**
   * Result rows.
   */
  rows: T[];

  /**
   * Number of rows affected.
   */
  rowCount: number;

  /**
   * Execution time in milliseconds.
   */
  executionTime: number;

  /**
   * SQL query that was executed.
   */
  sql: string;

  /**
   * Parameters used in the query.
   */
  params?: unknown[];

  /**
   * Whether the result came from cache.
   */
  cached?: boolean;
}

/**
 * Query Executor
 *
 * Responsible for executing SQL queries and mapping results.
 */
export class QueryExecutor {
  private resultMapper: ResultMapper;
  private cacheManager?: CacheManager;

  constructor(private adapter: DatabaseAdapter, cacheManager?: CacheManager) {
    this.resultMapper = new ResultMapper();
    if (cacheManager !== undefined) {
      this.cacheManager = cacheManager;
    }
  }

  /**
   * Set the cache manager.
   * If cacheManager is undefined, the cache manager will be removed.
   */
  setCacheManager(cacheManager?: CacheManager): void {
    if (cacheManager !== undefined) {
      this.cacheManager = cacheManager;
    } else {
      delete this.cacheManager;
    }
  }

  /**
   * Execute a SELECT query and return mapped results.
   *
   * @param sql - SQL query to execute
   * @param params - Query parameters
   * @param options - Execution options
   * @returns Execution result with typed rows
   */
  async executeSelect<T = RowResult>(
    sql: string,
    params?: unknown[],
    options?: QueryExecutionOptions
  ): Promise<ExecutionResult<T>> {
    const startTime = Date.now();

    try {
      // Check cache first if enabled
      if (options?.cache && this.cacheManager) {
        const cachedResult = await this.cacheManager.getCachedQueryResult(sql, params || []);

        if (cachedResult !== undefined) {
          if (options?.logging && options?.logger) {
            options.logger(`CACHE HIT: ${sql}`, params, Date.now() - startTime);
          }

          return {
            rows: cachedResult as T[],
            rowCount: Array.isArray(cachedResult) ? cachedResult.length : 0,
            executionTime: Date.now() - startTime,
            sql,
            params: params || [],
            cached: true,
          };
        }
      }

      // Log query if enabled
      if (options?.logging && options?.logger) {
        options.logger(sql, params);
      }

      // Execute query
      const result = await this.execute<T>(sql, params, options);

      // Map results if entity class provided and not raw
      let rows = result.rows;
      if (options?.entityClass && !options?.raw) {
        rows = this.resultMapper.mapToEntities(
          result.rows as DatabaseRow[],
          options.entityClass
        ) as T[];
      } else if (options?.mapper) {
        rows = options.mapper(result.rows as DatabaseRow[]);
      }

      const executionTime = Date.now() - startTime;

      // Cache result if enabled
      if (options?.cache && this.cacheManager) {
        await this.cacheManager.cacheQueryResult(
          sql,
          params || [],
          rows,
          options.tables || [],
          options.cacheTtl
        );
      }

      // Log execution time if enabled
      if (options?.logging && options?.logger) {
        options.logger(sql, params, executionTime);
      }

      return {
        rows,
        rowCount: result.rowCount,
        executionTime,
        sql,
        params: params || [],
        cached: false,
      };
    } catch (error) {
      throw this.handleError(error, sql, params);
    }
  }


  /**
   * Invalidate cache for affected tables.
   *
   * @private
   */
  private async invalidateCacheForTables(tables: string[]): Promise<void> {
    if (this.cacheManager && tables.length > 0) {
      await this.cacheManager.invalidateTableCache(tables);
    }
  }

  /**
   * Execute an INSERT query and return inserted rows (if RETURNING is used).
   *
   * @param sql - SQL query to execute
   * @param params - Query parameters
   * @param options - Execution options
   * @returns Execution result
   */
  async executeInsert<T = RowResult>(
    sql: string,
    params?: unknown[],
    options?: QueryExecutionOptions
  ): Promise<ExecutionResult<T>> {
    const startTime = Date.now();

    try {
      if (options?.logging && options?.logger) {
        options.logger(sql, params);
      }

      const result = await this.execute<T>(sql, params, options);
      const executionTime = Date.now() - startTime;

      // Invalidate cache for affected tables
      if (options?.tables) {
        await this.invalidateCacheForTables(options.tables);
      }

      if (options?.logging && options?.logger) {
        options.logger(sql, params, executionTime);
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime,
        sql,
        params: params || [],
      };
    } catch (error) {
      throw this.handleError(error, sql, params);
    }
  }

  /**
   * Execute an UPDATE query.
   *
   * @param sql - SQL query to execute
   * @param params - Query parameters
   * @param options - Execution options
   * @returns Execution result
   */
  async executeUpdate<T = RowResult>(
    sql: string,
    params?: unknown[],
    options?: QueryExecutionOptions
  ): Promise<ExecutionResult<T>> {
    const startTime = Date.now();

    try {
      if (options?.logging && options?.logger) {
        options.logger(sql, params);
      }

      const result = await this.execute<T>(sql, params, options);
      const executionTime = Date.now() - startTime;

      // Invalidate cache for affected tables
      if (options?.tables) {
        await this.invalidateCacheForTables(options.tables);
      }

      if (options?.logging && options?.logger) {
        options.logger(sql, params, executionTime);
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime,
        sql,
        params: params || [],
      };
    } catch (error) {
      throw this.handleError(error, sql, params);
    }
  }

  /**
   * Execute a DELETE query.
   *
   * @param sql - SQL query to execute
   * @param params - Query parameters
   * @param options - Execution options
   * @returns Execution result
   */
  async executeDelete<T = RowResult>(
    sql: string,
    params?: unknown[],
    options?: QueryExecutionOptions
  ): Promise<ExecutionResult<T>> {
    const startTime = Date.now();

    try {
      if (options?.logging && options?.logger) {
        options.logger(sql, params);
      }

      const result = await this.execute<T>(sql, params, options);
      const executionTime = Date.now() - startTime;

      // Invalidate cache for affected tables
      if (options?.tables) {
        await this.invalidateCacheForTables(options.tables);
      }

      if (options?.logging && options?.logger) {
        options.logger(sql, params, executionTime);
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime,
        sql,
        params: params || [],
      };
    } catch (error) {
      throw this.handleError(error, sql, params);
    }
  }

  /**
   * Execute a raw SQL query.
   *
   * @param sql - SQL query to execute
   * @param params - Query parameters
   * @param options - Execution options
   * @returns Execution result
   */
  async executeRaw<T = RowResult>(
    sql: string,
    params?: unknown[],
    options?: QueryExecutionOptions
  ): Promise<ExecutionResult<T>> {
    const startTime = Date.now();

    try {
      if (options?.logging && options?.logger) {
        options.logger(sql, params);
      }

      const result = await this.execute<T>(sql, params, options);
      const executionTime = Date.now() - startTime;

      if (options?.logging && options?.logger) {
        options.logger(sql, params, executionTime);
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime,
        sql,
        params: params || [],
      };
    } catch (error) {
      throw this.handleError(error, sql, params);
    }
  }

  /**
   * Execute a query with optional timeout.
   *
   * @private
   */
  private async execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[],
    options?: QueryExecutionOptions
  ): Promise<QueryResult<T>> {
    // Execute within transaction if provided
    if (options?.transaction) {
      if (!options.transaction.isActive()) {
        throw new Error('Transaction is not active');
      }
      return options.transaction.execute<T>(sql, params);
    }

    // Execute with timeout if specified
    if (options?.timeout) {
      return this.executeWithTimeout<T>(sql, params, options.timeout);
    }

    // Execute normally
    return this.adapter.execute<T>(sql, params);
  }

  /**
   * Execute a query with timeout.
   *
   * @private
   */
  private async executeWithTimeout<T = DatabaseRow>(
    sql: string,
    params: unknown[] | undefined,
    timeout: number
  ): Promise<QueryResult<T>> {
    return Promise.race([
      this.adapter.execute<T>(sql, params),
      this.createTimeoutPromise<QueryResult<T>>(timeout),
    ]);
  }

  /**
   * Create a timeout promise that rejects after specified duration.
   *
   * @private
   */
  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    // Use setTimeout which is available in Node.js runtime
    // Type assertion needed because setTimeout may not be in TypeScript's global scope
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const setTimeoutFn: (callback: () => void, ms: number) => unknown =
      (globalThis as unknown as { setTimeout?: (callback: () => void, ms: number) => unknown }).setTimeout ||
      ((_callback: () => void, _ms: number) => {
        // Fallback implementation (should not be reached in Node.js)
        throw new Error('setTimeout not available in this environment');
      });

    return new Promise((_resolve, reject) => {
      setTimeoutFn(() => {
        reject(new Error(`Query execution timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Handle execution errors and convert to NeatOrm errors.
   *
   * @private
   */
  private handleError(error: unknown, sql: string, params?: unknown[]): Error {
    const message =
      error instanceof Error ? error.message : String(error);

    // Create a detailed error with SQL context
    const detailedError = new Error(
      `Query execution failed: ${message}\nSQL: ${sql}\nParams: ${JSON.stringify(params || [])}`
    );

    // Preserve stack trace
    if (error instanceof Error && error.stack) {
      detailedError.stack = error.stack;
    }

    return detailedError;
  }

  /**
   * Get the underlying database adapter.
   */
  getAdapter(): DatabaseAdapter {
    return this.adapter;
  }

  /**
   * Get the result mapper.
   */
  getResultMapper(): ResultMapper {
    return this.resultMapper;
  }
}

