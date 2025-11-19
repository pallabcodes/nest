/**
 * NeatOrm - Query Builder Type System
 *
 * Advanced type system for the query builder that tracks query state at
 * compile time using phantom types. This enables compile-time validation
 * of query construction (e.g., preventing execute() before from()).
 *
 * Key TypeScript Excellence Features:
 * - Phantom types for state machine tracking
 * - Method chaining with state transitions
 * - Compile-time query validation
 * - Perfect result type inference
 *
 * TypeScript Compilation:
 * Query builder types use phantom type parameters to track which operations
 * have been performed. TypeScript enforces the correct order of operations
 * at compile time, catching errors before runtime.
 *
 * Runtime Behavior:
 * These types exist only at compile time. At runtime, the query builder is
 * a regular JavaScript object with methods that build SQL strings.
 *
 * Framework Integration:
 * Query builder types integrate with:
 * - Result types for return type inference
 * - Entity metadata for schema validation
 * - Relationship registry for join validation
 * - Database adapters for SQL generation
 *
 * Pain Points Addressed:
 * - Runtime errors from invalid query construction
 * - Calling methods in wrong order (e.g., execute before from)
 * - Inaccurate result type inference
 * - Poor IDE autocomplete
 *
 * Research:
 * Inspired by Kysely's compile-time query validation and uses phantom types
 * to implement a state machine pattern at the type level. This is similar to
 * session types in academic research but practical for TypeScript ORMs.
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
  HasGroupBy,
  NoGroupBy,
  JoinedTables,
} from '../types/phantom.js';

/**
 * Query builder state interface.
 * Tracks which operations have been performed using phantom types.
 *
 * @template SelectState - Selected columns state
 * @template FromState - FROM table state
 * @template WhereState - WHERE clause state
 * @template OrderByState - ORDER BY clause state
 * @template GroupByState - GROUP BY clause state
 * @template JoinState - Joined tables state
 */
export interface QueryBuilderState<
  SelectState = NoSelect,
  FromState = NoFrom,
  WhereState = NoWhere,
  OrderByState = NoOrderBy,
  GroupByState = NoGroupBy,
  JoinState = never,
  Schema extends RowResult = RowResult
> {
  readonly __selectState?: SelectState;
  readonly __fromState?: FromState;
  readonly __whereState?: WhereState;
  readonly __orderByState?: OrderByState;
  readonly __groupByState?: GroupByState;
  readonly __joinState?: JoinState;
}

/**
 * WHERE clause operators.
 * Type-safe SQL comparison operators.
 */
export type WhereOperator =
  | '='
  | '!='
  | '<>'
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'NOT LIKE'
  | 'ILIKE'
  | 'NOT ILIKE'
  | 'IN'
  | 'NOT IN'
  | 'IS'
  | 'IS NOT'
  | 'BETWEEN'
  | 'NOT BETWEEN';

/**
 * ORDER BY direction.
 */
export type OrderDirection = 'ASC' | 'DESC';

/**
 * JOIN types.
 */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';

/**
 * Aggregate functions.
 */
export type AggregateFunction =
  | 'COUNT'
  | 'SUM'
  | 'AVG'
  | 'MIN'
  | 'MAX'
  | 'COUNT DISTINCT';

/**
 * Query options for execution.
 */
export interface QueryExecutionOptions {
  /**
   * Whether to log the generated SQL.
   */
  debug?: boolean;

  /**
   * Query timeout in milliseconds.
   */
  timeout?: number;

  /**
   * Whether to use a read replica (if available).
   */
  useReplica?: boolean;

  /**
   * Custom connection to use for this query.
   */
  connection?: any;
}

/**
 * Pagination options.
 */
export interface PaginationOptions {
  /**
   * Page number (1-indexed).
   */
  page: number;

  /**
   * Number of rows per page.
   */
  pageSize: number;
}

/**
 * WHERE clause condition.
 * Represents a single condition in the WHERE clause.
 */
export interface WhereCondition {
  column: string;
  operator: WhereOperator;
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

/**
 * ORDER BY clause.
 */
export interface OrderByClause {
  column: string;
  direction: OrderDirection;
}

/**
 * JOIN clause with alias support.
 */
export interface JoinClause {
  type: JoinType;
  table: string;
  alias: string;
  condition?: string; // Raw SQL condition for complex joins
}

/**
 * GROUP BY clause.
 */
export interface GroupByClause {
  columns: readonly string[];
  having?: WhereCondition[];
}

/**
 * LIMIT and OFFSET clause.
 */
export interface LimitOffsetClause {
  limit?: number;
  offset?: number;
}

/**
 * WITH (CTE) clause.
 */
export interface WithClause {
  name: string;
  query: string | QueryBuilderState;
  columns?: readonly string[];
  recursive?: boolean;
}

/**
 * Complete query structure.
 * Represents the internal state of a built query.
 */
export interface QueryStructure {
  select: string[];
  from?: string;
  fromAlias?: string; // Alias for the FROM table
  joins: JoinClause[];
  where: WhereCondition[];
  groupBy?: GroupByClause;
  orderBy: OrderByClause[];
  limitOffset?: LimitOffsetClause;
  with: WithClause[];
  distinct?: boolean;
  forUpdate?: boolean;
  forShare?: boolean;
}

/**
 * Type guard to check if SelectState is Selected (not NoSelect).
 */
export type IsSelected<S> = S extends Selected<any> ? true : false;

/**
 * Type guard to check if FromState is FromTable (not NoFrom).
 */
export type IsFromTable<F> = F extends FromTable<any> ? true : false;

/**
 * Require both SELECT and FROM to be called.
 * Used to constrain execute() method.
 */
export type RequireSelectAndFrom<
  SelectState,
  FromState
> = IsSelected<SelectState> extends true
  ? IsFromTable<FromState> extends true
    ? true
    : false
  : false;

/**
 * Extract selected columns from SelectState.
 */
export type ExtractSelectedColumns<S> = S extends Selected<infer Cols>
  ? Cols
  : readonly [];

/**
 * Extract table name from FromState.
 */
export type ExtractTableName<F> = F extends FromTable<infer Table>
  ? Table
  : never;

/**
 * Extract joined tables from JoinState.
 */
export type ExtractJoinedTables<J> = J extends JoinedTables<infer Tables>
  ? Tables
  : readonly [];

/**
 * Helper type to add a table to JoinState.
 */
export type AddJoinedTable<
  CurrentJoinState,
  NewTable extends string
> = CurrentJoinState extends never
  ? JoinedTables<readonly [NewTable]>
  : CurrentJoinState extends JoinedTables<infer CurrentTables>
  ? JoinedTables<readonly [...CurrentTables, NewTable]>
  : JoinedTables<readonly [NewTable]>;

/**
 * Extract available table aliases from JoinState and FromState.
 * Returns union of all aliases (joined tables + from table alias if present).
 */
export type ExtractTableAliases<
  FromState,
  JoinState
> = FromState extends FromTable<string>
  ? JoinState extends JoinedTables<infer Aliases>
    ? Aliases[number] | (string extends FromState['table'] ? never : never) // If from table has alias, include it
    : never
  : JoinState extends JoinedTables<infer Aliases>
  ? Aliases[number]
  : never;

/**
 * Qualified column name type: 'alias.column' or just 'column'.
 * Validates that the alias exists in available aliases.
 */
export type QualifiedColumn<
  Aliases extends string,
  Schema extends RowResult
> = Aliases extends string
  ? `${Aliases}.${keyof Schema & string}` | (keyof Schema & string)
  : keyof Schema & string;

