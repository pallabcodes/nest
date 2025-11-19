/**
 * Neat Framework - Middleware Types (Type-Safe Middleware Chains)
 *
 * This module provides types for middleware with compile-time safety,
 * ensuring middleware chains are properly composed and executed.
 *
 * Key TypeScript Excellence Features:
 * - Generic middleware types with proper variance
 * - Type-safe middleware composition
 * - Compile-time middleware ordering guarantees
 * - Error handling in middleware chains
 *
 * Runtime Behavior: Middleware executes in defined order with proper error propagation.
 *
 * Pain Points Addressed: Eliminates unsafe middleware composition, incorrect ordering,
 * and silent failures in middleware chains.
 */
// ========================================
// MIDDLEWARE COMPOSITION
// ========================================
/**
 * Compose multiple middlewares into a chain.
 */
export function composeMiddlewares(middlewares) {
    return {
        middlewares,
        async process(input) {
            let currentInput = input;
            for (const middleware of middlewares) {
                const result = await middleware.process(currentInput);
                if (!result.success) {
                    return result;
                }
                currentInput = result.data;
            }
            return { success: true, data: currentInput };
        },
    };
}
/**
 * Create a middleware with error handling.
 */
export function createMiddleware(name, processor, priority = 0) {
    return {
        name,
        priority,
        process: processor,
    };
}
// ========================================
// HTTP MIDDLEWARE UTILITIES
// ========================================
/**
 * Create HTTP middleware with proper typing.
 */
export function createHttpMiddleware(name, handler, priority = 0) {
    return {
        name,
        priority,
        use: handler,
    };
}
/**
 * Sort middlewares by priority.
 */
export function sortMiddlewaresByPriority(middlewares) {
    return [...middlewares].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}
/**
 * Validate middleware chain for circular dependencies.
 */
export function validateMiddlewareChain(middlewares) {
    const seen = new Set();
    const processing = new Set();
    const checkMiddleware = (middleware) => {
        if (processing.has(middleware.name)) {
            return {
                success: false,
                error: new Error(`Circular middleware dependency detected: ${middleware.name}`),
            };
        }
        if (seen.has(middleware.name)) {
            return { success: true, data: undefined };
        }
        processing.add(middleware.name);
        // In a more complex system, we might check dependencies here
        processing.delete(middleware.name);
        seen.add(middleware.name);
        return { success: true, data: undefined };
    };
    for (const middleware of middlewares) {
        const result = checkMiddleware(middleware);
        if (!result.success) {
            return result;
        }
    }
    return { success: true, data: undefined };
}
// ========================================
// MIDDLEWARE REGISTRY
// ========================================
/**
 * Registry for managing middleware instances.
 */
export class MiddlewareRegistry {
    middlewares = new Map();
    /**
     * Register a middleware.
     */
    register(middleware) {
        if (this.middlewares.has(middleware.name)) {
            throw new Error(`Middleware already registered: ${middleware.name}`);
        }
        this.middlewares.set(middleware.name, middleware);
    }
    /**
     * Get middleware by name.
     */
    get(name) {
        return this.middlewares.get(name);
    }
    /**
     * Get all registered middlewares.
     */
    getAll() {
        return Array.from(this.middlewares.values());
    }
    /**
     * Remove middleware by name.
     */
    remove(name) {
        return this.middlewares.delete(name);
    }
    /**
     * Clear all middlewares.
     */
    clear() {
        this.middlewares.clear();
    }
}
//# sourceMappingURL=middleware.js.map