/**
 * NeatOrm - Core Package Entry Point
 *
 * Enterprise TypeScript ORM with compile-time type safety, zero circular
 * dependencies, and SQL-like readability.
 *
 * This package provides:
 * - God-tier TypeScript type system (branded, phantom, conditional, template literal types)
 * - OOP-first entity decorators (@Entity, @Column, @PrimaryKey, etc.)
 * - Metadata system for decorator configuration
 * - Type-safe query builder (coming soon)
 * - Relationship registry (zero circular dependencies)
 * - Transaction management
 * - Migration system
 * - Multi-database adapters (PostgreSQL, MySQL, SQLite)
 *
 * @packageDocumentation
 */

// Core Type System
export * from './types/index.js';

// Metadata System
export * from './metadata/index.js';

// Entity Decorators
export * from './decorators/index.js';

// Relationship System
export * from './relations/index.js';

// Query Builder
export * from './query-builder/index.js';

// Loading System (N+1 Prevention)
export * from './loading/index.js';

// Transaction Management
export * from './transaction/index.js';

// Advanced SQL Features (CTEs, Window Functions, Views)
export * from './advanced/index.js';

// Migration System
export * from './migrations/index.js';

// Security Module
export * from './security/index.js';

// Database Adapters
export * from './adapters/index.js';

// Query Execution Engine
export * from './execution/index.js';

// Connection Pooling
export * from './pool/index.js';

// Query Result Caching
export * from './cache/index.js';

// Repository Pattern
export * from './repository/index.js';

// Unit of Work Pattern
export * from './unit-of-work/index.js';

// Schema Generation and Management
export * from './schema/index.js';

// Database Seeding
export * from './seeding/index.js';

// Query Logging and Monitoring
export * from './logging/index.js';

// Multi-Database and Read Replicas
export * from './multi-database/index.js';

// Plugin System
export * from './plugins/index.js';

// Telescope Monitoring & Debugging
export * from './telescope/index.js';

// Re-export commonly used types and functions for convenience
export type {
  // Types
  Brand,
  EntityId,
  TableName,
  ColumnName,
  RawSQL,
  Phantom,
} from './types/index.js';

export type {
  // Metadata
  EntityMetadata,
  ColumnMetadata,
  ForeignKeyMetadata,
  GeneratedMetadata,
  IndexMetadata,
  RelationMetadata,
} from './metadata/index.js';

export type {
  // Decorator Options
  EntityOptions,
  ColumnOptions,
  ColumnType,
  GenerationStrategy,
  ForeignKeyOptions,
  CascadeAction,
} from './decorators/index.js';

export {
  // Decorators
  Entity,
  Column,
  PrimaryKey,
  Generated,
  PrimaryGeneratedColumn,
  ForeignKey,
} from './decorators/index.js';

export {
  // Metadata Scanner
  metadataScanner,
  MetadataScanner,
} from './metadata/index.js';

export {
  // Relationships
  ReferencedBy,
  References,
  HasOne,
  ManyToMany,
  defineRelationships,
  relationRegistry,
  referencedBy,
  references,
} from './relations/index.js';

export {
  // Query Builder
  SelectQueryBuilder,
  InsertQueryBuilder,
  UpdateQueryBuilder,
  DeleteQueryBuilder,
  SQLGenerator,
  // Clean API helpers
  select,
  query,
  insert,
  update,
  delete_,
  type SelectQuery,
  type InsertQuery,
  type UpdateQuery,
  type DeleteQuery,
} from './query-builder/index.js';

export {
  // Loading System
  DataLoader,
  RelationLoader,
  RelationLoaderContext,
} from './loading/index.js';

export {
  // Transaction Management
  TransactionManager,
} from './transaction/index.js';

export {
  // Advanced SQL Features
  CTEBuilder,
  cte,
  WindowBuilder,
  window,
  ViewBuilder,
  view,
  materializedView,
} from './advanced/index.js';

export {
  // Migration System
  MigrationRunner,
  TableBuilder,
  migration,
} from './migrations/index.js';

export {
  // Database Adapters
  PostgresAdapter,
  MySQLAdapter,
  SQLiteAdapter,
  BaseAdapter,
  createAdapter,
  createAdapterFromConnectionString,
  parseConnectionString,
  validateConnectionConfig,
  getDefaultPort,
  type DatabaseAdapter,
  type ConnectionConfig,
  type QueryResult,
  type Transaction,
  type TransactionOptions,
  type DatabaseConnection,
  type DatabaseRow,
  type FieldInfo,
  type IsolationLevel,
} from './adapters/index.js';

export {
  // Query Execution Engine
  QueryExecutor,
  ResultMapper,
  StreamExecutor,
  type QueryExecutionOptions,
  type ExecutionResult,
  type MappingOptions,
  type StreamOptions,
} from './execution/index.js';

export {
  // Connection Pooling
  PostgresConnectionPool,
  MySQLConnectionPool,
  SQLiteConnectionPool,
  PoolManager,
  type ConnectionPool,
  type PoolConfig,
  type PoolStats,
  type PoolHealth,
  type PoolManagerConfig,
  type AggregatedPoolMetrics,
} from './pool/index.js';

export {
  // Query Result Caching
  MemoryCache,
  RedisCache,
  CacheManager,
  type Cache,
  type SyncCache,
  type CacheOptions,
  type CacheStats,
  type CacheLayer,
  type CacheManagerOptions,
  type QueryCacheEntry,
  type CacheWarmingStrategy,
  type InvalidationStrategy,
  type InvalidationRule,
  createCacheKey,
  createInvalidationRule,
} from './cache/index.js';

export {
  // Repository Pattern
  BaseRepository,
  QueryMethods,
  EntityManager,
  Repository,
  type FindOptions,
  type WhereExpression,
  type WhereCondition,
  type OrderByExpression,
  type RepositoryOptions,
  type RepositoryMetadata,
} from './repository/index.js';

export {
  // Unit of Work Pattern
  UnitOfWork,
  IdentityMap,
  ChangeTracker,
  EntityState,
  OptimisticLockManager,
  OptimisticLockError,
  type UnitOfWorkOptions,
  type EntityChange,
  type VersionMetadata,
} from './unit-of-work/index.js';

/**
 * Version information
 */
export const VERSION = '0.1.0';

/**
 * Framework information
 */
export const FRAMEWORK_INFO = {
  name: 'NeatOrm',
  version: VERSION,
  description: 'Enterprise TypeScript ORM with compile-time type safety',
  repository: 'https://github.com/neat-framework/neat-orm',
};

