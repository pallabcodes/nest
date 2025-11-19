/**
 * Neat Framework - HTTP Layer Barrel Export
 *
 * This module provides a unified interface to all HTTP-related functionality,
 * including adapters, route discovery, and server management.
 *
 * Key components:
 * - HttpAdapter: Interface for HTTP server implementations
 * - FastifyAdapter: Fastify-based HTTP adapter implementation
 * - RouteDiscovery: Automatic route discovery from controllers
 * - Route registration utilities
 */
export { createFastifyAdapter } from './fastify-adapter.js';
// Export route discovery system
export { RouteDiscovery } from './route-discovery.js';
export { registerControllerRoutes, createRouteDiscovery, validateController, getRouteInfo } from './route-discovery.js';
export { composeMiddleware, executeMiddlewareChain, createRequestLoggingMiddleware, createCORSMiddleware, createJSONBodyParserMiddleware, createErrorHandlingMiddleware, MiddlewareRegistry, createMiddlewareRegistry } from './middleware.js';
// Re-export branded types
export { brandPort, brandRoutePath } from '../types/branded.js';
//# sourceMappingURL=index.js.map