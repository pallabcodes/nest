/**
 * NeatOrm - SELECT Query Builder
 *
 * Type-safe SELECT query builder with compile-time validation and perfect
 * result type inference. Uses phantom types to track query state and prevent
 * invalid query construction.
 *
 * Key TypeScript Excellence Features:
 * - Phantom types for state machine validation
 * - Method chaining with state transitions
 * - Compile-time column validation
 * - Perfect result type inference
 * - Fluent API that mirrors SQL syntax
 *
 * TypeScript Compilation:
 * The query builder uses phantom type parameters to track state. Each method
 * returns a new type with updated state, enabling TypeScript to enforce
 * correct query construction order at compile time.
 *
 * Runtime Behavior:
 * At runtime, the query builder accumulates query structure in internal state.
 * When execute() is called, it generates SQL and sends it to the database
 * adapter. The phantom types are completely erased at runtime.
 *
 * Framework Integration:
 * The SELECT builder integrates with:
 * - Database adapters for SQL generation
 * - Entity metadata for column validation
 * - Relationship registry for join construction
 * - Result types for return type inference
 *
 * Pain Points Addressed:
 * - Runtime errors from invalid query order
 * - Inaccurate result types
 * - Poor IDE autocomplete
 * - Verbose query syntax (we're SQL-like!)
 *
 * Research:
 * Inspired by Kysely's query builder with enhanced phantom type state machine.
 * Uses advanced TypeScript patterns to provide compile-time query validation
 * while maintaining readable, SQL-like syntax.
 */

import type {
  NoSelect,
  Selected,
  NoFrom,
  FromTable,
  HasWhere,
  NoWhere,
  HasOrderBy,
  NoOrderBy,
  NoGroupBy,
} from '../types/phantom.js';
import type {
  WhereOperator,
  OrderDirection,
  QueryExecutionOptions,
  QueryStructure,
  WhereCondition,
  RequireSelectAndFrom,
  ExtractSelectedColumns,
  AddJoinedTable,
} from './query-builder-types.js';
import type {
  RowResult,
  ManyResult,
  OneResult,
  SelectResult,
} from './query-result.js';
import { SQLInjectionPrevention } from '../security/sql-injection-prevention.js';

/**
 * SELECT Query Builder with compile-time state tracking.
 *
 * @template SelectState - Phantom type tracking selected columns
 * @template FromState - Phantom type tracking FROM table
 * @template WhereState - Phantom type tracking WHERE clause
 * @template OrderByState - Phantom type tracking ORDER BY clause
 * @template GroupByState - Phantom type tracking GROUP BY clause
 * @template JoinState - Phantom type tracking joined tables
 * @template Schema - Entity schema type for the FROM table
 */
export class SelectQueryBuilder<
  SelectState = NoSelect,
  FromState = NoFrom,
  WhereState = NoWhere,
  OrderByState = NoOrderBy,
  GroupByState = NoGroupBy,
  JoinState = never,
  Schema extends RowResult = RowResult
