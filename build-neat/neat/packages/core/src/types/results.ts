/**
 * Neat Framework - Result Types (Type-Safe Error Handling)
 *
 * This module provides god-moded TypeScript discriminated unions for Result types,
 * enabling exhaustive error handling without exceptions.
 *
 * Key TypeScript Excellence Features:
 * - Discriminated unions for type-safe error handling
 * - Exhaustive pattern matching with type guards
 * - Zero runtime overhead error handling
 * - Compile-time guarantees for error cases
 *
 * Runtime Behavior: Provides functional-style error handling with
 * type safety and no exception throwing.
 *
 * Pain Points Addressed: Eliminates unsafe error handling patterns
 * common in JavaScript/TypeScript codebases.
 *
 * Research: Inspired by Rust's Result type and functional programming
 * languages like Haskell and Scala.
 */

// ========================================
// RESULT TYPE DEFINITION
// ========================================

/**
 * God-moded TypeScript: Discriminated union for Result types.
 *
 * This pattern provides type-safe error handling without exceptions.
 * The compiler ensures all possible outcomes are handled exhaustively.
 *
 * @template T - The success data type
 * @template E - The error type (defaults to Error)
 */
export type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

// ========================================
// TYPE GUARDS
// ========================================

/**
 * Type guard to check if a Result is successful.
 * Enables type narrowing in conditional blocks.
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { readonly success: true; readonly data: T } {
  return result.success;
}

/**
 * Type guard to check if a Result is an error.
 * Enables type narrowing for error handling.
 */
export function isResultError<T, E>(result: Result<T, E>): result is { readonly success: false; readonly error: E } {
  return !result.success;
}

// ========================================
// RESULT UTILITIES
// ========================================

/**
 * Extract data from a successful Result, throwing on error.
 * Use only when you're certain the result is successful.
 */
export function unwrapResult<T, E>(result: Result<T, E>): T {
  if (!isSuccess(result)) {
    throw result.error;
  }
  return result.data;
}

/**
 * Extract error from a failed Result, throwing on success.
 * Use only when you're certain the result is an error.
 */
export function unwrapError<T, E>(result: Result<T, E>): E {
  if (isSuccess(result)) {
    throw new Error('Expected error result, got success');
  }
  return result.error;
}

/**
 * Create a successful Result.
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create an error Result.
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Map a successful Result to a new value.
 */
export function mapResult<T, U, E>(result: Result<T, E>, mapper: (data: T) => U): Result<U, E> {
  if (isSuccess(result)) {
    return ok(mapper(result.data));
  }
  return result;
}

/**
 * Map an error Result to a new error.
 */
export function mapError<T, E, F>(result: Result<T, E>, mapper: (error: E) => F): Result<T, F> {
  if (isResultError(result)) {
    return err(mapper(result.error));
  }
  return result;
}

/**
 * Chain Results together (flatMap).
 */
export function chainResults<T, U, E>(result: Result<T, E>, mapper: (data: T) => Result<U, E>): Result<U, E> {
  if (isSuccess(result)) {
    return mapper(result.data);
  }
  return result;
}

// ========================================
// PATTERN MATCHING
// ========================================

/**
 * Exhaustive pattern matching for Results.
 * Compiler ensures all cases are handled.
 */
export function matchResult<T, E, R>(
  result: Result<T, E>,
  onSuccess: (data: T) => R,
  onError: (error: E) => R
): R {
  if (isSuccess(result)) {
    return onSuccess(result.data);
  } else {
    return onError(result.error);
  }
}

/**
 * Try/catch wrapper that returns a Result.
 */
export function tryCatch<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error as E);
  }
}

/**
 * Async try/catch wrapper that returns a Result.
 */
export async function tryCatchAsync<T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>> {
  try {
    const result = await fn();
    return ok(result);
  } catch (error) {
    return err(error as E);
  }
}

// ========================================
// RESULT COLLECTIONS
// ========================================

/**
 * Combine multiple Results into a single Result of array.
 * Fails fast on first error.
 */
export function combineResults<T, E>(results: readonly Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (isResultError(result)) {
      return result;
    }
    values.push(result.data);
  }

  return ok(values);
}

/**
 * Find first successful Result from an array.
 */
export function firstSuccess<T, E>(results: readonly Result<T, E>[]): Result<T, E> {
  for (const result of results) {
    if (isSuccess(result)) {
      return result;
    }
  }
  return err(new Error('No successful results') as E);
}
