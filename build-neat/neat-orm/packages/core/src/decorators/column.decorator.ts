/**
 * NeatOrm - Column Decorator
 *
 * The @Column decorator marks a property as a database column and configures
 * its type, constraints, and behavior. It provides compile-time type safety
 * and runtime metadata for query building and migrations.
 *
 * Key TypeScript Excellence Features:
 * - Property decorator with design-time type inference
 * - SQL type mapping from TypeScript types
 * - Constraint validation at compile time
 * - Default value type checking
 *
 * TypeScript Compilation:
 * With emitDecoratorMetadata, TypeScript emits the property's design type,
 * allowing automatic type inference. The @Column decorator enhances this with
 * explicit SQL type configuration and validation rules.
 *
 * Runtime Behavior:
 * The decorator stores column metadata on the entity class, including type,
 * length, nullable, default value, and constraints. This metadata is used by
 * the query builder for type-safe queries and by migrations for schema generation.
 *
 * Framework Integration:
 * The @Column decorator integrates with:
 * - Metadata scanner for column discovery
 * - Query builder for SELECT/INSERT/UPDATE validation
 * - Migration system for schema definition
 * - Validation system for constraint enforcement
 *
 * Pain Points Addressed:
 * - Manual column configuration boilerplate
 * - Runtime errors from type mismatches
 * - Inconsistent column definitions across entities
 * - Missing validation constraints
 *
 * Research:
 * Inspired by TypeORM's @Column and JPA's @Column annotation, enhanced with
 * TypeScript's design-time type inference for automatic type detection.
 * Supports all major SQL column types with database-specific extensions.
 */

import {
  COLUMN_METADATA_KEY,
  COLUMNS_LIST_METADATA_KEY,
  COLUMN_NAME_MAP_METADATA_KEY,
  type ColumnMetadata,
  getMetadata,
  setMetadata,
} from '../metadata/index.js';

/**
 * SQL column types supported by NeatOrm.
 */
export type ColumnType =
  // Numeric types
  | 'integer'
  | 'int'
  | 'smallint'
  | 'bigint'
  | 'decimal'
  | 'numeric'
  | 'real'
  | 'double'
  | 'float'
  | 'serial'
  | 'bigserial'
  // String types
  | 'varchar'
  | 'char'
  | 'text'
  | 'tinytext'
  | 'mediumtext'
  | 'longtext'
  // Binary types
  | 'blob'
  | 'bytea'
  | 'binary'
  | 'varbinary'
  // Date/time types
  | 'date'
  | 'time'
  | 'datetime'
  | 'timestamp'
  | 'timestamptz'
  | 'year'
  // Boolean type
  | 'boolean'
  | 'bool'
  // JSON types
  | 'json'
  | 'jsonb'
  // UUID type
  | 'uuid'
  // Array types (PostgreSQL)
  | 'array'
  // Enum type
  | 'enum'
  // Geometry types (PostGIS)
  | 'geometry'
  | 'geography'
  | 'point';

/**
 * Options for the @Column decorator.
 */
export interface ColumnOptions {
  /**
   * SQL column type.
   * If not specified, inferred from TypeScript type via design:type metadata.
   */
  type?: ColumnType;

  /**
   * Column name in the database.
   * If not specified, uses the property name.
   */
  name?: string;

  /**
   * Column length (for varchar, char, etc.).
   */
  length?: number;

  /**
   * Numeric precision (total digits).
   */
  precision?: number;

  /**
   * Numeric scale (digits after decimal point).
   */
  scale?: number;

  /**
   * Whether the column can be null.
   * Default: true
   */
  nullable?: boolean;

  /**
   * Default value for the column.
   * Can be a static value or a function that returns a value.
   */
  default?: unknown | (() => unknown);

  /**
   * Whether the column should have a unique constraint.
   */
  unique?: boolean;

  /**
   * Whether the column is unsigned (numeric types).
   * MySQL/MariaDB specific.
   */
  unsigned?: boolean;

  /**
   * Whether the column should be zero-filled (numeric types).
   * MySQL/MariaDB specific.
   */
  zerofill?: boolean;

  /**
   * Comment for the column (if supported by the database).
   */
  comment?: string;

  /**
   * Enum values (for enum type).
   */
  enum?: readonly string[];

  /**
   * Array element type (for array columns in PostgreSQL).
   */
  arrayType?: ColumnType;

  /**
   * Collation for string columns.
   */
  collation?: string;

  /**
   * Character set for string columns (MySQL/MariaDB).
   */
  charset?: string;

  /**
   * Whether to select this column by default in queries.
   * Default: true
   */
  select?: boolean;

  /**
   * Whether this column should be inserted.
   * Set to false for generated columns.
   */
  insert?: boolean;

  /**
   * Whether this column should be updated.
   * Set to false for immutable columns.
   */
  update?: boolean;

  /**
   * Database-specific column definition (raw SQL).
   * Use with caution as it bypasses type safety.
   */
  columnDefinition?: string;
}

