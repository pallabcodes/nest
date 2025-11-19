/**
 * NeatOrm - Primary Key Decorators
 *
 * The @PrimaryKey and @Generated decorators mark columns as primary keys and
 * configure auto-generation strategies. These decorators work together to
 * define entity identifiers with compile-time type safety.
 *
 * Key TypeScript Excellence Features:
 * - Compose with @Column for full configuration
 * - Type-safe generation strategies
 * - Prevents duplicate primary keys at metadata level
 * - Integrates with query builder for INSERT/UPDATE operations
 *
 * TypeScript Compilation:
 * These decorators attach metadata to entity properties, marking them as
 * primary keys and configuring how values are generated. The metadata is
 * used at runtime for query construction and validation.
 *
 * Runtime Behavior:
 * Primary key metadata guides INSERT operations (skip generated keys) and
 * UPDATE/DELETE operations (use as WHERE condition). Generated columns are
 * automatically populated by the database or ORM.
 *
 * Framework Integration:
 * Primary key decorators integrate with:
 * - Query builder for WHERE clause construction
 * - INSERT operations (omit generated keys)
 * - Entity identity mapping
 * - Relationship foreign key resolution
 *
 * Pain Points Addressed:
 * - Manual primary key configuration
 * - Inconsistent ID generation strategies
 * - Runtime errors from missing primary keys
 * - Duplicate primary key definitions
 *
 * Research:
 * Inspired by JPA's @Id and @GeneratedValue, TypeORM's @PrimaryColumn and
 * @PrimaryGeneratedColumn. Enhanced with TypeScript's type system for
 * compile-time validation.
 */

import {
  PRIMARY_KEY_METADATA_KEY,
  GENERATED_METADATA_KEY,
  type GeneratedMetadata,
  getMetadata,
  setMetadata,
} from '../metadata/index.js';

/**
 * Generation strategy for primary keys.
 */
export type GenerationStrategy = 'increment' | 'uuid' | 'identity';

/**
 * Options for the @Generated decorator.
 */
export interface GeneratedOptions {
  /**
   * Generation strategy.
   *
   * - 'increment': Auto-increment integer (MySQL AUTO_INCREMENT, PostgreSQL SERIAL)
   * - 'uuid': Generate UUID v4 (requires database support or ORM generation)
   * - 'identity': Use database identity column (PostgreSQL IDENTITY, SQL Server IDENTITY)
   *
   * Default: 'increment'
   */
  strategy?: GenerationStrategy;
}

/**
 * God-moded TypeScript: PrimaryKey decorator.
 *
 * Marks a column as the primary key for the entity.
 * Should be combined with @Column for full column configuration.
 *
 * @returns Property decorator that marks the column as primary key
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   @PrimaryKey()
 *   @Column({ type: 'integer' })
 *   id!: number;
 *
 *   @Column({ type: 'varchar', length: 255 })
 *   name!: string;
 * }
 * ```
 */
export function PrimaryKey(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const targetConstructor = target.constructor;

    // Check if a primary key is already defined
    const existingPrimaryKey = getMetadata<string | symbol>(
      PRIMARY_KEY_METADATA_KEY,
      targetConstructor
    );

    if (existingPrimaryKey) {
      throw new Error(
        `Primary key already defined on property '${String(
          existingPrimaryKey
        )}' in ${targetConstructor.name}. ` +
          `Cannot define multiple primary keys. Consider using a composite primary key pattern instead.`
      );
    }

    // Store primary key metadata
    setMetadata(PRIMARY_KEY_METADATA_KEY, propertyKey, targetConstructor);
  };
}

