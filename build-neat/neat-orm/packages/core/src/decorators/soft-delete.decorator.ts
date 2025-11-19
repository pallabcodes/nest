/**
 * Soft Delete Decorators
 *
 * Provides decorators for enabling soft delete functionality on entities.
 * Soft deletes mark records as deleted instead of physically removing them from the database.
 *
 * @module decorators/soft-delete
 */

import { metadataScanner } from '../metadata/scanner.js';
import { SOFT_DELETE_METADATA_KEY } from '../metadata/keys.js';

/**
 * Options for soft delete configuration.
 */
export interface SoftDeleteOptions {
  /**
   * Column name for deleted flag.
   * Default: 'deleted_at'
   */
  columnName?: string;

  /**
   * Type of soft delete strategy.
   * 
   * - timestamp: Uses a timestamp column (deleted_at)
   * - boolean: Uses a boolean flag (is_deleted)
   * 
   * Default: 'timestamp'
   */
  type?: 'timestamp' | 'boolean';

  /**
   * Whether to include soft deleted records in queries by default.
   * Default: false
   */
  includeDeletedByDefault?: boolean;

  /**
   * Whether to permanently delete records when calling delete().
   * Default: false (soft delete enabled)
   */
  allowHardDelete?: boolean;

  /**
   * Custom value to use when soft deleting (for timestamp type).
   * Default: current timestamp
   */
  deletedValue?: () => Date | number | boolean | null;

  /**
   * Custom value to use when restoring (for timestamp type).
   * Default: null
   */
  restoredValue?: null | undefined | false;
}

/**
 * Metadata stored for soft delete configuration.
 */
export interface SoftDeleteMetadata {
  columnName: string;
  type: 'timestamp' | 'boolean';
  includeDeletedByDefault: boolean;
  allowHardDelete: boolean;
  deletedValue: () => Date | number | boolean | null;
  restoredValue: null | undefined | false;
}

/**
 * Mark an entity as supporting soft deletes.
 * 
 * This decorator enables soft delete functionality where records are marked as deleted
 * rather than being physically removed from the database.
 *
 * @param options - Soft delete configuration options
 *
 * @example
 * ```typescript
 * @Entity('users')
 * @SoftDelete()
 * class User {
 *   @PrimaryGeneratedColumn()
 *   id!: number;
 *
 *   @Column()
 *   name!: string;
 *
 *   @Column({ name: 'deleted_at', nullable: true })
 *   deletedAt?: Date;
 * }
 * ```
 *
 * @example
 * // Using boolean flag instead of timestamp
 * ```typescript
 * @Entity('products')
 * @SoftDelete({ type: 'boolean', columnName: 'is_deleted' })
 * class Product {
 *   @PrimaryGeneratedColumn()
 *   id!: number;
 *
 *   @Column()
 *   name!: string;
 *
 *   @Column({ name: 'is_deleted', default: false })
 *   isDeleted!: boolean;
 * }
 * ```
 */
export function SoftDelete(options?: SoftDeleteOptions): ClassDecorator {
  return (target: Function) => {
    const metadata: SoftDeleteMetadata = {
      columnName: options?.columnName || 'deleted_at',
      type: options?.type || 'timestamp',
      includeDeletedByDefault: options?.includeDeletedByDefault ?? false,
      allowHardDelete: options?.allowHardDelete ?? false,
      deletedValue: options?.deletedValue || (() => new Date()),
      restoredValue: options?.restoredValue ?? null,
    };

    metadataScanner.setMetadata(
      SOFT_DELETE_METADATA_KEY,
      metadata,
      target
    );
  };
}

/**
 * Check if an entity has soft delete enabled.
 *
 * @param entityClass - The entity class to check
 * @returns True if soft delete is enabled
 */
export function hasSoftDelete(entityClass: new () => unknown): boolean {
  const metadata = metadataScanner.getMetadata<SoftDeleteMetadata>(
    SOFT_DELETE_METADATA_KEY,
    entityClass
  );
  return metadata !== undefined;
}

/**
 * Get soft delete metadata for an entity.
 *
 * @param entityClass - The entity class
 * @returns Soft delete metadata or undefined
 */
export function getSoftDeleteMetadata(
  entityClass: new () => unknown
): SoftDeleteMetadata | undefined {
  return metadataScanner.getMetadata<SoftDeleteMetadata>(
    SOFT_DELETE_METADATA_KEY,
    entityClass
  );
}

/**
 * Mark a query to include soft deleted records.
 * 
 * This decorator can be applied to repository methods to automatically
 * include soft deleted records in query results.
 *
 * @example
 * ```typescript
 * class UserRepository extends BaseRepository<User> {
 *   @WithTrashed()
 *   async findAllIncludingDeleted(): Promise<User[]> {
 *     return this.find();
 *   }
 * }
 * ```
 */
export function WithTrashed(): MethodDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    metadataScanner.setMetadata(
      'neat-orm:with-trashed',
      true,
      target.constructor,
      propertyKey
    );
  };
}

/**
 * Mark a query to only return soft deleted records.
 * 
 * This decorator can be applied to repository methods to automatically
 * filter to only soft deleted records.
 *
 * @example
 * ```typescript
 * class UserRepository extends BaseRepository<User> {
 *   @OnlyTrashed()
 *   async findDeleted(): Promise<User[]> {
 *     return this.find();
 *   }
 * }
 * ```
 */
export function OnlyTrashed(): MethodDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    metadataScanner.setMetadata(
      'neat-orm:only-trashed',
      true,
      target.constructor,
      propertyKey
    );
  };
}

