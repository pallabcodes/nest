/**
 * NeatOrm - Conditional Types System
 *
 * Conditional types enable powerful type-level programming by allowing types
 * to be chosen based on compile-time conditions. This is essential for building
 * type-safe query builders with accurate result type inference.
 *
 * Key TypeScript Excellence Features:
 * - Type inference based on runtime values
 * - Distributive conditional types for union handling
 * - Recursive type definitions for complex transformations
 * - Pattern matching at the type level
 *
 * TypeScript Compilation:
 * Conditional types are evaluated during type checking and completely erased
 * at runtime. They enable sophisticated type inference without any JavaScript
 * code generation or runtime overhead.
 *
 * Runtime Behavior:
 * Conditional types exist purely at compile time. They guide type checking but
 * produce no runtime code, resulting in zero performance impact.
 *
 * Framework Integration:
 * Conditional types power NeatOrm's:
 * - Query result type inference from selected columns
 * - JOIN result type construction
 * - WHERE clause type validation
 * - Relationship loading type inference
 *
 * Pain Points Addressed:
 * - Inaccurate type inference in query builders
 * - Having to manually specify result types
 * - Loss of type information through transformations
 * - Complex union type handling
 *
 * Research:
 * Inspired by Scala's match types, Haskell's type families, and Rust's associated
 * types. Adapted to TypeScript's structural type system for maximum expressiveness
 * while maintaining practical usability.
 */

/**
 * Check if a type is never.
 * Useful for detecting impossible type conditions.
 *
 * @template T - The type to check
 * @returns true if T is never, false otherwise
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Check if a type is any.
 * Useful for detecting when type safety has been compromised.
 *
 * @template T - The type to check
 * @returns true if T is any, false otherwise
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Check if a type is unknown.
 * Useful for detecting untyped values that need refinement.
 *
 * @template T - The type to check
 * @returns true if T is unknown, false otherwise
 */
export type IsUnknown<T> = IsNever<T> extends false
  ? T extends unknown
    ? unknown extends T
      ? IsAny<T> extends false
        ? true
        : false
      : false
    : false
  : false;

/**
 * Check if a type extends another type.
 * More readable alias for conditional type checks.
 *
 * @template T - The type to check
 * @template U - The type to check against
 * @returns true if T extends U, false otherwise
 */
export type Extends<T, U> = T extends U ? true : false;

/**
 * Check if two types are exactly equal.
 * Uses a more sophisticated check than simple extends.
 *
 * @template T - First type
 * @template U - Second type
 * @returns true if T and U are exactly equal
 */
export type Equals<T, U> = (<G>() => G extends T ? 1 : 2) extends <
  G
>() => G extends U ? 1 : 2
  ? true
  : false;

/**
 * Return T if condition is true, F otherwise.
 * Simple ternary operation at the type level.
 *
 * @template Condition - The condition to check
 * @template T - Type to return if true
 * @template F - Type to return if false
 */
export type If<Condition extends boolean, T, F> = Condition extends true
  ? T
  : F;

/**
 * Extract the type of array elements.
 *
 * @template Arr - Array type
 * @returns The element type
 *
 * @example
 * ```typescript
 * type Numbers = ArrayElement<number[]>; // number
 * type Mixed = ArrayElement<(string | number)[]>; // string | number
 * ```
 */
export type ArrayElement<Arr> = Arr extends readonly (infer T)[] ? T : never;

/**
 * Extract the type of promise resolution.
 *
 * @template P - Promise type
 * @returns The resolved type
 *
 * @example
 * ```typescript
 * type Result = Awaited<Promise<number>>; // number
 * type Nested = Awaited<Promise<Promise<string>>>; // string
 * ```
 */
export type Awaited<P> = P extends Promise<infer T>
  ? T extends Promise<unknown>
    ? Awaited<T>
    : T
  : P;

/**
 * Make all properties of T optional if they are nullable.
 * Properties that are not nullable remain required.
 *
 * @template T - Object type
 * @returns Type with nullable properties optional
 *
 * @example
 * ```typescript
 * type User = {
 *   id: number;
 *   name: string;
 *   email: string | null;
 * };
 * type OptionalNullable = OptionalNullable<User>;
 * // { id: number; name: string; email?: string | null }
 * ```
 */
export type OptionalNullable<T> = {
  [K in keyof T as null extends T[K] ? K : never]?: T[K];
} & {
  [K in keyof T as null extends T[K] ? never : K]: T[K];
};

