/**
 * NeatOrm - Template Literal Types System
 *
 * Template literal types enable sophisticated string manipulation at the type
 * level, crucial for building type-safe SQL query builders with column/table
 * name validation and qualified name handling.
 *
 * Key TypeScript Excellence Features:
 * - String pattern matching at the type level
 * - Type-safe string transformations (camelCase, snake_case, etc.)
 * - Qualified name handling (table.column)
 * - SQL keyword validation
 *
 * TypeScript Compilation:
 * Template literal types are evaluated during type checking and produce no
 * runtime code. They enable compile-time string validation without any
 * performance impact.
 *
 * Runtime Behavior:
 * Template literal types exist purely at compile time. String values pass
 * through unchanged at runtime, with zero overhead from type checking.
 *
 * Framework Integration:
 * Template literal types power NeatOrm's:
 * - Column name validation (users.id, posts.title)
 * - Join condition parsing
 * - ORDER BY/GROUP BY validation
 * - Alias handling
 *
 * Pain Points Addressed:
 * - Typos in column names caught at compile time
 * - Invalid qualified names (wrong.table.column)
 * - Incorrect join syntax
 * - Missing or duplicate aliases
 *
 * Research:
 * Inspired by TypeScript 4.1+ template literal type features, extended with
 * recursive patterns for complex string parsing. Follows patterns from type-safe
 * SQL libraries like Kysely and provides superior IDE autocomplete.
 */

/**
 * Split a string type by a delimiter.
 *
 * @template S - String to split
 * @template Delimiter - Delimiter string
 * @returns Tuple of split parts
 *
 * @example
 * ```typescript
 * type Parts = Split<'users.id', '.'>; // ['users', 'id']
 * type CSV = Split<'a,b,c', ','>; // ['a', 'b', 'c']
 * ```
 */
export type Split<
  S extends string,
  Delimiter extends string
> = S extends `${infer First}${Delimiter}${infer Rest}`
  ? [First, ...Split<Rest, Delimiter>]
  : S extends ''
  ? []
  : [S];

/**
 * Join a tuple of strings with a delimiter.
 *
 * @template Parts - Tuple of strings
 * @template Delimiter - Delimiter string
 * @returns Joined string
 *
 * @example
 * ```typescript
 * type Joined = Join<['users', 'id'], '.'>; // 'users.id'
 * type CSV = Join<['a', 'b', 'c'], ','>; // 'a,b,c'
 * ```
 */
export type Join<
  Parts extends readonly string[],
  Delimiter extends string
> = Parts extends readonly [infer First extends string, ...infer Rest]
  ? Rest extends readonly string[]
    ? `${First}${Rest['length'] extends 0 ? '' : Delimiter}${Join<
        Rest,
        Delimiter
      >}`
    : First
  : '';

/**
 * Extract the table name from a qualified column name.
 *
 * @template QualifiedName - Qualified name (table.column)
 * @returns Table name
 *
 * @example
 * ```typescript
 * type Table = ExtractTable<'users.id'>; // 'users'
 * type NoTable = ExtractTable<'id'>; // never
 * ```
 */
export type ExtractTable<QualifiedName extends string> =
  QualifiedName extends `${infer Table}.${string}` ? Table : never;

/**
 * Extract the column name from a qualified column name.
 *
 * @template QualifiedName - Qualified name (table.column)
 * @returns Column name
 *
 * @example
 * ```typescript
 * type Column = ExtractColumn<'users.id'>; // 'id'
 * type Plain = ExtractColumn<'id'>; // 'id'
 * ```
 */
export type ExtractColumn<QualifiedName extends string> =
  QualifiedName extends `${string}.${infer Column}` ? Column : QualifiedName;

/**
 * Check if a string is a qualified name (contains a dot).
 *
 * @template S - String to check
 * @returns true if qualified, false otherwise
 *
 * @example
 * ```typescript
 * type Is1 = IsQualified<'users.id'>; // true
 * type Is2 = IsQualified<'id'>; // false
 * ```
 */
export type IsQualified<S extends string> = S extends `${string}.${string}`
  ? true
  : false;

/**
 * Qualify a column name with a table name.
 *
 * @template Table - Table name
 * @template Column - Column name
 * @returns Qualified name (table.column)
 *
 * @example
 * ```typescript
 * type Qualified = Qualify<'users', 'id'>; // 'users.id'
 * ```
 */
export type Qualify<
  Table extends string,
  Column extends string
> = `${Table}.${Column}`;

/**
 * Convert a string to camelCase.
 *
 * @template S - String to convert
 * @returns camelCase string
 *
 * @example
 * ```typescript
 * type Camel = ToCamelCase<'user_name'>; // 'userName'
 * type AlreadyCamel = ToCamelCase<'userName'>; // 'userName'
 * ```
 */
export type ToCamelCase<S extends string> =
  S extends `${infer First}_${infer Rest}`
    ? `${Lowercase<First>}${Capitalize<ToCamelCase<Rest>>}`
    : Lowercase<S>;

/**
 * Convert a string to snake_case.
 *
 * @template S - String to convert
 * @returns snake_case string
 *
 * @example
 * ```typescript
 * type Snake = ToSnakeCase<'userName'>; // 'user_name'
 * type AlreadySnake = ToSnakeCase<'user_name'>; // 'user_name'
 * ```
 */
export type ToSnakeCase<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? First extends Uppercase<First>
      ? `_${Lowercase<First>}${ToSnakeCase<Rest>}`
      : `${First}${ToSnakeCase<Rest>}`
    : S;