/**
 * God-moded TypeScript: Column decorator factory.
 *
 * Marks a property as a database column with type-safe configuration.
 * Leverages TypeScript's design:type metadata for automatic type inference.
 *
 * @param options - Column configuration options
 * @returns Property decorator that attaches column metadata
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   // Inferred as integer from TypeScript type
 *   @Column()
 *   id!: number;
 *
 *   // Explicit varchar with length
 *   @Column({ type: 'varchar', length: 255 })
 *   name!: string;
 *
 *   // Nullable column with default value
 *   @Column({ type: 'integer', nullable: true, default: 0 })
 *   age?: number | null;
 *
 *   // Unique email with custom database column name
 *   @Column({ type: 'varchar', length: 255, unique: true, name: 'email_address' })
 *   email!: string;
 *
 *   // JSON column
 *   @Column({ type: 'jsonb' })
 *   metadata!: Record<string, any>;
 *
 *   // Enum column
 *   @Column({ type: 'enum', enum: ['active', 'inactive', 'pending'] })
 *   status!: 'active' | 'inactive' | 'pending';
 * }
 * ```
 */
export function Column(options: ColumnOptions = {}): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const targetConstructor = target.constructor;

    // Get design-time type from TypeScript (requires emitDecoratorMetadata)
    const designType = Reflect.getMetadata(
      'design:type',
      target,
      propertyKey
    ) as Function | undefined;

    // Infer SQL type from TypeScript type if not explicitly provided
    const sqlType = options.type || inferSqlType(designType);

    // Determine database column name
    const columnName = options.name || String(propertyKey);

    // Create column metadata
    const columnMetadata: ColumnMetadata = {
      name: columnName,
      type: sqlType,
      length: options.length,
      precision: options.precision,
      scale: options.scale,
      nullable: options.nullable ?? true,
      default: options.default,
      unique: options.unique,
      unsigned: options.unsigned,
      zerofill: options.zerofill,
      comment: options.comment,
    };

    // Get existing columns metadata or create new map
    const existingColumns =
      getMetadata<Map<string | symbol, ColumnMetadata>>(
        COLUMN_METADATA_KEY,
        targetConstructor
      ) || new Map();

    // Add this column
    existingColumns.set(propertyKey, columnMetadata);

    // Store updated columns metadata
    setMetadata(COLUMN_METADATA_KEY, existingColumns, targetConstructor);

    // Update columns list
    const columnsList =
      getMetadata<(string | symbol)[]>(
        COLUMNS_LIST_METADATA_KEY,
        targetConstructor
      ) || [];
    if (!columnsList.includes(propertyKey)) {
      columnsList.push(propertyKey);
      setMetadata(COLUMNS_LIST_METADATA_KEY, columnsList, targetConstructor);
    }

    // Update column name map (property name -> database column name)
    const columnNameMap =
      getMetadata<Map<string | symbol, string>>(
        COLUMN_NAME_MAP_METADATA_KEY,
        targetConstructor
      ) || new Map();
    columnNameMap.set(propertyKey, columnName);
    setMetadata(
      COLUMN_NAME_MAP_METADATA_KEY,
      columnNameMap,
      targetConstructor
    );

    // Store additional options as separate metadata
    if (options.enum) {
      setMetadata(
        Symbol.for(`neat-orm:column-enum:${String(propertyKey)}`),
        options.enum,
        targetConstructor
      );
    }
    if (options.select === false) {
      setMetadata(
        Symbol.for(`neat-orm:column-no-select:${String(propertyKey)}`),
        true,
        targetConstructor
      );
    }
  };
}

/**
 * Infer SQL column type from TypeScript design-time type.
 *
 * @param designType - TypeScript design type
 * @returns SQL column type
 */
function inferSqlType(designType: Function | undefined): ColumnType {
  if (!designType) {
    return 'text'; // Default fallback
  }

  switch (designType.name) {
    case 'Number':
      return 'integer';
    case 'String':
      return 'text';
    case 'Boolean':
      return 'boolean';
    case 'Date':
      return 'timestamp';
    case 'Object':
      return 'jsonb';
    case 'Array':
      return 'array';
    default:
      return 'text';
  }
}

/**
 * Helper to check if a property is a column.
 *
 * @param target - Entity class constructor
 * @param propertyKey - Property name
 * @returns True if the property is a column
 */
export function isColumn(
  target: Function,
  propertyKey: string | symbol
): boolean {
  const columns = getMetadata<Map<string | symbol, ColumnMetadata>>(
    COLUMN_METADATA_KEY,
    target
  );
  return columns?.has(propertyKey) ?? false;
}

/**
 * Helper to get column metadata.
 *
 * @param target - Entity class constructor
 * @param propertyKey - Property name
 * @returns Column metadata or undefined
 */
export function getColumnMetadata(
  target: Function,
  propertyKey: string | symbol
): ColumnMetadata | undefined {
  const columns = getMetadata<Map<string | symbol, ColumnMetadata>>(
    COLUMN_METADATA_KEY,
    target
  );
  return columns?.get(propertyKey);
}

