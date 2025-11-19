/**
 * Neat Framework - Database Types
 *
 * This module defines the core types for database integration in Neat Framework.
 * It provides type-safe abstractions for entities, relationships, queries,
 * and database operations with god-moded TypeScript excellence.
 *
 * Key TypeScript Excellence Features:
 * - Branded types for database identifiers and table names
 * - Generic entity types with proper variance
 * - Type-safe relationship mapping
 * - Conditional types for query building
 * - Template literal types for SQL generation
 *
 * Database Support: PostgreSQL, MySQL, SQLite with unified API
 * ORM Features: Entities, relationships, migrations, queries
 *
 * Pain Points Addressed: Eliminates manual SQL writing, provides
 * compile-time query validation, and enables type-safe data access.
 *
 * Research: Inspired by TypeORM and Prisma but with stronger typing
 * and better integration with dependency injection.
 */

import type { Result } from '../types/results.js';

// ========================================
// BRANDED TYPES FOR TYPE SAFETY
// ========================================

/**
 * Branded types for database identifiers.
 */
export type TableName = { readonly __brand: 'TableName' };
export type ColumnName = { readonly __brand: 'ColumnName' };
export type DatabaseUrl = { readonly __brand: 'DatabaseUrl' };
export type MigrationId = { readonly __brand: 'MigrationId' };
export type TransactionId = { readonly __brand: 'TransactionId' };

// Branding functions
export const brandTableName = (value: string): TableName => value as any;
export const brandColumnName = (value: string): ColumnName => value as any;
export const brandDatabaseUrl = (value: string): DatabaseUrl => value as any;
export const brandMigrationId = (value: string): MigrationId => value as any;
export const brandTransactionId = (value: string): TransactionId => value as any;

// ========================================
// DATABASE DRIVER INTERFACE
// ========================================

/**
 * Database driver interface.
 */
export interface DatabaseDriver {
  readonly name: string;

  // Connection management
  connect(config: DatabaseConfig): Promise<Result<DriverConnection>>;
  disconnect(connection: DriverConnection): Promise<Result<void>>;
  getPoolStats(connection: DriverConnection): ConnectionPoolStats;

  // Query execution
  executeQuery(connection: DriverConnection, query: string, parameters?: any[]): Promise<Result<any[]>>;
  executeUpdate(connection: DriverConnection, query: string, parameters?: any[]): Promise<Result<number>>;

  // Transaction support
  beginTransaction(connection: DriverConnection): Promise<Result<DriverTransaction>>;
  commitTransaction(transaction: DriverTransaction): Promise<Result<void>>;
  rollbackTransaction(transaction: DriverTransaction): Promise<Result<void>>;

  // Schema operations
  createTable(connection: DriverConnection, tableName: string, columns: ColumnDefinition[]): Promise<Result<void>>;
  dropTable(connection: DriverConnection, tableName: string): Promise<Result<void>>;
  tableExists(connection: DriverConnection, tableName: string): Promise<Result<boolean>>;
}

/**
 * Driver-specific connection interface.
 */
export interface DriverConnection {
  readonly driver: DatabaseDriver;
  readonly config: DatabaseConfig;
  readonly nativeConnection: any; // Driver-specific connection object
  readonly isConnected: boolean;
}

/**
 * Driver-specific transaction interface.
 */
export interface DriverTransaction {
  readonly connection: DriverConnection;
  readonly nativeTransaction: any; // Driver-specific transaction object
}

/**
 * Column definition for schema operations.
 */
export interface ColumnDefinition {
  readonly name: string;
  readonly type: string;
  readonly nullable?: boolean;
  readonly primary?: boolean;
  readonly default?: string;
  readonly unique?: boolean;
}

// ========================================
// DATABASE CONFIGURATION
// ========================================

/**
 * Database driver name types.
 */
export type DatabaseDriverName = 'postgresql' | 'mysql' | 'sqlite';

/**
 * Database connection configuration.
 */