/**
 * Convert a string to PascalCase.
 *
 * @template S - String to convert
 * @returns PascalCase string
 *
 * @example
 * ```typescript
 * type Pascal = ToPascalCase<'user_name'>; // 'UserName'
 * ```
 */
export type ToPascalCase<S extends string> = Capitalize<ToCamelCase<S>>;

/**
 * Extract alias from a string with AS keyword.
 *
 * @template S - String with potential alias (e.g., 'column AS alias')
 * @returns Alias or original string
 *
 * @example
 * ```typescript
 * type Alias1 = ExtractAlias<'id AS userId'>; // 'userId'
 * type Alias2 = ExtractAlias<'id'>; // 'id'
 * ```
 */
export type ExtractAlias<S extends string> =
  S extends `${string} AS ${infer Alias}`
    ? Alias
    : S extends `${string} as ${infer Alias}`
    ? Alias
    : ExtractColumn<S>;

/**
 * Check if a string contains an alias.
 *
 * @template S - String to check
 * @returns true if contains alias, false otherwise
 */
export type HasAlias<S extends string> =
  S extends `${string} AS ${string}` | `${string} as ${string}` ? true : false;

/**
 * Remove alias from a string.
 *
 * @template S - String with potential alias
 * @returns String without alias
 *
 * @example
 * ```typescript
 * type NoAlias = RemoveAlias<'id AS userId'>; // 'id'
 * type Plain = RemoveAlias<'id'>; // 'id'
 * ```
 */
export type RemoveAlias<S extends string> =
  S extends `${infer Column} AS ${string}`
    ? Column
    : S extends `${infer Column} as ${string}`
    ? Column
    : S;

/**
 * Trim whitespace from a string.
 *
 * @template S - String to trim
 * @returns Trimmed string
 *
 * @example
 * ```typescript
 * type Trimmed = Trim<'  hello  '>; // 'hello'
 * ```
 */
export type Trim<S extends string> = S extends ` ${infer Rest}`
  ? Trim<Rest>
  : S extends `${infer Rest} `
  ? Trim<Rest>
  : S;

/**
 * Check if a string starts with a prefix.
 *
 * @template S - String to check
 * @template Prefix - Prefix to check for
 * @returns true if S starts with Prefix
 *
 * @example
 * ```typescript
 * type Starts = StartsWith<'users.id', 'users'>; // true
 * type NoStart = StartsWith<'id', 'users'>; // false
 * ```
 */
export type StartsWith<S extends string, Prefix extends string> =
  S extends `${Prefix}${string}` ? true : false;

/**
 * Check if a string ends with a suffix.
 *
 * @template S - String to check
 * @template Suffix - Suffix to check for
 * @returns true if S ends with Suffix
 */
export type EndsWith<S extends string, Suffix extends string> =
  S extends `${string}${Suffix}` ? true : false;

/**
 * Replace all occurrences of a substring with another.
 *
 * @template S - String to search in
 * @template From - Substring to replace
 * @template To - Replacement substring
 * @returns String with replacements
 *
 * @example
 * ```typescript
 * type Replaced = ReplaceAll<'a.b.c', '.', '_'>; // 'a_b_c'
 * ```
 */
export type ReplaceAll<
  S extends string,
  From extends string,
  To extends string
> = From extends ''
  ? S
  : S extends `${infer Before}${From}${infer After}`
  ? `${Before}${To}${ReplaceAll<After, From, To>}`
  : S;

/**
 * Pluralize a word (simple English rules).
 *
 * @template S - Word to pluralize
 * @returns Pluralized word
 *
 * @example
 * ```typescript
 * type Users = Pluralize<'user'>; // 'users'
 * type Posts = Pluralize<'post'>; // 'posts'
 * ```
 */
export type Pluralize<S extends string> = EndsWith<S, 's'> extends true
  ? S
  : `${S}s`;

/**
 * Singularize a word (simple English rules).
 *
 * @template S - Word to singularize
 * @returns Singularized word
 *
 * @example
 * ```typescript
 * type User = Singularize<'users'>; // 'user'
 * type Post = Singularize<'posts'>; // 'post'
 * ```
 */
export type Singularize<S extends string> = S extends `${infer Base}s`
  ? Base
  : S;

/**
 * Example Usage:
 *
 * ```typescript
 * // Qualified name handling
 * type Table = ExtractTable<'users.id'>; // 'users'
 * type Column = ExtractColumn<'users.id'>; // 'id'
 * type Qualified = Qualify<'posts', 'title'>; // 'posts.title'
 *
 * // Alias handling
 * type Alias = ExtractAlias<'COUNT(*) AS total'>; // 'total'
 * type WithoutAlias = RemoveAlias<'id AS userId'>; // 'id'
 *
 * // Case conversion
 * type Camel = ToCamelCase<'user_name'>; // 'userName'
 * type Snake = ToSnakeCase<'userName'>; // 'user_name'
 * type Pascal = ToPascalCase<'user_name'>; // 'UserName'
 *
 * // String manipulation
 * type Split = Split<'a,b,c', ','>; // ['a', 'b', 'c']
 * type Joined = Join<['a', 'b', 'c'], ','>; // 'a,b,c'
 * type Replaced = ReplaceAll<'a.b.c', '.', '_'>; // 'a_b_c'
 *
 * // Pluralization
 * type Users = Pluralize<'user'>; // 'users'
 * type User = Singularize<'users'>; // 'user'
 * ```
 */

