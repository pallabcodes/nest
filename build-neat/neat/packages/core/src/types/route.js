/**
 * Neat Framework - Route Types (Type-Safe Route Definitions)
 *
 * This module provides types for defining HTTP routes with compile-time safety,
 * ensuring routes are properly configured before runtime.
 *
 * Key TypeScript Excellence Features:
 * - Branded types for route paths and methods
 * - Type-safe route metadata and validation
 * - Compile-time route conflict detection
 * - Generic route parameter extraction
 *
 * Runtime Behavior: Routes are validated at startup with zero runtime overhead
 * for type checking during request processing.
 *
 * Pain Points Addressed: Eliminates runtime route conflicts, invalid method/path
 * combinations, and unsafe route parameter handling.
 */
/**
 * Type guard to validate route definitions.
 * Ensures route objects conform to the expected structure.
 */
export function isValidRouteDefinition(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'method' in obj &&
        'path' in obj &&
        'propertyKey' in obj &&
        typeof obj.propertyKey === 'string');
}
// ========================================
// ROUTE VALIDATION
// ========================================
/**
 * Validate route path format.
 */
export function isValidRoutePath(path) {
    // Basic validation - should start with / and not have invalid characters
    return path.startsWith('/') && !path.includes(' ') && !path.includes('\t');
}
/**
 * Check for route conflicts.
 */
export function routesConflict(route1, route2) {
    return route1.method === route2.method && route1.path === route2.path;
}
/**
 * Validate HTTP method is supported.
 */
export function isSupportedHttpMethod(method) {
    const supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    return supportedMethods.includes(method);
}
/**
 * Build route collection with conflict detection.
 */
export function buildRouteCollection(routes) {
    const conflicts = [];
    // Check for conflicts
    for (let i = 0; i < routes.length; i++) {
        for (let j = i + 1; j < routes.length; j++) {
            if (routesConflict(routes[i], routes[j])) {
                conflicts.push({
                    route1: routes[i],
                    route2: routes[j],
                    reason: 'duplicate-path-method',
                });
            }
        }
    }
    return { routes, conflicts };
}
// ========================================
// ROUTE REGISTRATION
// ========================================
/**
 * Route registry for managing route definitions.
 */
export class RouteRegistry {
    routes = new Map();
    /**
     * Register a route.
     */
    register(route) {
        const key = `${route.method}:${route.path}`;
        if (this.routes.has(key)) {
            throw new Error(`Route already registered: ${key}`);
        }
        this.routes.set(key, route);
    }
    /**
     * Get all registered routes.
     */
    getAll() {
        return Array.from(this.routes.values());
    }
    /**
     * Find route by method and path.
     */
    find(method, path) {
        const key = `${method}:${path}`;
        return this.routes.get(key);
    }
    /**
     * Clear all routes.
     */
    clear() {
        this.routes.clear();
    }
}
//# sourceMappingURL=route.js.map