export interface DatabaseConfig {
  readonly driver: DatabaseDriverName | DatabaseDriver;
  readonly url: DatabaseUrl;
  readonly poolSize?: number;
  readonly ssl?: boolean;
  readonly logging?: boolean;
  readonly synchronize?: boolean; // Auto-create schema (dev only)
  readonly entities?: readonly EntityConstructor[];
  readonly migrations?: readonly MigrationConstructor[];
}

/**
 * Database connection interface.
 */
export interface DatabaseConnection {
  readonly config: DatabaseConfig;
  readonly isConnected: boolean;

  connect(): Promise<Result<void>>;
  disconnect(): Promise<Result<void>>;
  getPoolStats(): ConnectionPoolStats;
  
  // Driver access
  getDriver(): DatabaseDriver;
  getDriverConnection(): DriverConnection | undefined;
}

/**
 * Connection pool statistics.
 */
export interface ConnectionPoolStats {
  readonly totalConnections: number;
  readonly activeConnections: number;
  readonly idleConnections: number;
  readonly pendingConnections: number;
}

// ========================================
// ENTITY SYSTEM
// ========================================

/**
 * Base entity constructor type.
 */
export type EntityConstructor<T = any> = new () => T;

/**
 * Entity metadata interface.
 */
export interface EntityMetadata {
  readonly tableName: TableName;
  readonly columns: ReadonlyMap<ColumnName, ColumnMetadata>;
  readonly relations: ReadonlyMap<string, RelationMetadata>;
  readonly primaryKey: ColumnName;
  readonly indices: readonly IndexMetadata[];
  readonly uniques: readonly UniqueMetadata[];
}

/**
 * Column metadata.
 */
export interface ColumnMetadata {
  readonly propertyName: string;
  readonly columnName: ColumnName;
  readonly type: ColumnType;
  readonly nullable: boolean;
  readonly primary?: boolean;
  readonly defaultValue?: any;
  readonly length?: number;
  readonly precision?: number;
  readonly scale?: number;
  readonly generated?: 'increment' | 'uuid' | 'rowid';
}

/**
 * Column types supported across databases.
 */
export type ColumnType =
  | 'string'
  | 'text'
  | 'varchar'
  | 'char'
  | 'nvarchar'
  | 'int'
  | 'integer'
  | 'bigint'
  | 'smallint'
  | 'tinyint'
  | 'decimal'
  | 'numeric'
  | 'float'
  | 'double'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'time'
  | 'json'
  | 'blob'
  | 'uuid';

/**
 * Relationship types.
 */
export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

/**
 * Relationship metadata.
 */
export interface RelationMetadata {
  readonly propertyName: string;
  readonly type: RelationType;
  readonly targetEntity: EntityConstructor;
  readonly inverseProperty?: string;
  readonly joinColumn?: ColumnName;
  readonly joinTable?: TableName;
  readonly cascade?: readonly CascadeType[];
  readonly eager?: boolean;
}

/**
 * Cascade operations.
 */
export type CascadeType = 'insert' | 'update' | 'remove' | 'soft-remove' | 'recover';

/**
 * Index metadata.
 */
export interface IndexMetadata {
  readonly name: string;
  readonly columns: readonly ColumnName[];
  readonly isUnique: boolean;
  readonly isSpatial: boolean;
}

/**
 * Unique constraint metadata.
 */
export interface UniqueMetadata {
  readonly name: string;
  readonly columns: readonly ColumnName[];
}

// ========================================
// QUERY SYSTEM
// ========================================

/**
 * Query builder interface for type-safe queries.
 */
export interface QueryBuilder<T extends BaseEntity = BaseEntity> {
  select(columns?: readonly (keyof T | string)[]): this;
  from(entity: EntityConstructor<T>): this;
  where(condition: WhereCondition<T>): this;
  andWhere(condition: WhereCondition<T>): this;
  orWhere(condition: WhereCondition<T>): this;
  join<K extends keyof T>(
    property: K,
    alias?: string,
    condition?: JoinCondition<T, K>
  ): this;
  leftJoin<K extends keyof T>(
    property: K,
    alias?: string,
    condition?: JoinCondition<T, K>
  ): this;
  innerJoin<K extends keyof T>(
    property: K,
    alias?: string,
    condition?: JoinCondition<T, K>
  ): this;
  orderBy(column: keyof T | string, direction?: 'ASC' | 'DESC'): this;
  groupBy(columns: readonly (keyof T | string)[]): this;
  having(condition: HavingCondition<T>): this;
  limit(limit: number): this;
  offset(offset: number): this;

