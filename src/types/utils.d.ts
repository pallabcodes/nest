/**
 * Utility Type Definitions
 *
 * Common utility types and helper interfaces used throughout the application.
 */

/**
 * Generic ID type - can be number or string
 */
export type ID = number | string;

/**
 * Generic UUID type
 */
export type UUID = string;

/**
 * Timestamp type for database fields
 */
export type Timestamp = Date | string;

/**
 * Nullable type utility
 */
export type Nullable<T> = T | null;

/**
 * Optional type utility
 */
export type Optional<T> = T | undefined;

/**
 * Required fields from a type
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Partial fields from a type
 */
export type PartialFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep partial type utility
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep required type utility
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extract keys of a type that are functions
 */
export type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Extract keys of a type that are not functions
 */
export type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];

/**
 * Constructor type utility
 */
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * Abstract constructor type utility
 */
export type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;

/**
 * Instance type from constructor
 */
export type InstanceType<T extends Constructor> = T extends Constructor<infer R> ? R : never;

/**
 * Promise return type utility
 */
export type PromiseReturnType<T> = T extends Promise<infer R> ? R : T;

/**
 * Array element type utility
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * Object values type utility
 */
export type ObjectValues<T> = T[keyof T];

/**
 * Object keys type utility (useful for enums)
 */
export type ObjectKeys<T> = keyof T;

/**
 * Prettify type utility for better IntelliSense
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Union to intersection type utility
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * Strict extract utility
 */
export type StrictExtract<T, U extends T> = T extends U ? T : never;

/**
 * Strict exclude utility
 */
export type StrictExclude<T, U extends T> = T extends StrictExtract<T, U> ? never : T;

/**
 * Non-nullable type utility
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Brand type utility for nominal typing
 */
export type Brand<T, Brand> = T & { __brand: Brand };

/**
 * Email brand type
 */
export type Email = Brand<string, 'Email'>;

/**
 * Password brand type
 */
export type Password = Brand<string, 'Password'>;

/**
 * URL brand type
 */
export type URL = Brand<string, 'URL'>;

/**
 * File path brand type
 */
export type FilePath = Brand<string, 'FilePath'>;

/**
 * Database transaction options
 */
export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly?: boolean;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string;
  order: 'ASC' | 'DESC';
}

/**
 * Filter options
 */
export interface FilterOptions {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'ilike';
  value: any;
}

/**
 * Query options combining pagination, sorting, and filtering
 */
export interface QueryOptions {
  pagination?: PaginationParams;
  sort?: SortOptions[];
  filters?: FilterOptions[];
  include?: string[];
  attributes?: string[];
  paranoid?: boolean;
}

/**
 * HTTP status codes type
 */
export type HttpStatusCode =
  | 200
  | 201
  | 202
  | 204
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 500
  | 502
  | 503;

/**
 * Environment type
 */
export type Environment = 'development' | 'test' | 'staging' | 'production';

/**
 * Log level type
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * File size in bytes
 */
export type FileSize = Brand<number, 'FileSize'>;

/**
 * Duration in milliseconds
 */
export type Duration = Brand<number, 'Duration'>;

/**
 * Percentage type (0-100)
 */
export type Percentage = Brand<number, 'Percentage'>;

export {};
