/**
 * Neat Framework - Metadata Keys (Type-Safe Metadata Constants)
 *
 * This module defines type-safe metadata keys used throughout the framework.
 * Provides compile-time safety for metadata key access and validation.
 *
 * Key TypeScript Excellence Features:
 * - Template literal types for metadata keys
 * - Const assertions for literal type preservation
 * - Type-safe key unions
 * - Exhaustive key checking
 *
 * Runtime Behavior: Keys are used by the metadata scanner to access
 * decorator metadata with type safety.
 *
 * Framework Integration: Used by all decorators and metadata scanning operations.
 */

// ========================================
// METADATA KEY CONSTANTS (Type-Safe Keys)
// ========================================

/**
 * God-moded TypeScript: Template literal types for metadata keys.
 * Provides compile-time safety for metadata key access.
 */
export const METADATA_KEYS = {
  // Class-level metadata
  INJECTABLE: 'neat:injectable' as const,
  CONTROLLER: 'neat:controller' as const,
  MODULE: 'neat:module' as const,

  // Method-level metadata
  ROUTE: 'neat:route' as const,
  MIDDLEWARE: 'neat:middleware' as const,
  GUARD: 'neat:guard' as const,
  INTERCEPTOR: 'neat:interceptor' as const,

  // Property-level metadata
  INJECT: 'neat:inject' as const,
  STRATEGY: 'neat:strategy' as const,

  // Parameter-level metadata
  PARAM: 'neat:param' as const,
  QUERY: 'neat:query' as const,
  BODY: 'neat:body' as const,
  HEADER: 'neat:header' as const,

  // Strategy pattern metadata
  STRATEGY_KEY: 'neat:strategy_key' as const,
  FACTORY_PATTERN: 'neat:factory_pattern' as const,

  // Lifecycle metadata
  ON_INIT: 'neat:on_init' as const,
  ON_DESTROY: 'neat:on_destroy' as const,
} as const;

/**
 * Type-safe metadata key union.
 * Ensures only valid metadata keys can be used.
 */
export type MetadataKey = typeof METADATA_KEYS[keyof typeof METADATA_KEYS];

// ========================================
// KEY VALIDATION
// ========================================

/**
 * Check if a string is a valid metadata key.
 */
export function isValidMetadataKey(key: string): key is MetadataKey {
  return Object.values(METADATA_KEYS).includes(key as MetadataKey);
}

/**
 * Get all available metadata keys.
 */
export function getAllMetadataKeys(): readonly MetadataKey[] {
  return Object.values(METADATA_KEYS);
}

/**
 * Get metadata keys by category.
 */
export function getMetadataKeysByCategory(): {
  readonly class: readonly MetadataKey[];
  readonly method: readonly MetadataKey[];
  readonly property: readonly MetadataKey[];
  readonly parameter: readonly MetadataKey[];
  readonly lifecycle: readonly MetadataKey[];
} {
  return {
    class: [
      METADATA_KEYS.INJECTABLE,
      METADATA_KEYS.CONTROLLER,
      METADATA_KEYS.MODULE,
      METADATA_KEYS.STRATEGY_KEY,
    ],
    method: [
      METADATA_KEYS.ROUTE,
      METADATA_KEYS.MIDDLEWARE,
      METADATA_KEYS.GUARD,
      METADATA_KEYS.INTERCEPTOR,
    ],
    property: [
      METADATA_KEYS.INJECT,
      METADATA_KEYS.STRATEGY,
    ],
    parameter: [
      METADATA_KEYS.PARAM,
      METADATA_KEYS.QUERY,
      METADATA_KEYS.BODY,
      METADATA_KEYS.HEADER,
    ],
    lifecycle: [
      METADATA_KEYS.ON_INIT,
      METADATA_KEYS.ON_DESTROY,
    ],
  };
}