  // Execution methods
  getOne(): Promise<Result<T | null>>;
  getMany(): Promise<Result<T[]>>;
  getCount(): Promise<Result<number>>;
  getRawOne(): Promise<Result<any>>;
  getRawMany(): Promise<Result<any[]>>;
  execute(): Promise<Result<any>>;
}

/**
 * Where condition for type-safe queries.
 */
export type WhereCondition<T extends BaseEntity = any> =
  | { [K in keyof T]?: T[K] | FindOperator<T[K]> }
  | FindOperator<any>
  | ((qb: QueryBuilder<T>) => QueryBuilder<T>);

/**
 * Having condition for aggregations.
 */
export type HavingCondition<T extends BaseEntity = any> = WhereCondition<T>;

/**
 * Join condition for relationships.
 */
export type JoinCondition<T extends BaseEntity, K extends keyof T> = string | ((qb: QueryBuilder<T>) => QueryBuilder<T>);

/**
 * Find operators for advanced queries.
 */
export interface FindOperator<T> {
  readonly type: FindOperatorType;
  readonly value: T | readonly T[];
  readonly useParameter?: boolean;
  readonly multipleParameters?: boolean;
}

export type FindOperatorType =
  | 'not'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'moreThan'
  | 'moreThanOrEqual'
  | 'equal'
  | 'notEqual'
  | 'like'
  | 'notLike'
  | 'iLike'
  | 'notILike'
  | 'regex'
  | 'notRegex'
  | 'iRegex'
  | 'notIRegex'
  | 'any'
  | 'notAny'
  | 'between'
  | 'notBetween'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'notIsNull';

// ========================================
// REPOSITORY PATTERN
// ========================================

/**
 * Repository interface for data access.
 */
export interface Repository<T extends BaseEntity> {
  readonly target: EntityConstructor<T>;
  readonly metadata: EntityMetadata;

  // Basic CRUD
  create(entity: Partial<T>): T;
  save(entity: T): Promise<Result<T>>;
  saveMany(entities: T[]): Promise<Result<T[]>>;
  find(options?: FindOptions<T>): Promise<Result<T[]>>;
  findOne(options?: FindOptions<T>): Promise<Result<T | null>>;
  findById(id: any): Promise<Result<T | null>>;
  update(criteria: Partial<T>, updateData: Partial<T>): Promise<Result<number>>;
  delete(criteria: Partial<T>): Promise<Result<number>>;
  count(options?: FindOptions<T>): Promise<Result<number>>;
  exists(options?: FindOptions<T>): Promise<Result<boolean>>;

  // Advanced operations
  query(): QueryBuilder<T>;
  createQueryBuilder(alias?: string): QueryBuilder<T>;
  clear(): Promise<Result<void>>;

  // Transaction support
  manager: EntityManager;
}

/**
 * Find options for repository queries.
 */
export interface FindOptions<T extends BaseEntity = any> {
  readonly select?: readonly (keyof T)[];
  readonly where?: WhereCondition<T>;
  readonly relations?: readonly (keyof T)[];
  readonly order?: { [K in keyof T]?: 'ASC' | 'DESC' };
  readonly skip?: number;
  readonly take?: number;
  readonly cache?: boolean | number;
  readonly transactionId?: TransactionId;
}

// ========================================
// ENTITY MANAGER & TRANSACTIONS
// ========================================

/**
 * Entity manager for advanced operations.
 */
export interface EntityManager {
  readonly connection: DatabaseConnection;
  readonly repositories: ReadonlyMap<EntityConstructor, Repository<any>>;

  // Repository access
  getRepository<T extends BaseEntity>(entity: EntityConstructor<T>): Repository<T>;

  // Transaction support
  transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<Result<T>>;
  query(query: string, parameters?: any[]): Promise<Result<any>>;
  createQueryBuilder<T extends BaseEntity>(
    entity: EntityConstructor<T>,
    alias?: string
  ): QueryBuilder<T>;

