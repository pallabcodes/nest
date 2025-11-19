import 'reflect-metadata';

// Type augmentation for reflect-metadata
declare global {
  namespace Reflect {
    function hasMetadata(metadataKey: any, target: object, propertyKey?: string | symbol): boolean;
    function getMetadata(metadataKey: any, target: object, propertyKey?: string | symbol): any;
    function defineMetadata(metadataKey: any, metadataValue: any, target: object, propertyKey?: string | symbol): void;
    function getMetadataKeys(target: object, propertyKey?: string | symbol): any[];
  }
}

/**
 * NeatOrm - Metadata Keys
 *
 * Metadata keys are used to store and retrieve entity metadata attached via
 * decorators. These keys must be unique symbols to prevent collisions with
 * other libraries or user code.
 *
 * Key TypeScript Excellence Features:
 * - Unique symbol keys for metadata storage
 * - Type-safe metadata access
 * - Prevents naming collisions
 * - Compatible with reflect-metadata library
 *
 * TypeScript Compilation:
 * Symbols are preserved at runtime for metadata storage. The decorators use
 * these symbols to attach metadata to class constructors and properties.
 *
 * Runtime Behavior:
 * These symbols serve as keys in the reflect-metadata storage. Each decorator
 * stores its configuration under a unique symbol key, allowing retrieval during
 * entity initialization and query building.
 *
 * Framework Integration:
 * Metadata keys are used by:
 * - Entity decorator to store table configuration
 * - Column decorator to store column configuration
 * - Relation decorators to store relationship metadata
 * - Metadata scanner to retrieve all configuration
 *
 * Pain Points Addressed:
 * - Metadata key collisions between different libraries
 * - Type-unsafe metadata access
 * - Difficulty debugging metadata issues
 * - Inconsistent metadata structure across decorators
 *
 * Research:
 * Follows patterns from Angular, TypeORM, and NestJS for metadata storage.
 * Uses reflect-metadata as the underlying storage mechanism, providing a
 * standard interface for decorator-based frameworks.
 */

/**
 * Metadata key for entity configuration.
 * Stores table name, schema, and entity options.
 */
export const ENTITY_METADATA_KEY = Symbol.for('neat-orm:entity');

/**
 * Metadata key for column configuration.
 * Stores column type, length, nullable, default value, etc.
 */
export const COLUMN_METADATA_KEY = Symbol.for('neat-orm:column');

/**
 * Metadata key for primary key configuration.
 * Marks a column as the primary key.
 */
export const PRIMARY_KEY_METADATA_KEY = Symbol.for('neat-orm:primary-key');

/**
 * Metadata key for generated/auto-increment configuration.
 * Marks a column as auto-generated (serial, auto-increment, etc.).
 */
export const GENERATED_METADATA_KEY = Symbol.for('neat-orm:generated');

/**
 * Metadata key for foreign key configuration.
 * Stores reference table and column information.
 */
export const FOREIGN_KEY_METADATA_KEY = Symbol.for('neat-orm:foreign-key');

/**
 * Metadata key for index configuration.
 * Stores index type, unique, columns.
 */
export const INDEX_METADATA_KEY = Symbol.for('neat-orm:index');

/**
 * Metadata key for unique constraint configuration.
 */
export const UNIQUE_METADATA_KEY = Symbol.for('neat-orm:unique');

/**
 * Metadata key for check constraint configuration.
 */
export const CHECK_METADATA_KEY = Symbol.for('neat-orm:check');

/**
 * Metadata key for relation configuration.
 * Stores relationship type and options.
 */
export const RELATION_METADATA_KEY = Symbol.for('neat-orm:relation');

/**
 * Metadata key for HasMany relation.
 */
export const HAS_MANY_METADATA_KEY = Symbol.for('neat-orm:has-many');

/**
 * Metadata key for BelongsTo relation.
 */
export const BELONGS_TO_METADATA_KEY = Symbol.for('neat-orm:belongs-to');

/**
 * Metadata key for HasOne relation.
 */
export const HAS_ONE_METADATA_KEY = Symbol.for('neat-orm:has-one');

/**
 * Metadata key for ManyToMany relation.
 */
export const MANY_TO_MANY_METADATA_KEY = Symbol.for('neat-orm:many-to-many');

/**
 * Metadata key for storing all column names on an entity.
 * Used for quick lookup of entity structure.
 */
