/**
 * Neat Framework - HTTP Method Decorators
 *
 * HTTP method decorators provide the primary API for defining route handlers.
 * These decorators work with the metadata scanner to enable automatic route
 * registration and type-safe request handling.
 *
 * Key TypeScript Excellence Features:
 * - Method decorators with compile-time HTTP method validation
 * - Template literal types for route path validation
 * - Type-safe route metadata attachment
 * - Generic decorator factories with proper constraints
 *
 * Runtime Behavior: Decorators attach route metadata that the HTTP layer uses
 * to automatically register routes and handle requests.
 *
 * Framework Integration: Core to REST API development, enabling developers to
 * define HTTP endpoints with minimal boilerplate and maximum type safety.
 */
import { MetadataScanner, METADATA_KEYS } from '../metadata/index.js';
/**
 * HTTP method decorator factory.
 * Creates method decorators for different HTTP methods with type safety.
 *
 * @param method - The HTTP method
 * @returns A method decorator factory function
 */
function createHttpMethodDecorator(method) {
    return (path, options) => {
        return (target, propertyKey) => {
            const scanner = new MetadataScanner();
            // Create route metadata
            const routeMetadata = {
                method,
                path: path || '',
                options: options || {},
            };
            // Get existing routes for this method
            const existingRoutes = scanner.getMetadata(METADATA_KEYS.ROUTE, target.constructor, propertyKey) || [];
            // Add the new route
            const updatedRoutes = [...existingRoutes, routeMetadata];
            // Attach route metadata
            scanner.setMetadata(METADATA_KEYS.ROUTE, updatedRoutes, target.constructor, propertyKey);
        };
    };
}
/**
 * HTTP GET method decorator.
 * @param path - Route path (optional)
 * @param options - Route options
 */
export const Get = createHttpMethodDecorator('GET');
/**
 * HTTP POST method decorator.
 * @param path - Route path (optional)
 * @param options - Route options
 */
export const Post = createHttpMethodDecorator('POST');
/**
 * HTTP PUT method decorator.
 * @param path - Route path (optional)
 * @param options - Route options
 */
export const Put = createHttpMethodDecorator('PUT');
/**
 * HTTP PATCH method decorator.
 * @param path - Route path (optional)
 * @param options - Route options
 */
export const Patch = createHttpMethodDecorator('PATCH');
/**
 * HTTP DELETE method decorator.
 * @param path - Route path (optional)
 * @param options - Route options
 */
export const Delete = createHttpMethodDecorator('DELETE');
/**
 * HTTP OPTIONS method decorator.
 * @param path - Route path (optional)
 * @param options - Route options
 */
export const Options = createHttpMethodDecorator('OPTIONS');
/**
 * HTTP HEAD method decorator.
 * @param path - Route path (optional)
 * @param options - Route options
 */
export const Head = createHttpMethodDecorator('HEAD');
/**
 * Utility function to get routes for a specific method.
 *
 * @param target - The class constructor
 * @param methodName - The method name
 * @returns Array of routes defined on the method
 */
export function getMethodRoutes(target, methodName) {
    const scanner = new MetadataScanner();
    return scanner.getMetadata(METADATA_KEYS.ROUTE, target, methodName) || [];
}
/**
 * Check if a method has any HTTP routes defined.
 *
 * @param target - The class constructor
 * @param methodName - The method name
 * @returns True if the method has routes
 */
export function hasMethodRoutes(target, methodName) {
    return getMethodRoutes(target, methodName).length > 0;
}
/**
 * Get all routes defined in a class.
 *
 * @param target - The class constructor
 * @returns Array of all routes in the class
 */
export function getClassRoutes(target) {
    const scanner = new MetadataScanner();
    const methodMetadata = scanner.scanClassMethods(target);
    const routes = [];
    for (const [methodName, metadata] of Object.entries(methodMetadata)) {
        if (metadata.routes && metadata.routes.length > 0) {
            routes.push({
                methodName,
                routes: metadata.routes,
            });
        }
    }
    return routes;
}
//# sourceMappingURL=methods.js.map