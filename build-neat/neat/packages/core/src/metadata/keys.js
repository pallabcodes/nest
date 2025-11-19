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
    INJECTABLE: 'neat:injectable',
    CONTROLLER: 'neat:controller',
    MODULE: 'neat:module',
    // Method-level metadata
    ROUTE: 'neat:route',
    MIDDLEWARE: 'neat:middleware',
    GUARD: 'neat:guard',
    INTERCEPTOR: 'neat:interceptor',
    // Property-level metadata
    INJECT: 'neat:inject',
    STRATEGY: 'neat:strategy',
    // Parameter-level metadata
    PARAM: 'neat:param',
    QUERY: 'neat:query',
    BODY: 'neat:body',
    HEADER: 'neat:header',
    // Strategy pattern metadata
    STRATEGY_KEY: 'neat:strategy_key',
    FACTORY_PATTERN: 'neat:factory_pattern',
    // Lifecycle metadata
    ON_INIT: 'neat:on_init',
    ON_DESTROY: 'neat:on_destroy',
};
// ========================================
// KEY VALIDATION
// ========================================
/**
 * Check if a string is a valid metadata key.
 */
export function isValidMetadataKey(key) {
    return Object.values(METADATA_KEYS).includes(key);
}
/**
 * Get all available metadata keys.
 */
export function getAllMetadataKeys() {
    return Object.values(METADATA_KEYS);
}
/**
 * Get metadata keys by category.
 */
export function getMetadataKeysByCategory() {
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
//# sourceMappingURL=keys.js.map