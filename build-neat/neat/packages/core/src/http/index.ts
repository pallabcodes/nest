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

// Export HTTP adapter interface and implementations
export type {
  HttpAdapter,
  HttpAdapterConfig,
  RouteHandler,
  HttpRouteHandler,
  ServerHealth
} from '../types/adapter.js';

export { createFastifyAdapter } from './fastify-adapter.js';
export type { FastifyAdapter } from './fastify-adapter.js';

// Export route discovery system
export { RouteDiscovery } from './route-discovery.js';
export {
  registerControllerRoutes,
  createRouteDiscovery,
  validateController,
  getRouteInfo
} from './route-discovery.js';

// Export middleware system
export type {
  Middleware,
  MiddlewareFactory,
  MiddlewareMetadata,
  MiddlewareContext
} from './middleware.js';

export {
  composeMiddleware,
  executeMiddlewareChain,
  createRequestLoggingMiddleware,
  createCORSMiddleware,
  createJSONBodyParserMiddleware,
  createErrorHandlingMiddleware,
  MiddlewareRegistry,
  createMiddlewareRegistry
} from './middleware.js';

// Re-export commonly used types
export type {
  RouteDefinition,
  RouteMetadata
} from '../types/route.js';

export type {
  HttpRequest,
  HttpResponse,
  TypedRouteHandler
} from '../types/handler.js';

// Re-export branded types
export {
  brandPort,
  brandRoutePath
} from '../types/branded.js';