/**
 * God-moded TypeScript: Generated decorator.
 *
 * Marks a column as auto-generated, specifying how values should be created.
 * Commonly used with primary keys but can be applied to any column.
 *
 * @param options - Generation configuration
 * @returns Property decorator that marks the column as generated
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   // Auto-increment integer primary key
 *   @PrimaryKey()
 *   @Generated()
 *   @Column({ type: 'serial' })
 *   id!: number;
 *
 *   @Column({ type: 'varchar', length: 255 })
 *   name!: string;
 * }
 *
 * @Entity('sessions')
 * export class Session {
 *   // UUID primary key
 *   @PrimaryKey()
 *   @Generated({ strategy: 'uuid' })
 *   @Column({ type: 'uuid' })
 *   id!: string;
 *
 *   @Column({ type: 'text' })
 *   token!: string;
 * }
 *
 * @Entity('audit_logs')
 * export class AuditLog {
 *   @PrimaryKey()
 *   @Generated({ strategy: 'identity' })
 *   @Column({ type: 'integer' })
 *   id!: number;
 *
 *   // Auto-generated timestamp
 *   @Generated()
 *   @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
 *   createdAt!: Date;
 * }
 * ```
 */
export function Generated(options: GeneratedOptions = {}): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const targetConstructor = target.constructor;

    // Create generated metadata
    const generatedMetadata: GeneratedMetadata = {
      strategy: options.strategy || 'increment',
    };

    // Get existing generated columns or create new map
    const existingGenerated =
      getMetadata<Map<string | symbol, GeneratedMetadata>>(
        GENERATED_METADATA_KEY,
        targetConstructor
      ) || new Map();

    // Add this generated column
    existingGenerated.set(propertyKey, generatedMetadata);

    // Store updated generated metadata
    setMetadata(GENERATED_METADATA_KEY, existingGenerated, targetConstructor);
  };
}

/**
 * Composite decorator that combines @PrimaryKey, @Generated, and @Column.
 * Convenience decorator for the most common primary key pattern.
 *
 * @param strategy - Generation strategy (default: 'increment')
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   // Equivalent to: @PrimaryKey() @Generated() @Column({ type: 'serial' })
 *   @PrimaryGeneratedColumn()
 *   id!: number;
 *
 *   // UUID primary key
 *   @PrimaryGeneratedColumn('uuid')
 *   id!: string;
 * }
 * ```
 */
export function PrimaryGeneratedColumn(
  strategy: GenerationStrategy = 'increment'
): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    // Apply @PrimaryKey
    PrimaryKey()(target, propertyKey);

    // Apply @Generated
    Generated({ strategy })(target, propertyKey);

    // Note: User still needs to apply @Column with appropriate type
    // This is intentional to maintain flexibility and explicitness
  };
}

/**
 * Helper to check if a property is the primary key.
 *
 * @param target - Entity class constructor
 * @param propertyKey - Property name
 * @returns True if the property is the primary key
 */
export function isPrimaryKey(
  target: Function,
  propertyKey: string | symbol
): boolean {
  const primaryKey = getMetadata<string | symbol>(
    PRIMARY_KEY_METADATA_KEY,
    target
  );
  return primaryKey === propertyKey;
}

/**
 * Helper to get the primary key property name.
 *
 * @param target - Entity class constructor
 * @returns Primary key property name or undefined
 */
export function getPrimaryKey(target: Function): string | symbol | undefined {
  return getMetadata<string | symbol>(PRIMARY_KEY_METADATA_KEY, target);
}

/**
 * Helper to check if a property is generated.
 *
 * @param target - Entity class constructor
 * @param propertyKey - Property name
 * @returns True if the property is generated
 */
export function isGenerated(
  target: Function,
  propertyKey: string | symbol
): boolean {
  const generated = getMetadata<Map<string | symbol, GeneratedMetadata>>(
    GENERATED_METADATA_KEY,
    target
  );
  return generated?.has(propertyKey) ?? false;
}

/**
 * Helper to get generation metadata.
 *
 * @param target - Entity class constructor
 * @param propertyKey - Property name
 * @returns Generation metadata or undefined
 */
export function getGenerationMetadata(
  target: Function,
  propertyKey: string | symbol
): GeneratedMetadata | undefined {
  const generated = getMetadata<Map<string | symbol, GeneratedMetadata>>(
    GENERATED_METADATA_KEY,
    target
  );
  return generated?.get(propertyKey);
}

