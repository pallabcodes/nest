/**
 * NeatOrm - Core Type System
 *
 * This module exports the foundational type system for NeatOrm, providing
 * god-tier TypeScript patterns for compile-time type safety, zero-cost
 * abstractions, and advanced type-level programming.
 *
 * The type system is organized into four main categories:
 *
 * 1. **Branded Types** (branded.ts):
 *    - Nominal typing for preventing value mixing
 *    - Zero runtime overhead
 *    - Type-safe entity IDs, column names, table names
 *
 * 2. **Phantom Types** (phantom.ts):
 *    - Type-level state tracking
 *    - Compile-time state machine validation
 *    - Query builder state, transaction state, migration state
 *
 * 3. **Conditional Types** (conditional.ts):
 *    - Type inference and transformation
 *    - Pattern matching at the type level
 *    - Complex type manipulations for query builders
 *
 * 4. **Template Literal Types** (template-literals.ts):
 *    - String manipulation at compile time
 *    - SQL string validation
 *    - Qualified name handling (table.column)
 *
 * All types compile away completely, resulting in zero runtime overhead
 * while providing maximum compile-time safety.
 */

// Branded Types
export type {
  Brand,
  Unbrand,
  TableName,
  ColumnName,
  RawSQL,
  EntityId,
  ConnectionString,
} from './branded.js';

export {
  brand,
  unbrand,
  isBranded,
  tableName,
  columnName,
  rawSQL,
  entityId,
  connectionString,
} from './branded.js';

// Phantom Types
export type {
  Phantom,
  ExtractPhantom,
  NoSelect,
  Selected,
  NoFrom,
  FromTable,
  JoinedTables,
  HasWhere,
  NoWhere,
  HasOrderBy,
  NoOrderBy,
  HasGroupBy,
  NoGroupBy,
  TransactionActive,
  TransactionCommitted,
  TransactionRolledBack,
  TransactionState,
  MigrationUp,
  MigrationDown,
  Connected,
  Disconnected,
  IsPhantomState,
  RequirePhantomState,
  TransitionPhantomState,
  ChainPhantomState,
} from './phantom.js';

// Conditional Types
export type {
  IsNever,
  IsAny,
  IsUnknown,
  Extends,
  Equals,
  If,
  ArrayElement,
  Awaited,
  OptionalNullable,
  DeepPartial,
  DeepReadonly,
  KeysOfType,
  PickByType,
  OmitByType,
  NotNullable,
  RequireKeys,
  OptionalKeys,
  Merge,
  Flatten,
  DiffKeys,
  CommonKeys,
} from './conditional.js';

// Template Literal Types
export type {
  Split,
  Join,
  ExtractTable,
  ExtractColumn,
  IsQualified,
  Qualify,
  ToCamelCase,
  ToSnakeCase,
  ToPascalCase,
  ExtractAlias,
  HasAlias,
  RemoveAlias,
  Trim,
  StartsWith,
  EndsWith,
  ReplaceAll,
  Pluralize,
  Singularize,
} from './template-literals.js';

/**
 * Re-export everything for convenience
 */
export * from './branded.js';
export * from './phantom.js';
export * from './conditional.js';
export * from './template-literals.js';

