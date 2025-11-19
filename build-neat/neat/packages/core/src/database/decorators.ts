/**
 * Neat Framework - Database Entity Decorators
 *
 * This module provides decorators for defining database entities, relationships,
 * and schema metadata. These decorators work with the metadata scanner to
 * automatically generate database schemas and provide type-safe data access.
 *
 * Key TypeScript Excellence Features:
 * - Class and property decorators with proper typing
 * - Relationship decorators with compile-time validation
 * - Generic constraints for type safety
 * - Metadata-driven schema generation
 * - Template literal types for column naming
 *
 * Decorators: @Entity, @Column, @PrimaryKey, @OneToOne, @OneToMany, etc.
 * Integration: Works seamlessly with repositories and query builders
 *
 * Pain Points Addressed: Eliminates manual schema definition,
 * provides compile-time relationship validation, and enables
 * automatic migration generation.
 *
 * Research: Inspired by TypeORM decorators but with stronger typing
 * and better integration with Neat's metadata system.
 */

import 'reflect-metadata';
import type {
  ColumnType,
  RelationType,
  CascadeType,
  EntityConstructor,
  ColumnMetadata,
  RelationMetadata,
  EntityMetadata,
  TableName,
  ColumnName
} from './types.js';
import { brandTableName, brandColumnName } from './types.js';

// ========================================
// METADATA KEYS
// ========================================

/**
 * Metadata keys for database decorators.
 */
export const DatabaseMetadataKeys = {
  ENTITY: 'neat:entity',
  COLUMN: 'neat:column',
  RELATION: 'neat:relation',
  INDEX: 'neat:index',
  UNIQUE: 'neat:unique',
  PRIMARY_KEY: 'neat:primary_key',
} as const;

// ========================================
// ENTITY DECORATOR
// ========================================

/**
 * Entity decorator - marks a class as a database entity.
 *
 * @param options Configuration options for the entity
 */
export function Entity(options: EntityOptions = {}): ClassDecorator {
  return function(target: any) {
    const entityOptions: EntityOptions = {
      name: options.name || target.name.toLowerCase(),
      schema: options.schema || 'public',
      synchronize: options.synchronize ?? true,
      ...options
    };

    // Store entity metadata
    Reflect.defineMetadata(DatabaseMetadataKeys.ENTITY, entityOptions, target);

    // Ensure the class extends BaseEntity
    if (!(target.prototype instanceof (require('./types.js').BaseEntity))) {
      // In a real implementation, we might enforce this
      // For now, we'll just log a warning
      console.warn(`Entity ${target.name} should extend BaseEntity for full type safety`);
    }
  };
}

/**
 * Options for @Entity decorator.
 */
export interface EntityOptions {
  readonly name?: string; // Table name (defaults to class name lowercase)
  readonly schema?: string; // Database schema
  readonly synchronize?: boolean; // Include in auto-sync
  readonly orderBy?: Record<string, 'ASC' | 'DESC'>; // Default ordering
}

// ========================================
// COLUMN DECORATORS
// ========================================

/**
 * Column decorator - defines a database column.
 *
 * @param options Column configuration options
 */
export function Column(options: ColumnOptions = {}): PropertyDecorator {
  return function(target: any, propertyKey: string | symbol) {
    if (typeof propertyKey === 'symbol') {
      throw new Error('Column decorator does not support symbol properties');
    }

    const columnOptions: ColumnOptions = {
      name: options.name || propertyKey,
      type: options.type || inferColumnType(target, propertyKey),
      nullable: options.nullable ?? false,
      ...options
    };

    // Store column metadata
    Reflect.defineMetadata(
      `${DatabaseMetadataKeys.COLUMN}:${propertyKey}`,
      columnOptions,
      target.constructor
    );

    // Mark as primary key if specified
    if (options.primary) {
      Reflect.defineMetadata(DatabaseMetadataKeys.PRIMARY_KEY, propertyKey, target.constructor);
    }
  };
}

/**
 * Primary key column decorator.
 */
export function PrimaryKey(options: Omit<ColumnOptions, 'primary'> = {}): PropertyDecorator {
  return Column({ ...options, primary: true });
}

/**
 * Primary generated column decorator (auto-increment).
 */
export function PrimaryGeneratedColumn(options: Omit<ColumnOptions, 'primary' | 'generated'> = {}): PropertyDecorator {
  return Column({ ...options, primary: true, generated: 'increment' });
}

/**
 * UUID primary key column decorator.
 */
export function PrimaryGeneratedUuidColumn(options: Omit<ColumnOptions, 'primary' | 'generated' | 'type'> = {}): PropertyDecorator {
  return Column({ ...options, primary: true, generated: 'uuid', type: 'uuid' });
}

/**
 * Create date column decorator.
 */
export function CreateDateColumn(options: Omit<ColumnOptions, 'type'> = {}): PropertyDecorator {
  return Column({ ...options, type: 'timestamp', default: 'CURRENT_TIMESTAMP' });
}

/**
 * Update date column decorator.
 */
