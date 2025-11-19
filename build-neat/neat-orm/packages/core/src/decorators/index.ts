/**
 * NeatOrm - Decorators Module
 *
 * This module exports all entity decorators for defining database schemas
 * using the OOP-first approach with TypeScript class decorators.
 *
 * Decorator Categories:
 *
 * 1. **Entity Decorator** (@Entity):
 *    - Marks a class as a database entity/table
 *    - Configures table name, schema, and database
 *
 * 2. **Column Decorators** (@Column):
 *    - Defines column types and constraints
 *    - Supports all SQL column types
 *    - Automatic type inference from TypeScript types
 *
 * 3. **Primary Key Decorators** (@PrimaryKey, @Generated, @PrimaryGeneratedColumn):
 *    - Marks primary key columns
 *    - Configures auto-generation strategies
 *    - Composite decorator for common patterns
 *
 * 4. **Foreign Key Decorator** (@ForeignKey):
 *    - Defines foreign key references
 *    - Uses string-based table names (no circular dependencies!)
 *    - Configures cascade actions
 *
 * All decorators follow Neat framework patterns and integrate seamlessly
 * with the metadata system for compile-time type safety and runtime
 * configuration.
 */

// Entity Decorator
export * from './entity.decorator.js';
export { Entity, isEntity, getTableName, getQualifiedTableName } from './entity.decorator.js';

// Column Decorator
export * from './column.decorator.js';
export { Column, isColumn, getColumnMetadata } from './column.decorator.js';
export type { ColumnType, ColumnOptions } from './column.decorator.js';

// Primary Key Decorators
export * from './primary-key.decorator.js';
export {
  PrimaryKey,
  Generated,
  PrimaryGeneratedColumn,
  isPrimaryKey,
  getPrimaryKey,
  isGenerated,
  getGenerationMetadata,
} from './primary-key.decorator.js';
export type { GenerationStrategy, GeneratedOptions } from './primary-key.decorator.js';

// Foreign Key Decorator
export * from './foreign-key.decorator.js';
export {
  ForeignKey,
  isForeignKey,
  getForeignKeyMetadata,
  getAllForeignKeys,
} from './foreign-key.decorator.js';
export type { CascadeAction, ForeignKeyOptions } from './foreign-key.decorator.js';

// Repository Decorator
export * from './repository.decorator.js';
export {
  Repository,
} from './repository.decorator.js';
export type { RepositoryOptions, RepositoryMetadata } from './repository.decorator.js';

// Lifecycle Hooks Decorators
export * from './hooks.decorator.js';
export {
  BeforeInsert,
  AfterInsert,
  BeforeUpdate,
  AfterUpdate,
  BeforeDelete,
  AfterDelete,
  BeforeLoad,
  AfterLoad,
  registerHook,
  getEntityHooks,
  hasHooks,
} from './hooks.decorator.js';
export type {
  HookType,
  HookFunction,
  HookContext,
  HookMetadata,
  EntityHooks,
} from './hooks.decorator.js';

// Soft Delete Decorators
export * from './soft-delete.decorator.js';
export {
  SoftDelete,
  WithTrashed,
  OnlyTrashed,
  hasSoftDelete,
  getSoftDeleteMetadata,
} from './soft-delete.decorator.js';
export type {
  SoftDeleteOptions,
  SoftDeleteMetadata,
} from './soft-delete.decorator.js';

// Database Index Decorators
export * from './index.decorator.js';
export {
  Index,
  getEntityIndexes,
  hasIndexes,
} from './index.decorator.js';
export type {
  IndexType,
  IndexOptions,
  IndexMetadata,
} from './index.decorator.js';

