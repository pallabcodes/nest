/**
 * Database Index Decorators
 *
 * Provides decorators for defining database indexes on entities.
 * Supports single column, composite, unique, partial, and full-text indexes.
 *
 * @module decorators/index
 */

import { metadataScanner } from '../metadata/scanner.js';
import { INDEX_METADATA_KEY } from '../metadata/keys.js';

/**
 * Index type enumeration.
 */
export type IndexType = 
  | 'btree'    // B-tree index (default, good for equality and range queries)
  | 'hash'     // Hash index (good for equality comparisons)
  | 'gist'     // Generalized Search Tree (PostgreSQL, for geometric/full-text)
  | 'gin'      // Generalized Inverted Index (PostgreSQL, for arrays/full-text)
  | 'brin'     // Block Range Index (PostgreSQL, for large tables)
  | 'fulltext' // Full-text index (MySQL)
  | 'spatial'; // Spatial index (MySQL)

/**
 * Index options for defining database indexes.
 */
export interface IndexOptions {
  /**
   * Index name. If not provided, will be auto-generated.
   */
  name?: string;

  /**
   * Columns to include in the index.
   * For composite indexes, order matters.
   */
  columns?: string[];

  /**
   * Whether the index should enforce uniqueness.
   * Default: false
   */
  unique?: boolean;

  /**
   * Index type/method.
   * Default: 'btree'
   */
  type?: IndexType;

  /**
   * WHERE clause for partial index.
   * Only rows matching this condition will be indexed.
   * 
   * @example 'status = "active"'
   * @example 'deleted_at IS NULL'
   */
  where?: string;

  /**
   * Whether index creation should be concurrent (no table lock).
   * PostgreSQL only.
   * Default: false
   */
  concurrent?: boolean;

  /**
   * Custom SQL expression for functional/expression indexes.
   * 
   * @example 'LOWER(email)'
   * @example 'created_at::date'
   */
  expression?: string;

  /**
   * Sort order for index columns.
   * Only applicable for btree indexes.
   */
  order?: 'ASC' | 'DESC';

  /**
   * NULL sorting order.
   * Only applicable for btree indexes.
   */
  nulls?: 'FIRST' | 'LAST';

  /**
   * Include columns (covering index).
   * PostgreSQL 11+ only.
   * These columns are included in the index but not part of the key.
   */
  include?: string[];

  /**
   * Index storage parameters.
   * Database-specific options.
   * 
   * @example { fillfactor: 70 }
   */
  storageParameters?: Record<string, unknown>;

  /**
   * Tablespace for the index.
   * Database-specific.
   */
  tablespace?: string;

  /**
   * Custom comment for the index.
   */
  comment?: string;
}

/**
 * Metadata stored for an index.
 */
export interface IndexMetadata extends Required<Omit<IndexOptions, 'name' | 'where' | 'concurrent' | 'expression' | 'include' | 'storageParameters' | 'tablespace' | 'comment'>> {
  name: string;
  columns: string[];
  where?: string;
  concurrent: boolean;
  expression?: string;
  include?: string[];
  storageParameters?: Record<string, unknown>;
  tablespace?: string;
  comment?: string;
}

/**
 * Define a database index on an entity.
 * Can be used on class or property level.
 *
 * @param options - Index configuration options
 *
 * @example
 * // Single column index
 * ```typescript
 * @Entity('users')
 * class User {
 *   @Column()
 *   @Index()
 *   email!: string;
 * }
 * ```
 *
 * @example
 * // Unique index
 * ```typescript
 * @Entity('users')
 * class User {
 *   @Column()
 *   @Index({ unique: true })
 *   email!: string;
 * }
 * ```
 *
 * @example
 * // Composite index (class-level)
 * ```typescript
 * @Entity('users')
 * @Index({ columns: ['firstName', 'lastName'] })
 * class User {
 *   @Column()
 *   firstName!: string;
 *
 *   @Column()
 *   lastName!: string;
 * }
 * ```
 *
 * @example
 * // Partial index
 * ```typescript
 * @Entity('users')
 * @Index({ 
 *   columns: ['email'], 
 *   where: 'deleted_at IS NULL',
 *   name: 'idx_active_users_email'
 * })
 * class User {
 *   @Column()
 *   email!: string;
 *
 *   @Column({ nullable: true })
 *   deletedAt?: Date;
 * }
 * ```
 *
 * @example
 * // Full-text index
 * ```typescript
 * @Entity('articles')
 * @Index({ 
 *   columns: ['title', 'content'], 
 *   type: 'fulltext',
 *   name: 'idx_articles_fulltext'
 * })
 * class Article {
 *   @Column()
 *   title!: string;
 *
 *   @Column()
 *   content!: string;
 * }
 * ```
 *
 * @example
 * // Expression index
 * ```typescript
 * @Entity('users')
 * @Index({ 
 *   expression: 'LOWER(email)',
 *   name: 'idx_users_email_lower'
 * })
 * class User {
 *   @Column()
 *   email!: string;
 * }
 * ```
 */