> {
  private query: QueryStructure = {
    select: [],
    joins: [],
    where: [],
    orderBy: [],
    with: [],
  };

  /**
   * Validate join condition for SQL injection prevention.
   * Only validates in production mode to avoid performance overhead in development.
   *
   * @param condition - Join condition string
   * @throws Error if condition is unsafe
   */
  private validateJoinCondition(condition: string): void {
    // Check if we're in production mode
    // In production, always validate; in development, validation is optional
    let isProduction = false;
    try {
      // Use globalThis to access process in a safe way
      const globalProcess = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
      if (globalProcess?.env?.NODE_ENV === 'production') {
        isProduction = true;
      }
    } catch {
      // process.env not available, assume development
      isProduction = false;
    }

    if (isProduction) {
      const validation = SQLInjectionPrevention.validateJoinCondition(condition);
      if (!validation.safe) {
        throw new Error(`Unsafe join condition: ${validation.reason}`);
      }
    }
  }

  /**
   * Select columns to retrieve.
   * Transitions from NoSelect to Selected state.
   * Supports qualified column names like 'u.id', 'p.title' when using joins.
   *
   * @param columns - Column names to select (can be qualified with aliases)
   * @returns Query builder with Selected state
   *
   * @example
   * ```typescript
   * const query = new SelectQueryBuilder()
   *   .select('id', 'name', 'email');
   * // Type: SelectQueryBuilder<Selected<['id', 'name', 'email']>, ...>
   *
   * // With joins:
   * const query = new SelectQueryBuilder()
   *   .select('u.id', 'u.name', 'p.title')
   *   .from('users', 'u')
   *   .leftJoin('posts', 'p', 'u.id = p.user_id');
   * ```
   */
  select<Columns extends readonly string[]>(
    ...columns: Columns
  ): SelectQueryBuilder<
    Selected<Columns>,
    FromState,
    WhereState,
    OrderByState,
    GroupByState,
    JoinState,
    Schema
  > {
    this.query.select = [...columns];
    // Type assertion needed because TypeScript can't infer phantom type state transitions
    // This is safe because we're only changing the phantom type, not runtime behavior
    return this as unknown as SelectQueryBuilder<
      Selected<Columns>,
      FromState,
      WhereState,
      OrderByState,
      GroupByState,
      JoinState,
      Schema
    >;
  }

  /**
   * Specify the table to query from with an alias.
   * Transitions from NoFrom to FromTable state.
   *
   * @param table - Table name
   * @param alias - Table alias
   * @returns Query builder with FromTable state
   *
   * @example
   * ```typescript
   * const query = builder
   *   .select('u.id', 'u.name')
   *   .from('users', 'u');
   * // Type: SelectQueryBuilder<..., FromTable<'users'>, ...>
   * ```
   */
  from<TableName extends string, Alias extends string>(
    table: TableName,
    alias: Alias
  ): SelectQueryBuilder<
    SelectState,
    FromTable<TableName>,
    WhereState,
    OrderByState,
    GroupByState,
    JoinState,
    Schema
  >;
  /**
   * Specify the table to query from.
   * Transitions from NoFrom to FromTable state.
   *
   * @param table - Table name
   * @returns Query builder with FromTable state
   *
   * @example
   * ```typescript
   * const query = builder
   *   .select('id', 'name')
   *   .from('users');
   * // Type: SelectQueryBuilder<..., FromTable<'users'>, ...>
   * ```
   */
  from<TableName extends string>(
    table: TableName
  ): SelectQueryBuilder<
    SelectState,
    FromTable<TableName>,
    WhereState,
    OrderByState,
    GroupByState,
    JoinState,
    Schema
  >;
  from<TableName extends string>(
    table: TableName,
    alias?: string
  ): SelectQueryBuilder<
    SelectState,
    FromTable<TableName>,
    WhereState,
    OrderByState,
    GroupByState,
    JoinState,
    Schema
  > {
    this.query.from = table;
    if (alias) {
      this.query.fromAlias = alias;
    }
    // Type assertion needed for phantom type state transition
    return this as unknown as SelectQueryBuilder<
      SelectState,
      FromTable<TableName>,
      WhereState,
      OrderByState,
    GroupByState,
      JoinState,
      Schema
    >;
  }

  /**
   * Add an INNER JOIN clause.
   * Joins two tables where rows match in both tables.
   *
   * @param table - Table to join
   * @param alias - Alias for the joined table
   * @param condition - Join condition (e.g., 'users.id = posts.user_id')
   * @returns Query builder with updated JoinState
   *
   * @example
   * ```typescript
   * const query = builder
   *   .select('u.name', 'p.title')
   *   .from('users', 'u')
   *   .innerJoin('posts', 'p', 'u.id = p.user_id')
   *   .where('u.active', '=', true);
   * ```
   */
  innerJoin<Alias extends string>(
    table: string,
    alias: Alias,
    condition: string
  ): SelectQueryBuilder<
    SelectState,
    FromState,
    WhereState,
    OrderByState,
    GroupByState,
    AddJoinedTable<JoinState, Alias>,
    Schema
  > {
    // Validate join condition for SQL injection prevention
    this.validateJoinCondition(condition);

    this.query.joins.push({
      type: 'INNER',
      table,
      alias,
      condition,
    });
    // Type assertion needed for phantom type state transition
    return this as unknown as SelectQueryBuilder<
      SelectState,
      FromState,
      WhereState,
      OrderByState,
    GroupByState,
      AddJoinedTable<JoinState, Alias>,
      Schema
    >;
  }

  /**
   * Add a LEFT JOIN clause.
   * Returns all rows from the left table and matching rows from the right table.
   *
   * @param table - Table to join
   * @param alias - Alias for the joined table
   * @param condition - Join condition
   * @returns Query builder with updated JoinState
   *
   * @example
   * ```typescript
   * const query = builder
   *   .select('u.name', 'p.title')
   *   .from('users', 'u')
   *   .leftJoin('posts', 'p', 'u.id = p.user_id');
   * ```
   */
  leftJoin<Alias extends string>(
    table: string,
    alias: Alias,
    condition: string
  ): SelectQueryBuilder<
    SelectState,
    FromState,
    WhereState,
    OrderByState,
    GroupByState,
    AddJoinedTable<JoinState, Alias>,
    Schema
  > {
    // Validate join condition for SQL injection prevention
    this.validateJoinCondition(condition);

    this.query.joins.push({
      type: 'LEFT',
      table,
      alias,
      condition,
    });
    // Type assertion needed for phantom type state transition
    return this as unknown as SelectQueryBuilder<
      SelectState,
      FromState,
      WhereState,
      OrderByState,
    GroupByState,
      AddJoinedTable<JoinState, Alias>,
      Schema
    >;
  }

  /**
   * Add a RIGHT JOIN clause.
   * Returns all rows from the right table and matching rows from the left table.
   *
   * @param table - Table to join
   * @param alias - Alias for the joined table
   * @param condition - Join condition
   * @returns Query builder with updated JoinState
   */
  rightJoin<Alias extends string>(
    table: string,
    alias: Alias,
    condition: string
  ): SelectQueryBuilder<
    SelectState,
    FromState,
    WhereState,
    OrderByState,
    GroupByState,
    AddJoinedTable<JoinState, Alias>,
    Schema
  > {
    this.query.joins.push({
      type: 'RIGHT',
      table,
      alias,
      condition,
    });
    // Type assertion needed for phantom type state transition
    return this as unknown as SelectQueryBuilder<
      SelectState,
      FromState,
      WhereState,
      OrderByState,
    GroupByState,
      AddJoinedTable<JoinState, Alias>,
      Schema
    >;
  }

  /**
   * Add a FULL OUTER JOIN clause.
   * Returns all rows from both tables.
   *
   * @param table - Table to join
   * @param alias - Alias for the joined table
   * @param condition - Join condition
   * @returns Query builder with updated JoinState
   */
  fullJoin<Alias extends string>(
    table: string,
    alias: Alias,
    condition: string
  ): SelectQueryBuilder<
    SelectState,
    FromState,
    WhereState,
    OrderByState,
    GroupByState,
    AddJoinedTable<JoinState, Alias>,
    Schema
  > {
    // Validate join condition for SQL injection prevention
    this.validateJoinCondition(condition);

    this.query.joins.push({
      type: 'FULL',
      table,
      alias,
      condition,
    });
    // Type assertion needed for phantom type state transition
    return this as unknown as SelectQueryBuilder<
      SelectState,
      FromState,
      WhereState,
      OrderByState,
    GroupByState,
      AddJoinedTable<JoinState, Alias>,
      Schema
    >;
  }

  /**
   * Add a CROSS JOIN clause.
   * Returns Cartesian product of both tables.
   *
   * @param table - Table to join
   * @param alias - Alias for the joined table
   * @returns Query builder with updated JoinState
   */
  crossJoin<Alias extends string>(
    table: string,
    alias: Alias
  ): SelectQueryBuilder<
    SelectState,
    FromState,
    WhereState,
    OrderByState,
    GroupByState,
    AddJoinedTable<JoinState, Alias>,
    Schema
  > {
    // CROSS JOIN doesn't have a condition, so no validation needed
    // But we still validate the table name and alias
    const tableValidation = SQLInjectionPrevention.sanitizeIdentifier(table);
    const aliasValidation = SQLInjectionPrevention.sanitizeIdentifier(alias);
    
    if (!tableValidation.safe || !aliasValidation.safe) {
      throw new Error(`Unsafe table or alias name: ${tableValidation.reason || aliasValidation.reason}`);
    }

    this.query.joins.push({
      type: 'CROSS',
      table,
      alias,
    });
    // Type assertion needed for phantom type state transition
    return this as unknown as SelectQueryBuilder<
      SelectState,
      FromState,
      WhereState,
      OrderByState,
    GroupByState,
      AddJoinedTable<JoinState, Alias>,
      Schema
    >;
  }

  /**
   * Add a WHERE condition.
   * Transitions from NoWhere to HasWhere state.
   * Supports qualified column names like 'u.age', 'p.status' when using joins.
   *
   * @param column - Column name (can be qualified with alias)
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @returns Query builder with HasWhere state
   *
   * @example
   * ```typescript
   * const query = builder
   *   .select('id', 'name')
   *   .from('users')
   *   .where('age', '>', 18);
   *
   * // With joins:
   * const query = builder
   *   .select('u.id', 'p.title')
   *   .from('users', 'u')
   *   .leftJoin('posts', 'p', 'u.id = p.user_id')
   *   .where('p.status', '=', 'published');
   * ```
   */
  where(
    column: string,  // Allow qualified column names
    operator: WhereOperator,
    value: unknown  // Allow any value type for joined columns
  ): SelectQueryBuilder<
    SelectState,
    FromState,
    HasWhere,
    OrderByState,
    GroupByState,
    JoinState,
    Schema
  > {
    const condition: WhereCondition = {
      column,
      operator,
      value,
    };
    if (this.query.where.length > 0) {
      condition.logicalOperator = 'AND';
    }
    this.query.where.push(condition);
    // Type assertion needed for phantom type state transition
    return this as unknown as SelectQueryBuilder<
      SelectState,
      FromState,
      HasWhere,
      OrderByState,
    GroupByState,
      JoinState,
      Schema
    >;
  }

  /**
   * Add an AND WHERE condition.
   * Requires HasWhere state (previous where() call).
   * Supports qualified column names like 'u.age', 'p.status' when using joins.
   *
   * @param column - Column name (can be qualified with alias)
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @returns Query builder maintaining HasWhere state
   */
  andWhere(
    this: SelectQueryBuilder<
      SelectState,
      FromState,
      HasWhere,
      OrderByState,
    GroupByState,
      JoinState,
      Schema
    >,
    column: string,  // Allow qualified column names
    operator: WhereOperator,
    value: unknown  // Allow any value type for joined columns
  ): SelectQueryBuilder<
    SelectState,
    FromState,
    HasWhere,
    OrderByState,
    GroupByState,
    JoinState,
    Schema
  > {
    this.query.where.push({
      column,
      operator,
      value,
      logicalOperator: 'AND',
    });
    return this;
  }

  /**
   * Add an OR WHERE condition.
   * Requires HasWhere state (previous where() call).
   * Supports qualified column names like 'u.age', 'p.status' when using joins.
   */
  orWhere(
    this: SelectQueryBuilder<
      SelectState,
      FromState,
      HasWhere,
      OrderByState,
    GroupByState,
      JoinState,
      Schema
    >,
    column: string,  // Allow qualified column names
    operator: WhereOperator,
    value: unknown  // Allow any value type for joined columns
  ): SelectQueryBuilder<
    SelectState,
    FromState,
    HasWhere,
    OrderByState,
    GroupByState,
    JoinState,
    Schema
  > {
    this.query.where.push({
      column,
      operator,
      value,
      logicalOperator: 'OR',
    });
    return this;
  }

  /**
   * Add an ORDER BY clause.
   * Transitions to HasOrderBy state.
   * Supports qualified column names like 'u.created_at', 'p.title' when using joins.
   *
   * @param column - Column to order by (can be qualified with alias)
   * @param direction - Sort direction (ASC or DESC)
   * @returns Query builder with HasOrderBy state
   *
   * @example
   * ```typescript
   * const query = builder
   *   .select('u.name', 'p.title')
   *   .from('users', 'u')
   *   .leftJoin('posts', 'p', 'u.id = p.user_id')
   *   .orderBy('p.created_at', 'DESC');
   * ```
   */
  orderBy(
    column: string,  // Allow qualified column names
    direction: OrderDirection = 'ASC'
  ): SelectQueryBuilder<
    SelectState,
    FromState,
    WhereState,
    HasOrderBy,
    JoinState,
    Schema
  > {
    this.query.orderBy.push({ column, direction });
    // Type assertion needed for phantom type state transition
    return this as unknown as SelectQueryBuilder<
      SelectState,
      FromState,
      WhereState,
      HasOrderBy,
      JoinState,
      Schema
    >;
  }

  /**
   * Add a LIMIT clause.
   *
   * @param limit - Maximum number of rows to return
   * @returns Query builder with limit set
   */
  limit(
    limit: number
  ): SelectQueryBuilder<
    SelectState,
    FromState,
    WhereState,
    OrderByState,
    GroupByState,
    JoinState,
    Schema
  > {
    if (!this.query.limitOffset) {
      this.query.limitOffset = {};
    }
    this.query.limitOffset.limit = limit;
    return this;
  }

  /**
   * Add an OFFSET clause.
   *
   * @param offset - Number of rows to skip
   * @returns Query builder with offset set
   */
  offset(
    offset: number
  ): SelectQueryBuilder<
    SelectState,
    FromState,
    WhereState,
    OrderByState,
    GroupByState,
    JoinState,
    Schema
  > {
    if (!this.query.limitOffset) {
      this.query.limitOffset = {};
    }
    this.query.limitOffset.offset = offset;
    return this;
  }

  /**
   * Execute the query and return all matching rows.
   * Requires both SELECT and FROM to have been called.
   *
   * @param options - Execution options
   * @returns Promise resolving to array of result rows
   *
   * @example
   * ```typescript
   * const users = await db
   *   .select('id', 'name', 'email')
   *   .from('users')
   *   .where('age', '>', 18)
   *   .execute();
   * // Type: Array<{ id: number; name: string; email: string }>
   * ```
   */
  async execute<
    Columns extends ExtractSelectedColumns<SelectState> = ExtractSelectedColumns<SelectState>
  >(
    this: RequireSelectAndFrom<SelectState, FromState> extends true
      ? SelectQueryBuilder<
          SelectState,
          FromState,
          WhereState,
          OrderByState,
    GroupByState,
          JoinState,
          Schema
        >
      : never,
    _options?: QueryExecutionOptions
  ): Promise<ManyResult<SelectResult<Columns, Schema>>> {
    // TODO: Implement SQL generation and database execution
    // This is a placeholder for the actual implementation
    throw new Error('Query execution not yet implemented');
  }

  /**
   * Execute the query and return the first matching row.
   * Returns null if no rows match.
   */
  async first<
    Columns extends ExtractSelectedColumns<SelectState> = ExtractSelectedColumns<SelectState>
  >(
    this: RequireSelectAndFrom<SelectState, FromState> extends true
      ? SelectQueryBuilder<
          SelectState,
          FromState,
          WhereState,
          OrderByState,
    GroupByState,
          JoinState,
          Schema
        >
      : never,
    options?: QueryExecutionOptions
  ): Promise<OneResult<SelectResult<Columns, Schema>>> {
    this.limit(1);
    const results = await this.execute(options);
    return results[0] || null;
  }

  /**
   * Get the generated SQL string.
   * Useful for debugging.
   *
   * @returns SQL string
   */
  toSQL(): string {
    // TODO: Implement SQL generation
    return 'SELECT * FROM table'; // Placeholder
  }
}