/**
 * Deep partial type that makes all properties optional recursively.
 *
 * @template T - Object type
 * @returns Type with all properties optional at all levels
 *
 * @example
 * ```typescript
 * type User = {
 *   profile: {
 *     name: string;
 *     age: number;
 *   };
 * };
 * type PartialUser = DeepPartial<User>;
 * // { profile?: { name?: string; age?: number } }
 * ```
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Deep readonly type that makes all properties readonly recursively.
 *
 * @template T - Object type
 * @returns Type with all properties readonly at all levels
 */
export type DeepReadonly<T> = T extends object
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : T;

/**
 * Extract keys from T where the value type extends U.
 *
 * @template T - Object type
 * @template U - Value type to filter by
 * @returns Union of keys where T[K] extends U
 *
 * @example
 * ```typescript
 * type User = {
 *   id: number;
 *   name: string;
 *   age: number;
 * };
 * type NumberKeys = KeysOfType<User, number>; // 'id' | 'age'
 * ```
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Pick properties from T where the value type extends U.
 *
 * @template T - Object type
 * @template U - Value type to filter by
 * @returns Object with only properties of type U
 *
 * @example
 * ```typescript
 * type User = {
 *   id: number;
 *   name: string;
 *   age: number;
 * };
 * type NumberProps = PickByType<User, number>;
 * // { id: number; age: number }
 * ```
 */
export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>;

/**
 * Omit properties from T where the value type extends U.
 *
 * @template T - Object type
 * @template U - Value type to filter out
 * @returns Object without properties of type U
 */
export type OmitByType<T, U> = Omit<T, KeysOfType<T, U>>;

/**
 * Extract non-nullable type.
 * More explicit than NonNullable built-in.
 *
 * @template T - Type to make non-nullable
 * @returns T without null or undefined
 */
export type NotNullable<T> = Exclude<T, null | undefined>;

/**
 * Make specified keys required.
 *
 * @template T - Object type
 * @template K - Keys to make required
 * @returns Object with specified keys required
 *
 * @example
 * ```typescript
 * type User = {
 *   id?: number;
 *   name?: string;
 *   email?: string;
 * };
 * type RequiredIdAndName = RequireKeys<User, 'id' | 'name'>;
 * // { id: number; name: string; email?: string }
 * ```
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specified keys optional.
 *
 * @template T - Object type
 * @template K - Keys to make optional
 * @returns Object with specified keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Merge two object types, with properties from B overriding A.
 *
 * @template A - First object type
 * @template B - Second object type
 * @returns Merged type with B's properties taking precedence
 *
 * @example
 * ```typescript
 * type A = { a: string; b: number };
 * type B = { b: string; c: boolean };
 * type Merged = Merge<A, B>;
 * // { a: string; b: string; c: boolean }
 * ```
 */
export type Merge<A, B> = Omit<A, keyof B> & B;

/**
 * Flatten a nested intersection type into a simple object type.
 * Makes complex types more readable in IDE tooltips.
 *
 * @template T - Type to flatten
 * @returns Flattened object type
 *
 * @example
 * ```typescript
 * type Complex = { a: string } & { b: number } & { c: boolean };
 * type Simple = Flatten<Complex>;
 * // { a: string; b: number; c: boolean }
 * ```
 */
export type Flatten<T> = T extends object
  ? {
      [K in keyof T]: T[K];
    }
  : T;

/**
 * Get the keys of T that are not in U.
 *
 * @template T - Object type
 * @template U - Object type
 * @returns Keys in T but not in U
 */
export type DiffKeys<T, U> = Exclude<keyof T, keyof U>;

/**
 * Get the keys that are common between T and U.
 *
 * @template T - Object type
 * @template U - Object type
 * @returns Keys present in both T and U
 */
export type CommonKeys<T, U> = Extract<keyof T, keyof U>;

/**
 * Example Usage:
 *
 * ```typescript
 * // Type-level conditionals
 * type Check1 = Equals<string, string>; // true
 * type Check2 = Equals<string, number>; // false
 *
 * // Filtering object properties
 * type User = {
 *   id: number;
 *   name: string;
 *   age: number;
 *   isActive: boolean;
 * };
 *
 * type NumberProps = PickByType<User, number>;
 * // { id: number; age: number }
 *
 * type StringProps = PickByType<User, string>;
 * // { name: string }
 *
 * // Making properties optional/required
 * type PartialUser = OptionalKeys<User, 'age' | 'isActive'>;
 * // { id: number; name: string; age?: number; isActive?: boolean }
 *
 * type RequiredUser = RequireKeys<Partial<User>, 'id'>;
 * // { id: number; name?: string; age?: number; isActive?: boolean }
 * ```
 */

