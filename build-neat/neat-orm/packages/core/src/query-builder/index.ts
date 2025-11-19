/**
 * NeatOrm - Query Builder Module
 *
 * Type-safe query builder with compile-time validation and SQL-like syntax.
 * This module provides the SELECT query builder with phantom type state
 * tracking and perfect result type inference.
 *
 * Exported Components:
 * - SelectQueryBuilder: Main query builder class
 * - Query result types: Type definitions for query results
 * - Query builder types: State tracking and configuration types
 * - SQL Generator: SQL string generation utility
 *
 * The query builder uses advanced TypeScript patterns to provide:
 * - 100% compile-time type safety
 * - SQL-like readable syntax
 * - Perfect IDE autocomplete
 * - Compile-time query validation
 * - Zero runtime overhead from types
 */

// Export query builders
export * from './select-builder.js';
export { SelectQueryBuilder } from './select-builder.js';

export * from './insert-builder.js';
export { InsertQueryBuilder } from './insert-builder.js';

export * from './update-builder.js';
export { UpdateQueryBuilder } from './update-builder.js';

export * from './delete-builder.js';
export { DeleteQueryBuilder } from './delete-builder.js';

// Export result types
export * from './query-result.js';
export type {
  RowResult,
  ManyResult,
  OneResult,
  CountResult,
  ExistsResult,
  SelectResult,
  ResultWithRelations,
  PaginatedResult,
  AggregateResult,
  JoinedResult,
  RawResult,
  QueryExecutionResult,
  InsertResult,
  UpdateResult,
  DeleteResult,
} from './query-result.js';

// Export query builder types
export * from './query-builder-types.js';
export type {
  QueryBuilderState,
  WhereOperator,
  OrderDirection,
  JoinType,
  AggregateFunction,
  QueryExecutionOptions,
  PaginationOptions,
  WhereCondition,
  OrderByClause,
  JoinClause,
  GroupByClause,
  LimitOffsetClause,
  WithClause,
  QueryStructure,
} from './query-builder-types.js';

// Export SQL generator
export * from './sql-generator.js';
export { SQLGenerator, type SQLDialect, type GeneratedSQL } from './sql-generator.js';

// ========================================
// HELPER TYPES AND FACTORY FUNCTIONS
// ========================================

import { SelectQueryBuilder } from './select-builder.js';
import { InsertQueryBuilder } from './insert-builder.js';
import { UpdateQueryBuilder } from './update-builder.js';
import { DeleteQueryBuilder } from './delete-builder.js';
import type { RowResult } from './query-result.js';
import type {
  NoSelect,
  NoFrom,
  NoWhere,
  NoOrderBy,
  Selected,
  FromTable,
  HasWhere,
  HasOrderBy,
} from '../types/phantom.js';

/**
 * Clean type alias for a new SELECT query builder.
 * Much cleaner than specifying all phantom types manually.
 *
 * @template Schema - The entity schema type
 *
 * @example
 * ```typescript
 * // Instead of: SelectQueryBuilder<NoSelect, NoFrom, NoWhere, NoOrderBy, never, UserSchema>
 * const query: SelectQuery<UserSchema> = new SelectQueryBuilder();
 * ```
 */
export type SelectQuery<Schema extends RowResult = RowResult> =
  SelectQueryBuilder<NoSelect, NoFrom, NoWhere, NoOrderBy, NoGroupBy, never, Schema>;

/**
 * Type alias for SelectQueryBuilder with any phantom types but a specific Schema.
 * Useful for CTEs, views, and other contexts where the query builder state doesn't matter.
 *
 * @template Schema - The entity schema type
 *
 * @example
 * ```typescript
 * // CTE can accept any SelectQueryBuilder with UserSchema
 * const cte: CTEDefinition<'activeUsers', UserSchema> = {
 *   name: 'activeUsers',
 *   query: someQueryBuilder, // Any SelectQueryBuilder<..., UserSchema>
 * };
 * ```
 */
export type SelectQueryWithSchema<Schema extends RowResult = RowResult> =
  SelectQueryBuilder<
    NoSelect | Selected<readonly string[]>,
    NoFrom | FromTable<string>,
    NoWhere | HasWhere,
    NoOrderBy | HasOrderBy,
    NoGroupBy | HasGroupBy,
    never,
    Schema
  >;

/**
 * Factory function for creating a new SELECT query builder.
 * Provides clean, type-safe API without verbose generic parameters.
 *
 * @template Schema - The entity schema type
 * @returns A new SELECT query builder instance
 *
 * @example
 * ```typescript
 * // Clean API - no verbose generics!
 * const users = await select<UserSchema>()
 *   .select('id', 'name', 'email')
 *   .from('users')
 *   .where('age', '>', 18)
 *   .execute();
 * ```
 */
export function createSelect<Schema extends RowResult = RowResult>(): SelectQuery<Schema> {
  return new SelectQueryBuilder<NoSelect, NoFrom, NoWhere, NoOrderBy, never, Schema>();
}

// Alias for backward compatibility - select() is more intuitive for users
export const select = createSelect;

/**
 * Alternative factory function that creates a query builder.
 * Less repetitive than select().select() pattern.
 *
 * @template Schema - The entity schema type
 * @returns A new SELECT query builder instance
 *
 * @example
 * ```typescript
 * // Alternative to avoid select().select() repetition
 * const users = await query<UserSchema>()
 *   .select('id', 'name', 'email')
 *   .from('users')
 *   .execute();
 * ```
 */
export function query<Schema extends RowResult = RowResult>(): SelectQuery<Schema> {
  return createSelect<Schema>();
}

/**
 * Type alias for INSERT query builder (clean API).
 */
export type InsertQuery<Schema extends RowResult = RowResult, Returning extends readonly (keyof Schema & string)[] = readonly []> =
  InsertQueryBuilder<Schema, Returning>;

/**
 * Factory function for INSERT queries.
 */
export function insert<Schema extends RowResult = RowResult>(): InsertQueryBuilder<Schema> {
  return new InsertQueryBuilder<Schema>();
}

/**
 * Type alias for UPDATE query builder (clean API).
 */
export type UpdateQuery<Schema extends RowResult = RowResult, HasWhere extends boolean = false, Returning extends readonly (keyof Schema & string)[] = readonly []> =
  UpdateQueryBuilder<Schema, HasWhere, Returning>;

/**
 * Factory function for UPDATE queries.
 */
export function update<Schema extends RowResult = RowResult>(): UpdateQueryBuilder<Schema> {
  return new UpdateQueryBuilder<Schema>();
}

/**
 * Type alias for DELETE query builder (clean API).
 */
export type DeleteQuery<Schema extends RowResult = RowResult, HasWhere extends boolean = false, Returning extends readonly (keyof Schema & string)[] = readonly []> =
  DeleteQueryBuilder<Schema, HasWhere, Returning>;

/**
 * Factory function for DELETE queries.
 */
export function delete_(): DeleteQueryBuilder {
  return new DeleteQueryBuilder();
}

