/**
 * Stream Executor
 *
 * Executes queries that return large result sets as async iterables,
 * handling backpressure and memory efficiency.
 *
 * @module execution/stream-executor
 */

import type { DatabaseAdapter, DatabaseRow } from '../adapters/base-adapter.js';
import { ResultMapper } from './result-mapper.js';
import type { MappingOptions } from './result-mapper.js';

/**
 * Options for streaming queries.
 */
export interface StreamOptions {
  /**
   * Number of rows to fetch at a time (batch size).
   */
  batchSize?: number;

  /**
   * Entity class to map results to.
   */
  entityClass?: new () => unknown;

  /**
   * Result mapping options.
   */
  mappingOptions?: MappingOptions;

  /**
   * Whether to return raw results without mapping.
   */
  raw?: boolean;

  /**
   * High water mark for backpressure handling.
   */
  highWaterMark?: number;
}

/**
 * Stream Executor
 *
 * Provides async iteration over large query result sets.
 */
export class StreamExecutor {
  private resultMapper: ResultMapper;

  constructor(private adapter: DatabaseAdapter) {
    this.resultMapper = new ResultMapper();
  }

  /**
   * Execute a query and return an async iterable of results.
   *
   * This method uses cursor-based streaming for large result sets,
   * fetching rows in batches to avoid loading everything into memory.
   *
   * @param sql - SQL query to execute
   * @param params - Query parameters
   * @param options - Streaming options
   * @returns Async iterable of results
   *
   * @example
   * ```typescript
   * const executor = new StreamExecutor(adapter);
   *
   * for await (const user of executor.stream('SELECT * FROM users', [], { batchSize: 100 })) {
   *   console.log(user);
   * }
   * ```
   */
  async *stream<T = DatabaseRow>(
    sql: string,
    params?: unknown[],
    options?: StreamOptions
  ): AsyncIterableIterator<T> {
    const batchSize = options?.batchSize || 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      // Add LIMIT and OFFSET to query for pagination
      const paginatedSql = this.addPagination(sql, batchSize, offset);

      // Execute query for current batch
      const result = await this.adapter.execute<DatabaseRow>(
        paginatedSql,
        params
      );

      // Map results if entity class provided
      let batch: T[];
      if (options?.entityClass && !options?.raw) {
        batch = this.resultMapper.mapToEntities<T>(
          result.rows,
          options.entityClass,
          options.mappingOptions
        );
      } else {
        batch = result.rows as T[];
      }

      // Yield each row in the batch
      for (const row of batch) {
        yield row;
      }

      // Check if there are more rows
      hasMore = batch.length === batchSize;
      offset += batchSize;
    }
  }

  /**
   * Execute a query and return an async iterable of batches.
   *
   * This is more efficient than streaming individual rows when
   * you can process multiple rows at once.
   *
   * @param sql - SQL query to execute
   * @param params - Query parameters
   * @param options - Streaming options
   * @returns Async iterable of result batches
   *
   * @example
   * ```typescript
   * const executor = new StreamExecutor(adapter);
   *
   * for await (const batch of executor.streamBatches('SELECT * FROM users', [], { batchSize: 100 })) {
   *   await processBatch(batch); // Process 100 users at a time
   * }
   * ```
   */
  async *streamBatches<T = DatabaseRow>(
    sql: string,
    params?: unknown[],
    options?: StreamOptions
  ): AsyncIterableIterator<T[]> {
    const batchSize = options?.batchSize || 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      // Add LIMIT and OFFSET to query for pagination
      const paginatedSql = this.addPagination(sql, batchSize, offset);

      // Execute query for current batch
      const result = await this.adapter.execute<DatabaseRow>(
        paginatedSql,
        params
      );

      // Map results if entity class provided
      let batch: T[];
      if (options?.entityClass && !options?.raw) {
        batch = this.resultMapper.mapToEntities<T>(
          result.rows,
          options.entityClass,
          options.mappingOptions
        );
      } else {
        batch = result.rows as T[];
      }

      // Yield the entire batch
      if (batch.length > 0) {
        yield batch;
      }

      // Check if there are more rows
      hasMore = batch.length === batchSize;
      offset += batchSize;
    }
  }

  /**
   * Add LIMIT and OFFSET clauses to a SQL query.
   *
   * @private
   */
  private addPagination(
    sql: string,
    limit: number,
    offset: number
  ): string {
    // Remove trailing semicolon if present
    const trimmedSql = sql.trim().replace(/;$/, '');

    // Check if query already has LIMIT/OFFSET
    if (
      /\bLIMIT\b/i.test(trimmedSql) ||
      /\bOFFSET\b/i.test(trimmedSql)
    ) {
      throw new Error(
        'Cannot stream query that already contains LIMIT or OFFSET'
      );
    }

    return `${trimmedSql} LIMIT ${limit} OFFSET ${offset}`;
  }

  /**
   * Convert an async iterable to an array.
   *
   * Note: This loads all results into memory, defeating the purpose
   * of streaming. Use only when necessary.
   *
   * @param iterable - Async iterable to convert
   * @returns Array of all results
   */
  static async toArray<T>(
    iterable: AsyncIterableIterator<T>
  ): Promise<T[]> {
    const results: T[] = [];
    for await (const item of iterable) {
      results.push(item);
    }
    return results;
  }

  /**
   * Count the number of items in an async iterable.
   *
   * @param iterable - Async iterable to count
   * @returns Total count
   */
  static async count<T>(
    iterable: AsyncIterableIterator<T>
  ): Promise<number> {
    let count = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _item of iterable) {
      count++;
    }
    return count;
  }

  /**
   * Take the first N items from an async iterable.
   *
   * @param iterable - Async iterable to take from
   * @param n - Number of items to take
   * @returns Array of first N items
   */
  static async take<T>(
    iterable: AsyncIterableIterator<T>,
    n: number
  ): Promise<T[]> {
    const results: T[] = [];
    let count = 0;

    for await (const item of iterable) {
      if (count >= n) {
        break;
      }
      results.push(item);
      count++;
    }

    return results;
  }

  /**
   * Skip the first N items from an async iterable.
   *
   * @param iterable - Async iterable to skip from
   * @param n - Number of items to skip
   * @returns Async iterable starting after skipped items
   */
  static async *skip<T>(
    iterable: AsyncIterableIterator<T>,
    n: number
  ): AsyncIterableIterator<T> {
    let count = 0;

    for await (const item of iterable) {
      if (count >= n) {
        yield item;
      }
      count++;
    }
  }

  /**
   * Filter items from an async iterable.
   *
   * @param iterable - Async iterable to filter
   * @param predicate - Filter function
   * @returns Async iterable of filtered items
   */
  static async *filter<T>(
    iterable: AsyncIterableIterator<T>,
    predicate: (item: T) => boolean | Promise<boolean>
  ): AsyncIterableIterator<T> {
    for await (const item of iterable) {
      if (await predicate(item)) {
        yield item;
      }
    }
  }

  /**
   * Map items from an async iterable.
   *
   * @param iterable - Async iterable to map
   * @param mapper - Mapping function
   * @returns Async iterable of mapped items
   */
  static async *map<T, U>(
    iterable: AsyncIterableIterator<T>,
    mapper: (item: T) => U | Promise<U>
  ): AsyncIterableIterator<U> {
    for await (const item of iterable) {
      yield await mapper(item);
    }
  }
}

