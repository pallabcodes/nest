/**
 * NeatOrm - Foreign Key Decorator
 *
 * The @ForeignKey decorator marks a column as a foreign key reference to another
 * table. Importantly, it does NOT import the related entity class, which prevents
 * circular dependencies. Relationships are resolved via the relationship registry.
 *
 * Key TypeScript Excellence Features:
 * - String-based table references (no imports needed!)
 * - Compile-time validation of cascade options
 * - Composable with @Column decorator
 * - Zero circular dependencies
 *
 * TypeScript Compilation:
 * The decorator stores foreign key metadata using string table names instead of
 * class references. This eliminates circular dependency issues that plague other
 * ORMs while maintaining type safety through the relationship registry.
 *
 * Runtime Behavior:
 * Foreign key metadata is used by:
 * - Migration system for constraint generation
 * - Query builder for join validation
 * - Relationship registry for entity resolution
 * - Cascading operations (delete, update)
 *
 * Framework Integration:
 * The @ForeignKey decorator integrates with:
 * - Relationship registry for entity linking
 * - Migration system for FK constraint DDL
 * - Query builder for join construction
 * - Cascading delete/update operations
 *
 * Pain Points Addressed:
 * - Circular dependencies from importing related entities
 * - Manual foreign key configuration
 * - Inconsistent cascade behavior
 * - Missing referential integrity constraints
 *
 * Research:
 * Revolutionary approach that solves the circular dependency problem by using
 * string-based table references instead of class imports. Inspired by Ecto's
 * schema references and Django's string-based ForeignKey definitions.
 */

import {
  FOREIGN_KEY_METADATA_KEY,
  type ForeignKeyMetadata,
  getMetadata,
  setMetadata,
} from '../metadata/index.js';

/**
 * Cascade action types for foreign keys.
 */
export type CascadeAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

/**
 * Options for the @ForeignKey decorator.
 */
export interface ForeignKeyOptions {
  /**
   * Referenced table name (NOT the entity class!).
   * This prevents circular dependencies.
   *
   * @example 'users', 'posts', 'categories'
   */
  referencedTable: string;

  /**
   * Referenced column name in the target table.
   * Usually the primary key column.
   *
   * Default: 'id'
   */
  referencedColumn?: string;

  /**
   * Action to take when the referenced row is deleted.
   *
   * - CASCADE: Delete this row when referenced row is deleted
   * - SET NULL: Set this foreign key to NULL (requires nullable column)
   * - RESTRICT: Prevent deletion of referenced row
   * - NO ACTION: Same as RESTRICT but deferred until transaction commit
   *
   * Default: 'NO ACTION'
   */
  onDelete?: CascadeAction;

  /**
   * Action to take when the referenced row's primary key is updated.
   *
   * - CASCADE: Update this foreign key value
   * - SET NULL: Set this foreign key to NULL
   * - RESTRICT: Prevent update of referenced row's primary key
   * - NO ACTION: Same as RESTRICT but deferred
   *
   * Default: 'NO ACTION'
   */
  onUpdate?: CascadeAction;

  /**
   * Foreign key constraint name.
   * If not specified, a name will be auto-generated.
   */
  constraintName?: string;
}

/**
 * God-moded TypeScript: ForeignKey decorator.
 *
 * Marks a column as a foreign key reference WITHOUT importing the related entity.
 * This revolutionary approach eliminates circular dependency issues.
 *
 * @param referencedTableOrOptions - Table name or full options
 * @param referencedColumn - Referenced column (if first param is string)
 * @returns Property decorator that marks the column as a foreign key
 *
 * @example
 * ```typescript
 * @Entity('posts')
 * export class Post {
 *   @PrimaryKey()
 *   @Generated()
 *   @Column({ type: 'serial' })
 *   id!: number;
 *
 *   @Column({ type: 'varchar', length: 500 })
 *   title!: string;
 *
 *   // Simple foreign key (references users.id)
 *   @ForeignKey('users', 'id')
 *   @Column({ type: 'integer' })
 *   userId!: number;
 *
 *   // Foreign key with cascade delete
 *   @ForeignKey({
 *     referencedTable: 'categories',
 *     referencedColumn: 'id',
 *     onDelete: 'CASCADE'
 *   })
 *   @Column({ type: 'integer', nullable: true })
 *   categoryId?: number | null;
 * }
 *
 * // NO IMPORTS OF USER OR CATEGORY ENTITY CLASSES!
 * // Relationships are defined separately in the registry.
 * // This prevents circular dependencies completely.
 * ```
 */
export function ForeignKey(
  referencedTableOrOptions: string | ForeignKeyOptions,
  referencedColumn?: string
): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const targetConstructor = target.constructor;

    // Normalize options
    const options: ForeignKeyOptions =
      typeof referencedTableOrOptions === 'string'
        ? {
            referencedTable: referencedTableOrOptions,
            referencedColumn: referencedColumn || 'id',
          }
        : referencedTableOrOptions;

    // Create foreign key metadata
    const foreignKeyMetadata: ForeignKeyMetadata = {
      referencedTable: options.referencedTable,
      referencedColumn: options.referencedColumn || 'id',
      onDelete: options.onDelete || 'NO ACTION',
      onUpdate: options.onUpdate || 'NO ACTION',
    };

    // Get existing foreign keys or create new map
    const existingForeignKeys =
      getMetadata<Map<string | symbol, ForeignKeyMetadata>>(
        FOREIGN_KEY_METADATA_KEY,
        targetConstructor
      ) || new Map();

    // Add this foreign key
    existingForeignKeys.set(propertyKey, foreignKeyMetadata);

    // Store updated foreign keys metadata
    setMetadata(
      FOREIGN_KEY_METADATA_KEY,
      existingForeignKeys,
      targetConstructor
    );

    // Store constraint name if provided
    if (options.constraintName) {
      setMetadata(
        Symbol.for(`neat-orm:fk-constraint-name:${String(propertyKey)}`),
        options.constraintName,
        targetConstructor
      );
    }
  };
}

/**
 * Helper to check if a property is a foreign key.
 *
 * @param target - Entity class constructor
 * @param propertyKey - Property name
 * @returns True if the property is a foreign key
 */
export function isForeignKey(
  target: Function,
  propertyKey: string | symbol
): boolean {
  const foreignKeys = getMetadata<Map<string | symbol, ForeignKeyMetadata>>(
    FOREIGN_KEY_METADATA_KEY,
    target
  );
  return foreignKeys?.has(propertyKey) ?? false;
}

/**
 * Helper to get foreign key metadata.
 *
 * @param target - Entity class constructor
 * @param propertyKey - Property name
 * @returns Foreign key metadata or undefined
 */
export function getForeignKeyMetadata(
  target: Function,
  propertyKey: string | symbol
): ForeignKeyMetadata | undefined {
  const foreignKeys = getMetadata<Map<string | symbol, ForeignKeyMetadata>>(
    FOREIGN_KEY_METADATA_KEY,
    target
  );
  return foreignKeys?.get(propertyKey);
}

/**
 * Helper to get all foreign keys for an entity.
 *
 * @param target - Entity class constructor
 * @returns Map of foreign key metadata
 */
export function getAllForeignKeys(
  target: Function
): Map<string | symbol, ForeignKeyMetadata> {
  return (
    getMetadata<Map<string | symbol, ForeignKeyMetadata>>(
      FOREIGN_KEY_METADATA_KEY,
      target
    ) || new Map()
  );
}

