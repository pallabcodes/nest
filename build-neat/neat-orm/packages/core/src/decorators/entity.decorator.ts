/**
 * NeatOrm - Entity Decorator
 *
 * The @Entity decorator marks a class as a database entity (table). It stores
 * table configuration metadata that is used during query building, migrations,
 * and runtime entity management.
 *
 * Key TypeScript Excellence Features:
 * - Class decorator with compile-time type safety
 * - String literal types for table names
 * - Optional configuration with sensible defaults
 * - Integrates with metadata system
 *
 * TypeScript Compilation:
 * When emitDecoratorMetadata is enabled, TypeScript emits design-time type
 * information that can be accessed at runtime via reflect-metadata. The @Entity
 * decorator attaches table configuration to the class constructor.
 *
 * Runtime Behavior:
 * At runtime, the decorator function executes immediately when the class is
 * defined. It stores metadata on the class constructor using reflect-metadata,
 * making it accessible to the ORM's query builder and migration system.
 *
 * Framework Integration:
 * The @Entity decorator is the foundation for all entity classes. It integrates
 * with:
 * - Metadata scanner for entity discovery
 * - Query builder for table name resolution
 * - Migration system for schema generation
 * - Relationship registry for entity references
 *
 * Pain Points Addressed:
 * - Manual entity registration boilerplate eliminated
 * - Type-safe table name configuration
 * - Clear separation between class name and table name
 * - Support for database schemas and multi-database setups
 *
 * Research:
 * Inspired by TypeORM's @Entity and JPA's @Table annotation, enhanced with
 * TypeScript's type system for compile-time validation. Follows patterns from
 * Neat framework's @Injectable and @Controller decorators.
 */

import {
  ENTITY_METADATA_KEY,
  type EntityMetadata,
  setMetadata,
  getMetadata,
  hasMetadata,
} from '../metadata/index.js';

/**
 * Options for the @Entity decorator.
 */
export interface EntityOptions {
  /**
   * Table name in the database.
   * If not specified, uses the lowercase class name with 's' appended.
   *
   * @example
   * ```typescript
   * @Entity('users') // table name: users
   * class User {}
   *
   * @Entity({ name: 'app_users' }) // table name: app_users
   * class User {}
   * ```
   */
  name?: string;

  /**
   * Database schema name (for databases that support schemas).
   * Used for PostgreSQL schema-qualified table names.
   *
   * @example
   * ```typescript
   * @Entity({ name: 'users', schema: 'public' })
   * class User {}
   * // Resolves to: public.users
   * ```
   */
  schema?: string;

  /**
   * Database name (for multi-database setups).
   * Useful when working with multiple databases in the same application.
   *
   * @example
   * ```typescript
   * @Entity({ name: 'users', database: 'auth_db' })
   * class User {}
   * ```
   */
  database?: string;

  /**
   * Comment for the table (if supported by the database).
   * Added to the table definition in migrations.
   */
  comment?: string;

  /**
   * Whether this is a view instead of a table.
   * Views are read-only and don't support insert/update/delete.
   */
  isView?: boolean;

  /**
   * Engine to use for the table (MySQL/MariaDB specific).
   *
   * @example 'InnoDB' | 'MyISAM'
   */
  engine?: string;

  /**
   * Character set for the table (MySQL/MariaDB specific).
   */
  charset?: string;

  /**
   * Collation for the table (MySQL/MariaDB specific).
   */
  collation?: string;
}

/**
 * God-moded TypeScript: Entity decorator factory.
 *
 * Marks a class as a database entity and configures table settings.
 * Uses advanced TypeScript patterns for type-safe configuration.
 *
 * @param tableNameOrOptions - Table name string or options object
 * @returns Class decorator that attaches entity metadata
 *
 * @example
 * ```typescript
 * // Simple usage with table name
 * @Entity('users')
 * export class User {
 *   // ... columns
 * }
 *
 * // Advanced usage with options
 * @Entity({
 *   name: 'users',
 *   schema: 'public',
 *   comment: 'User accounts table'
 * })
 * export class User {
 *   // ... columns
 * }
 *
 * // Defaults to lowercase class name + 's'
 * @Entity()
 * export class User {
 *   // Resolves to table name: 'users'
 * }
 * ```
 */
export function Entity(
  tableNameOrOptions?: string | EntityOptions
): ClassDecorator {
  return (target: any) => {
    // Normalize options
    const options: EntityOptions =
      typeof tableNameOrOptions === 'string'
        ? { name: tableNameOrOptions }
        : tableNameOrOptions || {};

    // Determine table name
    const tableName =
      options.name || `${target.name.toLowerCase()}s`;

    // Create entity metadata
    const entityMetadata: EntityMetadata = {
      tableName,
      ...(options.schema && { schema: options.schema }),
      ...(options.database && { database: options.database }),
    };

    // Store metadata on the class constructor
    setMetadata(ENTITY_METADATA_KEY, entityMetadata, target);

    // Store additional options as separate metadata if needed
    if (options.comment) {
      setMetadata(Symbol.for('neat-orm:table-comment'), options.comment, target);
    }
    if (options.isView) {
      setMetadata(Symbol.for('neat-orm:is-view'), true, target);
    }
    if (options.engine) {
      setMetadata(Symbol.for('neat-orm:engine'), options.engine, target);
    }
    if (options.charset) {
      setMetadata(Symbol.for('neat-orm:charset'), options.charset, target);
    }
    if (options.collation) {
      setMetadata(Symbol.for('neat-orm:collation'), options.collation, target);
    }

    // Freeze the constructor to prevent runtime modifications
    // This is a safety measure for production code
    Object.freeze(target);
  };
}

/**
 * Type guard to check if a class is decorated with @Entity.
 *
 * @param target - The class constructor to check
 * @returns True if the class is an entity
 *
 * @example
 * ```typescript
 * if (isEntity(User)) {
 *   console.log('User is an entity');
 * }
 * ```
 */
export function isEntity(target: any): boolean {
  return hasMetadata(ENTITY_METADATA_KEY, target);
}

/**
 * Get the table name for an entity class.
 *
 * @param target - The entity class constructor
 * @returns The table name
 *
 * @example
 * ```typescript
 * const tableName = getTableName(User); // 'users'
 * ```
 */
export function getTableName(target: Function): string {
  const metadata = getMetadata<EntityMetadata>(
    ENTITY_METADATA_KEY,
    target
  );
  if (!metadata) {
    throw new Error(`Class ${target.name} is not decorated with @Entity()`);
  }
  return metadata.tableName;
}

/**
 * Get the fully qualified table name (schema.table or database.table).
 *
 * @param target - The entity class constructor
 * @returns The qualified table name
 *
 * @example
 * ```typescript
 * const qualifiedName = getQualifiedTableName(User);
 * // Returns: 'public.users' (if schema is set)
 * // Returns: 'users' (if no schema)
 * ```
 */
export function getQualifiedTableName(target: Function): string {
  const metadata = getMetadata<EntityMetadata>(
    ENTITY_METADATA_KEY,
    target
  );
  if (!metadata) {
    throw new Error(`Class ${target.name} is not decorated with @Entity()`);
  }

  if (metadata.schema) {
    return `${metadata.schema}.${metadata.tableName}`;
  }
  if (metadata.database) {
    return `${metadata.database}.${metadata.tableName}`;
  }
  return metadata.tableName;
}