  // Schema operations
  synchronize(dropBeforeSync?: boolean): Promise<Result<void>>;
  dropDatabase(): Promise<Result<void>>;
  runMigrations(): Promise<Result<void>>;
  undoLastMigration(): Promise<Result<void>>;
}

// ========================================
// MIGRATION SYSTEM
// ========================================

/**
 * Migration constructor type.
 */
export type MigrationConstructor = new () => Migration;

/**
 * Migration interface.
 */
export interface Migration {
  readonly id: MigrationId;
  readonly name: string;
  readonly timestamp: number;

  up(queryRunner: QueryRunner): Promise<void>;
  down(queryRunner: QueryRunner): Promise<void>;
}

/**
 * Query runner for migrations.
 */
export interface QueryRunner {
  readonly connection: DatabaseConnection;
  readonly isTransactionActive: boolean;

  // Schema operations
  createTable(table: TableMetadata): Promise<void>;
  dropTable(tableName: TableName): Promise<void>;
  alterTable(table: TableMetadata): Promise<void>;
  renameTable(oldName: TableName, newName: TableName): Promise<void>;

  // Column operations
  addColumn(tableName: TableName, column: ColumnMetadata): Promise<void>;
  dropColumn(tableName: TableName, columnName: ColumnName): Promise<void>;
  changeColumn(tableName: TableName, oldColumn: ColumnMetadata, newColumn: ColumnMetadata): Promise<void>;
  renameColumn(tableName: TableName, oldName: ColumnName, newName: ColumnName): Promise<void>;

  // Index operations
  createIndex(tableName: TableName, index: IndexMetadata): Promise<void>;
  dropIndex(tableName: TableName, indexName: string): Promise<void>;

  // Foreign key operations
  createForeignKey(tableName: TableName, foreignKey: ForeignKeyMetadata): Promise<void>;
  dropForeignKey(tableName: TableName, foreignKeyName: string): Promise<void>;

  // Raw SQL
  query(query: string, parameters?: any[]): Promise<any>;
  insert(tableName: TableName, values: any[]): Promise<void>;
  update(tableName: TableName, values: any, conditions: any): Promise<void>;
  delete(tableName: TableName, conditions: any): Promise<void>;
}

/**
 * Table metadata for schema operations.
 */
export interface TableMetadata {
  readonly name: TableName;
  readonly columns: readonly ColumnMetadata[];
  readonly indices?: readonly IndexMetadata[];
  readonly foreignKeys?: readonly ForeignKeyMetadata[];
  readonly uniques?: readonly UniqueMetadata[];
}

/**
 * Foreign key metadata.
 */
export interface ForeignKeyMetadata {
  readonly name: string;
  readonly columnNames: readonly ColumnName[];
  readonly referencedTableName: TableName;
  readonly referencedColumnNames: readonly ColumnName[];
  readonly onDelete?: 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'NO ACTION';
  readonly onUpdate?: 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'NO ACTION';
}

// ========================================
// BASE ENTITY
// ========================================

/**
 * Base entity class that all entities should extend.
 */
// Base entity class that entities can extend
export abstract class BaseEntity {
  // Common entity properties can be added here
  // Subclasses will be decorated with @Entity, @Column, etc.
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Extract entity type from constructor.
 */
export type EntityType<T extends EntityConstructor> = T extends new () => infer R ? R : never;

/**
 * Get primary key type of entity.
 */
export type PrimaryKeyType<T extends BaseEntity> = T extends { id: infer ID } ? ID : string | number;

/**
 * Make all properties optional except primary key.
 */
export type PartialEntity<T extends BaseEntity> = T extends { id: infer ID }
  ? Partial<Omit<T, 'id'>> & { id: ID }
  : Partial<T>;

/**
 * Entity without relations (for queries that don't load relations).
 */
export type EntityWithoutRelations<T extends BaseEntity> = Omit<T, {
  [K in keyof T]: T[K] extends BaseEntity | BaseEntity[] ? K : never;
}[keyof T]>;
