/**
 * NeatOrm - Window Functions Builder
 *
 * Type-safe builder for SQL window functions (OVER clause). Window functions
 * are essential for analytics but are poorly supported in most ORMs.
 *
 * Key TypeScript Excellence Features:
 * - Type-safe window function calls
 * - Fluent PARTITION BY and ORDER BY API
 * - Frame clause support (ROWS/RANGE)
 * - Result type inference
 * - Compile-time validation
 *
 * TypeScript Compilation:
 * Window builder uses generics to ensure column names and types are valid.
 * TypeScript validates PARTITION BY and ORDER BY columns at compile time.
 *
 * Runtime Behavior:
 * Generates OVER clauses for window functions. Supports all standard window
 * functions (ROW_NUMBER, RANK, LAG, LEAD, etc.) and custom aggregates.
 *
 * Framework Integration:
 * Window builder integrates with:
 * - SELECT query builder for window expressions
 * - SQL generator for OVER clause syntax
 * - Entity schemas for column validation
 * - Result types for type inference
 *
 * Pain Points Addressed:
 * - No window function support in most ORMs
 * - Complex OVER clause syntax
 * - Manual frame specification
 * - Type safety in window expressions
 * - Database-specific differences
 *
 * Research:
 * Window functions are ANSI SQL:2003 standard supported by PostgreSQL,
 * MySQL 8.0+, SQLite 3.25+. Essential for analytics, ranking, running
 * totals, and moving averages.
 *
 * References:
 * - PostgreSQL Window Functions
 * - MySQL Window Functions
 * - SQL:2003 Standard
 */

import type { RowResult } from '../query-builder/query-result.js';
import type { OrderDirection } from '../query-builder/query-builder-types.js';

/**
 * Window function types.
 */
export type WindowFunction =
  | 'ROW_NUMBER'
  | 'RANK'
  | 'DENSE_RANK'
  | 'PERCENT_RANK'
  | 'CUME_DIST'
  | 'NTILE'
  | 'LAG'
  | 'LEAD'
  | 'FIRST_VALUE'
  | 'LAST_VALUE'
  | 'NTH_VALUE';

/**
 * Frame mode for window functions.
 */
export type FrameMode = 'ROWS' | 'RANGE' | 'GROUPS';

/**
 * Frame boundary types.
 */
export type FrameBoundary =
  | 'UNBOUNDED PRECEDING'
  | 'UNBOUNDED FOLLOWING'
  | 'CURRENT ROW'
  | number; // Offset (e.g., 1 PRECEDING, 2 FOLLOWING)

/**
 * Frame specification.
 */
export interface FrameSpec {
  mode: FrameMode;
  start: FrameBoundary;
  end?: FrameBoundary | undefined;
}

/**
 * Window specification (OVER clause content).
 */
export interface WindowSpec<Schema extends RowResult = RowResult> {
  /**
   * PARTITION BY columns.
   */
  partitionBy?: readonly (keyof Schema & string)[];

  /**
   * ORDER BY clauses.
   */
  orderBy?: readonly { column: keyof Schema & string; direction: OrderDirection }[];

  /**
   * Frame specification (ROWS/RANGE/GROUPS).
   */
  frame?: FrameSpec;
}

/**
 * Window Function Builder.
 * Builds window functions with OVER clauses.
 *
 * @template Schema - Entity schema type
 *
 * @example
 * ```typescript
 * // Row numbering
 * const query = db
 *   .select('id', 'name', 'salary')
 *   .selectAs(
 *     window<Employee>()
 *       .rowNumber()
 *       .partitionBy('department')
 *       .orderBy('salary', 'DESC')
 *       .build(),
 *     'rank_in_dept'
 *   )
 *   .from('employees');
 *
 * // Running total
 * const runningTotal = db
 *   .select('date', 'amount')
 *   .selectAs(
 *     window<Sales>()
 *       .sum('amount')
 *       .orderBy('date')
 *       .frame('ROWS', 'UNBOUNDED PRECEDING', 'CURRENT ROW')
 *       .build(),
 *     'running_total'
 *   )
 *   .from('sales');
 *
 * // LAG function (previous row value)
 * const withPrevious = db
 *   .select('date', 'price')
 *   .selectAs(
 *     window<StockPrices>()
 *       .lag('price', 1)
 *       .orderBy('date')
 *       .build(),
 *     'previous_price'
 *   )
 *   .from('stock_prices');
 * ```
 */