export function Index(options?: IndexOptions): PropertyDecorator & ClassDecorator {
  return (target: Object | Function, propertyKey?: string | symbol) => {
    const isPropertyDecorator = typeof propertyKey !== 'undefined';
    const targetClass = isPropertyDecorator ? target.constructor : target;

    // Get existing indexes
    const existingIndexes = metadataScanner.getMetadata<IndexMetadata[]>(
      INDEX_METADATA_KEY,
      targetClass
    ) || [];

    // Build index metadata
    const indexMetadata: IndexMetadata = {
      name: options?.name || generateIndexName(targetClass as Function, options, propertyKey),
      columns: isPropertyDecorator 
        ? [String(propertyKey)] 
        : (options?.columns || []),
      unique: options?.unique ?? false,
      type: options?.type || 'btree',
      where: options?.where,
      concurrent: options?.concurrent ?? false,
      expression: options?.expression,
      order: options?.order || 'ASC',
      nulls: options?.nulls || 'LAST',
      include: options?.include,
      storageParameters: options?.storageParameters,
      tablespace: options?.tablespace,
      comment: options?.comment,
    };

    // Validate index metadata
    validateIndexMetadata(indexMetadata);

    // Add to indexes array
    existingIndexes.push(indexMetadata);

    // Store metadata
    metadataScanner.setMetadata(
      INDEX_METADATA_KEY,
      existingIndexes,
      targetClass
    );
  };
}

/**
 * Generate a default index name based on table, columns, and type.
 *
 * @private
 */
function generateIndexName(
  target: Function,
  options?: IndexOptions,
  propertyKey?: string | symbol
): string {
  const tableName = target.name.toLowerCase();
  
  let columns: string[];
  if (options?.expression) {
    columns = ['expr'];
  } else if (propertyKey) {
    columns = [String(propertyKey)];
  } else {
    columns = options?.columns || [];
  }

  const columnsPart = columns.join('_');
  const uniquePart = options?.unique ? 'unique_' : '';
  const typePart = options?.type && options.type !== 'btree' ? `_${options.type}` : '';

  return `idx_${uniquePart}${tableName}_${columnsPart}${typePart}`;
}

/**
 * Validate index metadata for common issues.
 *
 * @private
 */
function validateIndexMetadata(metadata: IndexMetadata): void {
  // Must have either columns or expression
  if (metadata.columns.length === 0 && !metadata.expression) {
    throw new Error(
      `Index '${metadata.name}' must specify either columns or expression`
    );
  }

  // Cannot have both columns and expression
  if (metadata.columns.length > 0 && metadata.expression) {
    throw new Error(
      `Index '${metadata.name}' cannot specify both columns and expression`
    );
  }

  // Validate type-specific requirements
  if (metadata.type === 'hash' && metadata.columns.length > 1) {
    throw new Error(
      `Hash index '${metadata.name}' can only have a single column`
    );
  }

  // Validate partial index
  if (metadata.where && (metadata.type === 'hash' || metadata.type === 'fulltext')) {
    throw new Error(
      `Partial indexes (WHERE clause) are not supported with ${metadata.type} indexes`
    );
  }
}

/**
 * Get all indexes defined on an entity.
 *
 * @param entityClass - The entity class
 * @returns Array of index metadata
 */
export function getEntityIndexes(entityClass: new () => unknown): IndexMetadata[] {
  return metadataScanner.getMetadata<IndexMetadata[]>(
    INDEX_METADATA_KEY,
    entityClass
  ) || [];
}

/**
 * Check if an entity has any indexes defined.
 *
 * @param entityClass - The entity class
 * @returns True if entity has indexes
 */
export function hasIndexes(entityClass: new () => unknown): boolean {
  const indexes = getEntityIndexes(entityClass);
  return indexes.length > 0;
}

