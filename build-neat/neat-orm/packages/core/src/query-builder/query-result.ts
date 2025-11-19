/**
 * NeatOrm - Query Result Types
 *
 * Type definitions for query results with compile-time inference based on
 * selected columns, joins, and relationships. These types power the query
 * builder's return type system for perfect IDE autocomplete.
 *
 * Key TypeScript Excellence Features:
 * - Mapped types for result inference from selected columns
 * - Conditional types for nullable columns
 * - Template literal types for qualified names
 * - Union types for multiple table results
 *
 * TypeScript Compilation:
 * Result types are computed at compile time based on the query structure.
 * The type system ensures that result types match the actual query shape,
 * eliminating runtime type errors and enabling perfect IDE support.
 *
 * Runtime Behavior:
 * These are purely compile-time types. At runtime, query results are plain
 * JavaScript objects/arrays with no type information attached.
 *
 * Framework Integration:
 * Result types integrate with:
 * - Query builder for return type inference
 * - SELECT clause for column selection
 * - JOIN operations for merged results
 * - Relationship loading for nested results
 *
 * Pain Points Addressed:
 * - Inaccurate result type inference in other ORMs
 * - Having to manually type query results
 * - Loss of type safety through transformations
 * - Poor IDE autocomplete for query results
 *
 * Research:
 * Inspired by Kysely's result type inference and Prisma's generated types.
 * Uses TypeScript's mapped types and conditional types for maximum accuracy
 * while maintaining practical usability.
 */

import type { ExtractColumn, ExtractAlias } from '../types/index.js';

/**
 * Base result type for a single row.
 * Maps column names to their TypeScript types.
 */
export type RowResult<T = unknown> = Record<string, T>;

/**
 * Result type for multiple rows.
 */
export type ManyResult<T extends RowResult> = readonly T[];

/**
 * Result type for a single row or null.
 */
export type OneResult<T extends RowResult> = T | null;

/**
 * Result type for a count query.
 */
export type CountResult = { count: number };

/**
 * Result type for existence check.
 */
export type ExistsResult = boolean;

/**
 * Extract result type from selected columns and entity schema.
 *
 * @template Columns - Array of selected column names (may include aliases)
 * @template Schema - Entity schema type
 * @returns Object type with selected columns
 *
 * @example
 * ```typescript
 * type UserSchema = {
 *   id: number;
 *   name: string;
 *   email: string;
 *   age: number | null;
 * };
 *
 * type Result = SelectResult<['id', 'name', 'email'], UserSchema>;
 * // Result: { id: number; name: string; email: string }
 *
 * type AliasResult = SelectResult<['id', 'name AS fullName'], UserSchema>;
 * // Result: { id: number; fullName: string }
 * ```
 */
export type SelectResult<
  Columns extends readonly string[],
  Schema extends RowResult
> = {
  [K in Columns[number] as ExtractAlias<K>]: ExtractColumn<K> extends keyof Schema
    ? Schema[ExtractColumn<K>]
    : unknown;
};

/**
 * Result type with relationships loaded.
 *
 * @template Base - Base result type
 * @template Relations - Map of relation names to their result types
 * @returns Base type merged with relation properties
 *
 * @example
 * ```typescript
 * type UserResult = { id: number; name: string };
 * type PostResult = { id: number; title: string };
 * type Relations = { posts: PostResult[] };
 *
 * type WithRelations = ResultWithRelations<UserResult, Relations>;
 * // { id: number; name: string; posts: PostResult[] }
 * ```
 */
export type ResultWithRelations<
  Base extends RowResult,
  Relations extends Record<string, unknown>  // Relations can be entities, arrays, or null
> = Base & Relations;

/**
 * Paginated result type.
 *
 * @template T - Row result type
 */
export interface PaginatedResult<T extends RowResult> {
  data: readonly T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Aggregate result type.
 * Used for queries with GROUP BY and aggregate functions.
 *
 * @template Columns - Selected columns
 * @template Schema - Entity schema
 */
export type AggregateResult<
  Columns extends readonly string[],
  Schema extends RowResult
> = SelectResult<Columns, Schema>;

/**
 * Joined result type.
 * Combines columns from multiple tables with qualified names.
 *
 * @template LeftSchema - Left table schema
 * @template RightSchema - Right table schema
 * @template LeftPrefix - Left table prefix (e.g., 'users')
 * @template RightPrefix - Right table prefix (e.g., 'posts')
 *
 * @example
 * ```typescript
 * type UserSchema = { id: number; name: string };
 * type PostSchema = { id: number; title: string; userId: number };
 *
 * type Joined = JoinedResult<UserSchema, PostSchema, 'users', 'posts'>;
 * // {
 * //   'users.id': number;
 * //   'users.name': string;
 * //   'posts.id': number;
 * //   'posts.title': string;
 * //   'posts.userId': number;
 * // }
 * ```
 */
export type JoinedResult<
  LeftSchema extends RowResult,
  RightSchema extends RowResult,
  LeftPrefix extends string,
  RightPrefix extends string
> = {
  [K in keyof LeftSchema as `${LeftPrefix}.${string & K}`]: LeftSchema[K];
} & {
  [K in keyof RightSchema as `${RightPrefix}.${string & K}`]: RightSchema[K];
};

/**
 * Raw query result type.
 * For queries where the result shape is not known at compile time.
 */
export type RawResult = readonly RowResult<unknown>[];

/**
 * Query execution result.
 * Wraps the result with metadata about execution.
 *
 * @template T - Result type
 */
export interface QueryExecutionResult<T> {
  data: T;
  rowCount: number;
  executionTime: number;
  sql?: string;
}

/**
 * Insert result type.
 * Returns inserted rows with generated values.
 *
 * @template Schema - Entity schema
 * @template Returning - Columns to return
 */
export type InsertResult<
  Schema extends RowResult,
  Returning extends readonly (keyof Schema & string)[]
> = Returning extends readonly []
  ? { affectedRows: number }
  : SelectResult<Returning, Schema>;

/**
 * Update result type.
 * Returns updated rows if RETURNING is used.
 *
 * @template Schema - Entity schema
 * @template Returning - Columns to return
 */
export type UpdateResult<
  Schema extends RowResult,
  Returning extends readonly (keyof Schema & string)[]
> = Returning extends readonly []
  ? { affectedRows: number }
  : readonly SelectResult<Returning, Schema>[];

/**
 * Delete result type.
 * Returns deleted rows if RETURNING is used.
 *
 * @template Schema - Entity schema
 * @template Returning - Columns to return
 */
export type DeleteResult<
  Schema extends RowResult,
  Returning extends readonly (keyof Schema & string)[]
> = Returning extends readonly []
  ? { affectedRows: number }
  : readonly SelectResult<Returning, Schema>[];

