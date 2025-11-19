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
// TYPE GUARDS
// ========================================
/**
 * Type guard to check if a Result is successful.
 * Enables type narrowing in conditional blocks.
 */
export function isSuccess(result) {
    return result.success;
}
/**
 * Type guard to check if a Result is an error.
 * Enables type narrowing for error handling.
 */
export function isResultError(result) {
    return !result.success;
}
// ========================================
// RESULT UTILITIES
// ========================================
/**
 * Extract data from a successful Result, throwing on error.
 * Use only when you're certain the result is successful.
 */
export function unwrapResult(result) {
    if (!isSuccess(result)) {
        throw result.error;
    }
    return result.data;
}
/**
 * Extract error from a failed Result, throwing on success.
 * Use only when you're certain the result is an error.
 */
export function unwrapError(result) {
    if (isSuccess(result)) {
        throw new Error('Expected error result, got success');
    }
    return result.error;
}
/**
 * Create a successful Result.
 */
export function ok(data) {
    return { success: true, data };
}
/**
 * Create an error Result.
 */
export function err(error) {
    return { success: false, error };
}
/**
 * Map a successful Result to a new value.
 */
export function mapResult(result, mapper) {
    if (isSuccess(result)) {
        return ok(mapper(result.data));
    }
    return result;
}
/**
 * Map an error Result to a new error.
 */
export function mapError(result, mapper) {
    if (isResultError(result)) {
        return err(mapper(result.error));
    }
    return result;
}
/**
 * Chain Results together (flatMap).
 */
export function chainResults(result, mapper) {
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
export function matchResult(result, onSuccess, onError) {
    if (isSuccess(result)) {
        return onSuccess(result.data);
    }
    else {
        return onError(result.error);
    }
}
/**
 * Try/catch wrapper that returns a Result.
 */
export function tryCatch(fn) {
    try {
        return ok(fn());
    }
    catch (error) {
        return err(error);
    }
}
/**
 * Async try/catch wrapper that returns a Result.
 */
export async function tryCatchAsync(fn) {
    try {
        const result = await fn();
        return ok(result);
    }
    catch (error) {
        return err(error);
    }
}
// ========================================
// RESULT COLLECTIONS
// ========================================
/**
 * Combine multiple Results into a single Result of array.
 * Fails fast on first error.
 */
export function combineResults(results) {
    const values = [];
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
export function firstSuccess(results) {
    for (const result of results) {
        if (isSuccess(result)) {
            return result;
        }
    }
    return err(new Error('No successful results'));
}
//# sourceMappingURL=results.js.map