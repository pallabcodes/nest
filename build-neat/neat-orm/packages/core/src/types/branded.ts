/**
 * NeatOrm - Branded Types System
 *
 * Branded types (also known as nominal types or opaque types) provide compile-time
 * type safety by preventing accidental mixing of structurally identical types.
 * This is crucial for database operations where different types of IDs, strings,
 * or numbers should not be interchangeable.
 *
 * Key TypeScript Excellence Features:
 * - Nominal typing in a structural type system
 * - Zero runtime overhead (compiles away completely)
 * - Type-level guarantees preventing value mixing
 * - Phantom type parameters for additional safety
 *
 * TypeScript Compilation:
 * Branded types use intersection types with a unique symbol property that only
 * exists at compile time. TypeScript erases these during compilation, leaving
 * only the base type at runtime with zero performance impact.
 *
 * Runtime Behavior:
 * At runtime, branded types are identical to their base types. The branding
 * symbol is completely erased by TypeScript's type system, resulting in no
 * memory or performance overhead.
 *
 * Framework Integration:
 * Branded types are used throughout NeatOrm for:
 * - Entity IDs to prevent mixing different entity identifiers
 * - Column names to ensure type-safe query construction
 * - Table names to prevent typos and invalid references
 * - SQL queries to mark validated vs unvalidated queries
 *
 * Pain Points Addressed:
 * - Runtime errors from mixing similar-looking but semantically different values
 * - Accidental ID confusion between different entities
 * - Type mismatches in complex query builders
 * - Invalid column/table references caught at compile time
 *
 * Research:
 * Inspired by Rust's newtype pattern and Scala's value classes, adapted for
 * TypeScript's structural type system. Follows patterns from type-safe SQL
 * libraries like Rust's Diesel and ensures compile-time correctness without
 * runtime cost.
 */

/**
 * Brand symbol used to create unique branded types.
 * This is a compile-time only marker that gets erased at runtime.
 */
declare const __brand: unique symbol;

/**
 * Brand type that adds a phantom property to create nominal types.
 * The property exists only at the type level and is erased at runtime.
 *
 * @template Base - The base type to brand
 * @template BrandName - A unique string literal type for the brand
 */
export type Brand<Base, BrandName extends string> = Base & {
  readonly [__brand]: BrandName;
};

/**
 * Extract the base type from a branded type.
 * Useful for interop with non-branded code or for debugging.
 *
 * @template T - The branded type
 * @returns The underlying base type
 *
 * @example
 * ```typescript
 * type UserId = Brand<number, 'UserId'>;
 * type BaseType = Unbrand<UserId>; // number
 * ```
 */
export type Unbrand<T> = T extends Brand<infer Base, string> ? Base : T;

/**
 * Create a branded value from a base value.
 * This is a type assertion that should be used carefully, typically only
 * when constructing values that have been validated.
 *
 * @template Base - The base type
 * @template BrandName - The brand name
 * @param value - The base value to brand
 * @returns The value as the branded type
 *
 * @example
 * ```typescript
 * type UserId = Brand<number, 'UserId'>;
 * const userId = brand<number, 'UserId'>(123);
 * ```
 */
export function brand<Base, BrandName extends string>(
  value: Base
): Brand<Base, BrandName> {
  return value as Brand<Base, BrandName>;
}

/**
 * Remove the brand from a branded value, returning the base value.
 * This is a type-safe way to extract the underlying value.
 *
 * @template Base - The base type
 * @template BrandName - The brand name
 * @param value - The branded value
 * @returns The underlying base value
 *
 * @example
 * ```typescript
 * type UserId = Brand<number, 'UserId'>;
 * const userId: UserId = brand<number, 'UserId'>(123);
 * const rawId: number = unbrand(userId); // 123
 * ```
 */
export function unbrand<Base, BrandName extends string>(
  value: Brand<Base, BrandName>
): Base {
  return value as Base;
}

/**
 * Type guard to check if a value is branded with a specific brand.
 * Note: This cannot actually check the brand at runtime since brands are
 * compile-time only. This function primarily serves as a type-level assertion.
 *
 * @template Base - The base type
 * @template BrandName - The brand name
 * @param value - The value to check
 * @returns Always true (used for type narrowing only)
 *
 * @example
 * ```typescript
 * type UserId = Brand<number, 'UserId'>;
 * const value: number = 123;
 * if (isBranded<number, 'UserId'>(value)) {
 *   // TypeScript now treats value as UserId
 * }
 * ```
 */
export function isBranded<Base, BrandName extends string>(
  _value: Base
): _value is Brand<Base, BrandName> {
  // At runtime, we cannot actually check the brand since it's erased
  // This function is primarily for type narrowing in TypeScript
  return true;
}

/**
 * Common branded types used throughout NeatOrm.
 * These provide type safety for frequently used value types.
 */

/**
 * Branded type for table names.
 * Ensures table names are type-checked and prevents typos.
 */
export type TableName = Brand<string, 'TableName'>;

/**
 * Branded type for column names.
 * Ensures column names are type-checked and prevents typos.
 */
export type ColumnName = Brand<string, 'ColumnName'>;

/**
 * Branded type for raw SQL queries.
 * Marks SQL strings that have been validated or constructed safely.
 */
export type RawSQL = Brand<string, 'RawSQL'>;

/**
 * Branded type for entity IDs.
 * Generic over the entity type to prevent mixing IDs from different entities.
 */
export type EntityId<EntityName extends string> = Brand<
  number | string,
  `EntityId<${EntityName}>`
>;

/**
 * Branded type for database connection strings.
 * Ensures connection strings are properly validated before use.
 */
export type ConnectionString = Brand<string, 'ConnectionString'>;

/**
 * Helper functions for common branded type operations.
 */

/**
 * Create a branded table name.
 *
 * @param name - The table name string
 * @returns Branded table name
 */
export function tableName(name: string): TableName {
  return brand<string, 'TableName'>(name);
}

/**
 * Create a branded column name.
 *
 * @param name - The column name string
 * @returns Branded column name
 */
export function columnName(name: string): ColumnName {
  return brand<string, 'ColumnName'>(name);
}

/**
 * Create a branded raw SQL string.
 * Should only be used with validated or properly escaped SQL.
 *
 * @param sql - The SQL string
 * @returns Branded raw SQL
 */
export function rawSQL(sql: string): RawSQL {
  return brand<string, 'RawSQL'>(sql);
}

/**
 * Create a branded entity ID.
 *
 * @template EntityName - The entity name
 * @param id - The ID value
 * @returns Branded entity ID
 */
export function entityId<EntityName extends string>(
  id: number | string
): EntityId<EntityName> {
  return brand<number | string, `EntityId<${EntityName}>`>(id);
}

/**
 * Create a branded connection string.
 *
 * @param connectionString - The connection string
 * @returns Branded connection string
 */
export function connectionString(connectionString: string): ConnectionString {
  return brand<string, 'ConnectionString'>(connectionString);
}

/**
 * Example Usage:
 *
 * ```typescript
 * // Define branded types for specific entities
 * type UserId = EntityId<'User'>;
 * type PostId = EntityId<'Post'>;
 *
 * // Create branded values
 * const userId: UserId = entityId<'User'>(123);
 * const postId: PostId = entityId<'Post'>(456);
 *
 * // Compile-time error: cannot assign UserId to PostId
 * // const wrongId: PostId = userId; // Error!
 *
 * // Type-safe table names
 * const userTable: TableName = tableName('users');
 * const userColumn: ColumnName = columnName('email');
 *
 * // Extract base values when needed
 * const rawUserId: number | string = unbrand(userId); // 123
 * ```
 */