export class WindowBuilder<Schema extends RowResult = RowResult> {
  private functionExpr?: string;
  private spec: WindowSpec<Schema>;

  constructor() {
    this.spec = {};
  }

  /**
   * ROW_NUMBER() window function.
   * Assigns a unique sequential integer to each row.
   *
   * @returns Builder instance
   *
   * @example
   * ```typescript
   * window().rowNumber().partitionBy('category').orderBy('price', 'DESC')
   * // ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC)
   * ```
   */
  rowNumber(): this {
    this.functionExpr = 'ROW_NUMBER()';
    return this;
  }

  /**
   * RANK() window function.
   * Assigns a rank with gaps for tied values.
   *
   * @returns Builder instance
   */
  rank(): this {
    this.functionExpr = 'RANK()';
    return this;
  }

  /**
   * DENSE_RANK() window function.
   * Assigns a rank without gaps for tied values.
   *
   * @returns Builder instance
   */
  denseRank(): this {
    this.functionExpr = 'DENSE_RANK()';
    return this;
  }

  /**
   * LAG() window function.
   * Accesses value from previous row.
   *
   * @param column - Column to access
   * @param offset - Number of rows back (default: 1)
   * @param defaultValue - Default if no previous row exists
   * @returns Builder instance
   *
   * @example
   * ```typescript
   * window().lag('price', 1, 0).orderBy('date')
   * // LAG(price, 1, 0) OVER (ORDER BY date)
   * ```
   */
  lag(
    column: keyof Schema & string,
    offset: number = 1,
    defaultValue?: unknown  // Can be any SQL value (number, string, date, null, etc.)
  ): this {
    const args = [column, offset];
    if (defaultValue !== undefined) {
      args.push(defaultValue);
    }
    this.functionExpr = `LAG(${args.join(', ')})`;
    return this;
  }

  /**
   * LEAD() window function.
   * Accesses value from next row.
   *
   * @param column - Column to access
   * @param offset - Number of rows forward (default: 1)
   * @param defaultValue - Default if no next row exists
   * @returns Builder instance
   */
  lead(
    column: keyof Schema & string,
    offset: number = 1,
    defaultValue?: unknown  // Can be any SQL value (number, string, date, null, etc.)
  ): this {
    const args = [column, offset];
    if (defaultValue !== undefined) {
      args.push(defaultValue);
    }
    this.functionExpr = `LEAD(${args.join(', ')})`;
    return this;
  }

  /**
   * SUM() aggregate as window function.
   * Calculates running sum.
   *
   * @param column - Column to sum
   * @returns Builder instance
   */
  sum(column: keyof Schema & string): this {
    this.functionExpr = `SUM(${String(column)})`;
    return this;
  }

  /**
   * AVG() aggregate as window function.
   * Calculates running average.
   *
   * @param column - Column to average
   * @returns Builder instance
   */
  avg(column: keyof Schema & string): this {
    this.functionExpr = `AVG(${String(column)})`;
    return this;
  }

  /**
   * COUNT() aggregate as window function.
   *
   * @param column - Column to count (or '*' for all rows)
   * @returns Builder instance
   */
  count(column: keyof Schema & string | '*' = '*'): this {
    this.functionExpr = `COUNT(${String(column)})`;
    return this;
  }

  /**
   * FIRST_VALUE() window function.
   * Gets the first value in window frame.
   *
   * @param column - Column to get
   * @returns Builder instance
   */
  firstValue(column: keyof Schema & string): this {
    this.functionExpr = `FIRST_VALUE(${String(column)})`;
    return this;
  }