export function UpdateDateColumn(options: Omit<ColumnOptions, 'type'> = {}): PropertyDecorator {
  return Column({ ...options, type: 'timestamp', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' });
}

/**
 * Version column decorator for optimistic locking.
 */
export function VersionColumn(options: Omit<ColumnOptions, 'type'> = {}): PropertyDecorator {
  return Column({ ...options, type: 'int', default: 1 });
}

/**
 * Column options interface.
 */
export interface ColumnOptions {
  readonly name?: string; // Column name (defaults to property name)
  readonly type?: ColumnType; // Column type
  readonly length?: number; // VARCHAR length
  readonly precision?: number; // DECIMAL precision
  readonly scale?: number; // DECIMAL scale
  readonly nullable?: boolean; // Allow NULL values
  readonly default?: any; // Default value
  readonly primary?: boolean; // Is primary key
  readonly generated?: 'increment' | 'uuid' | 'rowid'; // Auto-generation strategy
  readonly comment?: string; // Column comment
  readonly unique?: boolean; // Unique constraint
  readonly select?: boolean; // Include in SELECT by default
}

// ========================================
// RELATIONSHIP DECORATORS
// ========================================

/**
 * One-to-one relationship decorator.
 */
export function OneToOne<T>(
  targetEntity: EntityConstructor<T>,
  options: RelationOptions = {}
): PropertyDecorator {
  return createRelationDecorator('one-to-one', targetEntity, options);
}

/**
 * One-to-many relationship decorator.
 */
export function OneToMany<T>(
  targetEntity: EntityConstructor<T>,
  inverseProperty: keyof T,
  options: RelationOptions = {}
): PropertyDecorator {
  return createRelationDecorator('one-to-many', targetEntity, {
    ...options,
    inverseProperty: inverseProperty as string
  });
}

/**
 * Many-to-one relationship decorator.
 */
export function ManyToOne<T>(
  targetEntity: EntityConstructor<T>,
  options: RelationOptions = {}
): PropertyDecorator {
  return createRelationDecorator('many-to-one', targetEntity, options);
}

/**
 * Many-to-many relationship decorator.
 */
export function ManyToMany<T>(
  targetEntity: EntityConstructor<T>,
  options: RelationOptions = {}
): PropertyDecorator {
  return createRelationDecorator('many-to-many', targetEntity, options);
}

/**
 * Join column decorator for relationships.
 */
export function JoinColumn(options: JoinColumnOptions = {}): PropertyDecorator {
  return function(target: any, propertyKey: string | symbol) {
    if (typeof propertyKey === 'symbol') {
      throw new Error('JoinColumn decorator does not support symbol properties');
    }

    // This decorator modifies the relationship metadata
    // In a real implementation, it would update the existing relation metadata
    Reflect.defineMetadata(
      `neat:join_column:${propertyKey}`,
      options,
      target.constructor
    );
  };
}

/**
 * Join table decorator for many-to-many relationships.
 */
export function JoinTable(options: JoinTableOptions = {}): PropertyDecorator {
  return function(target: any, propertyKey: string | symbol) {
    if (typeof propertyKey === 'symbol') {
      throw new Error('JoinTable decorator does not support symbol properties');
    }

    // This decorator modifies the relationship metadata
    Reflect.defineMetadata(
      `neat:join_table:${propertyKey}`,
      options,
      target.constructor
    );
  };
}

/**
 * Create a relationship decorator.
 */
function createRelationDecorator<T>(
  type: RelationType,
  targetEntity: EntityConstructor<T>,
  options: RelationOptions
): PropertyDecorator {
  return function(target: any, propertyKey: string | symbol) {
    if (typeof propertyKey === 'symbol') {
      throw new Error('Relationship decorators do not support symbol properties');
    }

    const relationOptions: RelationOptions = {
      cascade: options.cascade || [],
      eager: options.eager ?? false,
      ...options
    };

    // Store relation metadata
    Reflect.defineMetadata(
      `${DatabaseMetadataKeys.RELATION}:${propertyKey}`,
      {
        type,
        targetEntity,
        ...relationOptions
      },
      target.constructor
    );
  };
}

/**
 * Relation options interface.
 */
export interface RelationOptions {
  readonly inverseProperty?: string; // Property name on the inverse side
  readonly cascade?: readonly CascadeType[]; // Cascade operations
  readonly eager?: boolean; // Load relation eagerly
  readonly lazy?: boolean; // Load relation lazily (opposite of eager)
  readonly onDelete?: 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'NO ACTION';
  readonly onUpdate?: 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'NO ACTION';
}

/**
 * Join column options.
 */
export interface JoinColumnOptions {
  readonly name?: string; // Column name
  readonly referencedColumnName?: string; // Referenced column name
}

/**
 * Join table options for many-to-many relationships.
 */
export interface JoinTableOptions {
  readonly name?: string; // Join table name
  readonly joinColumn?: JoinColumnOptions; // Column in join table referencing this entity
  readonly inverseJoinColumn?: JoinColumnOptions; // Column in join table referencing target entity
}

// ========================================
// INDEX AND CONSTRAINT DECORATORS
// ========================================

/**
 * Index decorator - creates a database index.
 */
export function Index(name?: string, options: IndexOptions = {}): PropertyDecorator | ClassDecorator {
  return function(target: any, propertyKey?: string | symbol) {
    const propertyKeyStr = propertyKey ? String(propertyKey) : 'compound';
    const indexOptions: IndexOptions = {
      name: name || `IDX_${target.constructor?.name || target.name}_${propertyKeyStr}`,
      isUnique: options.isUnique ?? false,
      isSpatial: options.isSpatial ?? false,
      ...options
    };

    // Determine columns based on usage
    let columns: string[] = [];
    if (typeof propertyKey === 'string') {
      // Property decorator - single column index
      columns = [propertyKey];
    } else if (options.columns) {
      // Class decorator with specified columns
      columns = options.columns;
    }

    const indexMetadata = {
      ...indexOptions,
      columns
    };

    // Store index metadata
    const key = propertyKey
      ? `${DatabaseMetadataKeys.INDEX}:${propertyKeyStr}`
      : DatabaseMetadataKeys.INDEX;

    const existingIndices = Reflect.getMetadata(key, target) || [];
    Reflect.defineMetadata(key, [...existingIndices, indexMetadata], target);
  };
}

/**
 * Unique constraint decorator.
 */
export function Unique(name?: string, columns?: string[]): PropertyDecorator | ClassDecorator {
  return function(target: any, propertyKey?: string | symbol) {
    const propertyKeyStr = propertyKey ? String(propertyKey) : 'compound';
    const uniqueName = name || `UQ_${target.constructor?.name || target.name}_${propertyKeyStr}`;

    // Determine columns based on usage
    let uniqueColumns: string[] = [];
    if (typeof propertyKey === 'string') {
      // Property decorator - single column unique
      uniqueColumns = [propertyKey];
    } else if (columns) {
      // Class decorator with specified columns
      uniqueColumns = columns;
    }

    const uniqueMetadata = {
      name: uniqueName,
      columns: uniqueColumns
    };

    // Store unique metadata
    const key = propertyKey
      ? `${DatabaseMetadataKeys.UNIQUE}:${propertyKeyStr}`
      : DatabaseMetadataKeys.UNIQUE;

    const existingUniques = Reflect.getMetadata(key, target) || [];
    Reflect.defineMetadata(key, [...existingUniques, uniqueMetadata], target);
  };
}

/**
 * Index options interface.
 */
export interface IndexOptions {
  readonly name?: string; // Index name
  readonly columns?: string[]; // Columns to index (for class decorator)
  readonly isUnique?: boolean; // Unique index
  readonly isSpatial?: boolean; // Spatial index
  readonly where?: string; // Partial index condition
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Infer column type from TypeScript property type.
 */
function inferColumnType(target: any, propertyKey: string): ColumnType {
  const designType = Reflect.getMetadata('design:type', target, propertyKey);

  if (!designType) return 'string';

  switch (designType.name) {
    case 'String':
      return 'string';
    case 'Number':
      return 'int';
    case 'Boolean':
      return 'boolean';
    case 'Date':
      return 'timestamp';
    case 'Object':
      return 'json';
    default:
      return 'string';
  }
}

// ========================================
// METADATA EXTRACTION
// ========================================

/**
 * Extract entity metadata from decorated class.
 */
export function extractEntityMetadata(target: EntityConstructor): EntityMetadata {
  const entityOptions: EntityOptions = Reflect.getMetadata(DatabaseMetadataKeys.ENTITY, target) || {};

  // Get all property keys
  const prototype = target.prototype;
  const propertyKeys = Object.getOwnPropertyNames(prototype).filter(key =>
    key !== 'constructor' && typeof prototype[key] !== 'function'
  );

  // Extract columns
  const columns = new Map<ColumnName, ColumnMetadata>();
  for (const propertyKey of propertyKeys) {
    const columnOptions = Reflect.getMetadata(`${DatabaseMetadataKeys.COLUMN}:${propertyKey}`, target);
    if (columnOptions) {
      const columnName = brandColumnName(columnOptions.name || propertyKey);
      columns.set(columnName, {
        propertyName: propertyKey,
        columnName,
        ...columnOptions
      });
    }
  }

  // Extract relations
  const relations = new Map<string, RelationMetadata>();
  for (const propertyKey of propertyKeys) {
    const relationOptions = Reflect.getMetadata(`${DatabaseMetadataKeys.RELATION}:${propertyKey}`, target);
    if (relationOptions) {
      relations.set(propertyKey, {
        propertyName: propertyKey,
        ...relationOptions
      });
    }
  }

  // Find primary key
  let primaryKey: ColumnName | undefined;
  for (const [columnName, columnMeta] of Array.from(columns)) {
    if (columnMeta.primary) {
      primaryKey = columnName;
      break;
    }
  }

  if (!primaryKey) {
    throw new Error(`Entity ${target.name} must have a primary key column`);
  }

  // Extract indices and uniques (simplified)
  const indices: any[] = [];
  const uniques: any[] = [];

  return {
    tableName: brandTableName(entityOptions.name!),
    columns,
    relations,
    primaryKey,
    indices,
    uniques
  };
}