export const COLUMNS_LIST_METADATA_KEY = Symbol.for('neat-orm:columns-list');

/**
 * Metadata key for storing column property names to database column names mapping.
 */
export const COLUMN_NAME_MAP_METADATA_KEY = Symbol.for(
  'neat-orm:column-name-map'
);

/**
 * Metadata key for validation rules.
 * Stores validation constraints for columns.
 */
export const VALIDATION_METADATA_KEY = Symbol.for('neat-orm:validation');

/**
 * Metadata key for hooks (before/after save, delete, etc.).
 */
export const HOOKS_METADATA_KEY = Symbol.for('neat-orm:hooks');

/**
 * Metadata key for individual hook metadata.
 */
export const HOOK_METADATA_KEY = Symbol.for('neat-orm:hook');

/**
 * Metadata key for soft delete configuration.
 */
export const SOFT_DELETE_METADATA_KEY = Symbol.for('neat-orm:soft-delete');

/**
 * Metadata key for timestamp configuration (createdAt, updatedAt).
 */
export const TIMESTAMPS_METADATA_KEY = Symbol.for('neat-orm:timestamps');

/**
 * Metadata key for discriminator configuration (for inheritance).
 */
export const DISCRIMINATOR_METADATA_KEY = Symbol.for('neat-orm:discriminator');

/**
 * Type-safe metadata key registry.
 * Provides compile-time checking of metadata key usage.
 */
export interface MetadataKeyRegistry {
  [ENTITY_METADATA_KEY]: EntityMetadata;
  [COLUMN_METADATA_KEY]: Map<string | symbol, ColumnMetadata>;
  [PRIMARY_KEY_METADATA_KEY]: string | symbol;
  [GENERATED_METADATA_KEY]: Map<string | symbol, GeneratedMetadata>;
  [FOREIGN_KEY_METADATA_KEY]: Map<string | symbol, ForeignKeyMetadata>;
  [INDEX_METADATA_KEY]: IndexMetadata[];
  [RELATION_METADATA_KEY]: Map<string | symbol, RelationMetadata>;
  [COLUMNS_LIST_METADATA_KEY]: readonly (string | symbol)[];
  [COLUMN_NAME_MAP_METADATA_KEY]: Map<string | symbol, string>;
}

/**
 * Entity metadata type.
 */
export interface EntityMetadata {
  tableName: string;
  schema?: string;
  database?: string;
}

/**
 * Column metadata type.
 */
export interface ColumnMetadata {
  name: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable?: boolean;
  default?: unknown;
  unique?: boolean;
  unsigned?: boolean;
  zerofill?: boolean;
  comment?: string;
}

/**
 * Generated column metadata type.
 */
export interface GeneratedMetadata {
  strategy: 'increment' | 'uuid' | 'identity';
}

/**
 * Foreign key metadata type.
 */
export interface ForeignKeyMetadata {
  referencedTable: string;
  referencedColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

/**
 * Index metadata type.
 */
export interface IndexMetadata {
  name?: string;
  columns: readonly (string | symbol)[];
  unique?: boolean;
  type?: 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'FULLTEXT';
}

/**
 * Relation metadata type.
 */
export interface RelationMetadata {
  type: 'hasMany' | 'belongsTo' | 'hasOne' | 'manyToMany';
  target: Function;
  foreignKey?: string;
  localKey?: string;
  throughTable?: string;
  inverse?: string;
}

/**
 * Helper to check if a metadata key exists on a target.
 */
export function hasMetadata(
  metadataKey: symbol,
  target: object,
  propertyKey?: string | symbol
): boolean {
  return Reflect.hasMetadata(metadataKey, target, propertyKey as any);
}

/**
 * Helper to get metadata from a target.
 */
export function getMetadata<T>(
  metadataKey: symbol,
  target: object,
  propertyKey?: string | symbol
): T | undefined {
  return Reflect.getMetadata(metadataKey, target, propertyKey as any);
}

/**
 * Helper to set metadata on a target.
 */
export function setMetadata<T>(
  metadataKey: symbol,
  metadataValue: T,
  target: object,
  propertyKey?: string | symbol
): void {
  Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey as any);
}

/**
 * Helper to get all metadata keys from a target.
 */
export function getMetadataKeys(
  target: object,
  propertyKey?: string | symbol
): symbol[] {
  return Reflect.getMetadataKeys(target, propertyKey as any) as symbol[];
}