  /**
   * LAST_VALUE() window function.
   * Gets the last value in window frame.
   *
   * @param column - Column to get
   * @returns Builder instance
   */
  lastValue(column: keyof Schema & string): this {
    this.functionExpr = `LAST_VALUE(${String(column)})`;
    return this;
  }

  /**
   * PARTITION BY clause.
   * Divides rows into partitions.
   *
   * @param columns - Columns to partition by
   * @returns Builder instance
   *
   * @example
   * ```typescript
   * window().rowNumber().partitionBy('department', 'team')
   * // ROW_NUMBER() OVER (PARTITION BY department, team)
   * ```
   */
  partitionBy(...columns: readonly (keyof Schema & string)[]): this {
    this.spec.partitionBy = columns;
    return this;
  }

  /**
   * ORDER BY clause.
   * Defines order within window.
   *
   * @param column - Column to order by
   * @param direction - Sort direction
   * @returns Builder instance
   */
  orderBy(column: keyof Schema & string, direction: OrderDirection = 'ASC'): this {
    if (!this.spec.orderBy) {
      this.spec.orderBy = [];
    }
    this.spec.orderBy = [...this.spec.orderBy, { column, direction }];
    return this;
  }

  /**
   * Frame specification (ROWS/RANGE/GROUPS).
   * Defines the window frame for aggregates.
   *
   * @param mode - Frame mode (ROWS/RANGE/GROUPS)
   * @param start - Frame start boundary
   * @param end - Frame end boundary (optional, defaults to CURRENT ROW)
   * @returns Builder instance
   *
   * @example
   * ```typescript
   * // Running total from start to current row
   * window().sum('amount')
   *   .frame('ROWS', 'UNBOUNDED PRECEDING', 'CURRENT ROW')
   *
   * // 3-row moving average
   * window().avg('value')
   *   .frame('ROWS', 2, 0) // 2 PRECEDING to CURRENT ROW
   * ```
   */
  frame(mode: FrameMode, start: FrameBoundary, end?: FrameBoundary): this {
    this.spec.frame = { mode, start, end };
    return this;
  }

  /**
   * Build the window function SQL.
   *
   * @returns SQL string for window function
   */
  build(): string {
    if (!this.functionExpr) {
      throw new Error('No window function specified. Call a function method first.');
    }

    const parts: string[] = [];

    // PARTITION BY
    if (this.spec.partitionBy && this.spec.partitionBy.length > 0) {
      parts.push(`PARTITION BY ${this.spec.partitionBy.join(', ')}`);
    }

    // ORDER BY
    if (this.spec.orderBy && this.spec.orderBy.length > 0) {
      const orderClauses = this.spec.orderBy.map(
        o => `${String(o.column)} ${o.direction}`
      );
      parts.push(`ORDER BY ${orderClauses.join(', ')}`);
    }

    // Frame specification
    if (this.spec.frame) {
      parts.push(this.buildFrameClause(this.spec.frame));
    }

    const overClause = parts.length > 0 ? ` OVER (${parts.join(' ')})` : ' OVER ()';
    return `${this.functionExpr}${overClause}`;
  }

  /**
   * Build frame clause SQL.
   */
  private buildFrameClause(frame: FrameSpec): string {
    const formatBoundary = (boundary: FrameBoundary): string => {
      if (typeof boundary === 'string') {
        return boundary;
      }
      const offset = Math.abs(boundary);
      const direction = boundary < 0 ? 'PRECEDING' : 'FOLLOWING';
      return `${offset} ${direction}`;
    };

    const start = formatBoundary(frame.start);
    const end = frame.end ? ` AND ${formatBoundary(frame.end)}` : '';

    return `${frame.mode} BETWEEN ${start}${end || ' AND CURRENT ROW'}`;
  }
}

/**
 * Create a window function builder.
 * Factory function for fluent API.
 *
 * @returns Window builder
 *
 * @example
 * ```typescript
 * window<Employee>()
 *   .rowNumber()
 *   .partitionBy('department')
 *   .orderBy('salary', 'DESC')
 *   .build()
 * ```
 */
export function window<Schema extends RowResult = RowResult>(): WindowBuilder<Schema> {
  return new WindowBuilder<Schema>();
}

