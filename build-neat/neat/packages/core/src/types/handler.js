/**
 * Neat Framework - Route Handler Types (Type-Safe Request Processing)
 *
 * This module provides types for route handlers with compile-time safety,
 * ensuring request/response processing is properly typed.
 *
 * Key TypeScript Excellence Features:
 * - Generic handler types with proper variance
 * - Type-safe request/response transformation
 * - Compile-time handler validation
 * - Error handling in request processing
 *
 * Runtime Behavior: Handlers process requests with proper error handling and type safety.
 *
 * Pain Points Addressed: Eliminates unsafe request processing, incorrect response types,
 * and missing error handling in route handlers.
 */
// ========================================
// HANDLER UTILITIES
// ========================================
/**
 * Create a typed route handler.
 */
export function createTypedHandler(handler) {
    return { handle: handler };
}
/**
 * Wrap a handler with error handling.
 */
export function withErrorHandling(handler, errorHandler) {
    return {
        handle: async (request, response) => {
            try {
                return await handler.handle(request, response);
            }
            catch (error) {
                if (errorHandler) {
                    errorHandler(error, request, response);
                }
                else {
                    // Default error response - cast to avoid type conflicts
                    response.status(500).json({ error: 'Internal server error' });
                }
                return { success: false, error: error };
            }
        },
    };
}
// ========================================
// HANDLER VALIDATION
// ========================================
/**
 * Validate handler signature compatibility.
 */
export function isHandlerCompatible(handler, expectedBody, expectedParams, expectedQuery) {
    // Basic validation - in a real implementation, this would do more thorough checks
    return typeof handler.handle === 'function';
}
/**
 * Create a handler validator.
 */
export function createHandlerValidator(schema) {
    return (handler) => {
        // Validate that the handler exists and is a function
        if (!handler || typeof handler.handle !== 'function') {
            return false;
        }
        // Additional schema validation could be added here
        return true;
    };
}
// ========================================
// HANDLER REGISTRY
// ========================================
/**
 * Registry for managing route handlers.
 */
export class HandlerRegistry {
    handlers = new Map();
    /**
     * Register a handler for a route.
     */
    register(routeKey, handler) {
        if (this.handlers.has(routeKey)) {
            throw new Error(`Handler already registered for route: ${routeKey}`);
        }
        this.handlers.set(routeKey, handler);
    }
    /**
     * Get handler for a route.
     */
    get(routeKey) {
        return this.handlers.get(routeKey);
    }
    /**
     * Check if handler exists for route.
     */
    has(routeKey) {
        return this.handlers.has(routeKey);
    }
    /**
     * Remove handler for route.
     */
    remove(routeKey) {
        return this.handlers.delete(routeKey);
    }
    /**
     * Clear all handlers.
     */
    clear() {
        this.handlers.clear();
    }
    /**
     * Get all registered route keys.
     */
    getAllRoutes() {
        return Array.from(this.handlers.keys());
    }
}
/**
 * Create a handler with middleware pipeline.
 */
export function createMiddlewareEnabledHandler(baseHandler, middlewares = [], preHandlers = [], postHandlers = []) {
    return {
        ...baseHandler,
        middlewares,
        preHandlers,
        postHandlers,
    };
}
//# sourceMappingURL=handler.js.map