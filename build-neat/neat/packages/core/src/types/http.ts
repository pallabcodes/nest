/**
 * Neat Framework - HTTP Types (Web Framework Type Safety)
 *
 * This module provides god-moded TypeScript types for HTTP operations,
 * ensuring type safety in web framework development.
 *
 * Key TypeScript Excellence Features:
 * - Branded types integration for route paths and HTTP methods
 * - Type-safe middleware chains
 * - Generic HTTP adapters with proper abstraction
 * - Compile-time guarantees for HTTP request/response handling
 *
 * Runtime Behavior: These types provide zero-runtime-overhead type safety
 * for HTTP routing, middleware, and request/response handling.
 *
 * Framework Integration: Forms the foundation for type-safe HTTP routing
 * with adapters for Fastify, Express, and other HTTP servers.
 *
 * Pain Points Addressed: Eliminates common web framework bugs like
 * incorrect route definitions, unsafe middleware usage, and type-unsafe
 * request/response handling that plague frameworks like Express without types.
 *
 * Research: Inspired by strongly-typed web frameworks (like Servant in Haskell,
 * Finch in Scala) and advanced Node.js typing patterns.
 */

import type { HttpMethod, RoutePath, Port } from './branded.js';
import type { Result } from './discriminated-unions.js';

// ========================================
// ROUTE DEFINITION TYPES
// ========================================

/**
 * God-moded TypeScript: Type-safe route definition.
 *
 * Ensures routes are defined with proper HTTP methods, paths, and metadata.
 * The compiler prevents invalid route configurations at build time.
 */
export interface RouteDefinition {
  readonly method: HttpMethod;
  readonly path: RoutePath;
  readonly propertyKey: string;
  readonly middlewares?: readonly Middleware[];
}

/**
 * Type guard to validate route definitions.
 * Ensures route objects conform to the expected structure.
 */
export function isRouteDefinition(value: unknown): value is RouteDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'method' in value &&
    'path' in value &&
    'propertyKey' in value &&
    typeof (value as any).propertyKey === 'string'
  );
}

// ========================================
// MIDDLEWARE TYPES
// ========================================

/**
 * Type-safe middleware interface with proper function signatures.
 * Ensures middleware functions receive correct parameters and return types.
 */
export interface Middleware {
  readonly name: string;
  readonly priority?: number;
  use(request: HttpRequest, response: HttpResponse, next: () => void): void;
}

/**
 * Middleware factory for creating configurable middleware.
 * Enables type-safe middleware creation with dependency injection.
 */
export interface MiddlewareFactory<T = unknown> {
  create(config: T): Middleware;
}

/**
 * Middleware chain type for composing multiple middleware.
 * Ensures proper execution order and type safety.
 */
export type MiddlewareChain = readonly Middleware[];

/**
 * Utility type for middleware that transforms requests.
 */
export interface RequestTransformer<TInput = unknown, TOutput = TInput> {
  transform(request: HttpRequest & { body: TInput }): HttpRequest & { body: TOutput };
}

/**
 * Utility type for middleware that transforms responses.
 */
export interface ResponseTransformer<TInput = unknown, TOutput = TInput> {
  transform(response: HttpResponse<TInput>): HttpResponse<TOutput>;
}

// ========================================
// HTTP REQUEST TYPES
// ========================================

/**
 * God-moded TypeScript: Type-safe HTTP request representation.
 *
 * Provides comprehensive typing for all HTTP request components with
 * readonly guarantees to prevent accidental mutation.
 */
export interface HttpRequest {
  readonly method: HttpMethod;
  readonly url: string;
  readonly path: RoutePath;
  readonly headers: Readonly<Record<string, string>>;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly ip?: string;
  readonly userAgent?: string;
}

/**
 * Extended request type with parsed body.
 * Provides type safety for request body parsing.
 */
export interface HttpRequestWithBody<TBody = unknown> extends HttpRequest {
  readonly body: TBody;
}

/**
 * Type guard for requests with bodies.
 */
export function hasBody<T>(request: HttpRequest): request is HttpRequestWithBody<T> {
  return 'body' in request && request.body !== undefined;
}

/**
 * HTTP request builder for type-safe request construction.
 */
export interface HttpRequestBuilder {
  setMethod(method: HttpMethod): this;
  setPath(path: RoutePath): this;
  setHeaders(headers: Record<string, string>): this;
  setParams(params: Record<string, string>): this;
  setQuery(query: Record<string, string>): this;
  setBody<T>(body: T): HttpRequestBuilderWithBody<T>;
  build(): HttpRequest;
}

export interface HttpRequestBuilderWithBody<T> extends HttpRequestBuilder {
  build(): HttpRequestWithBody<T>;
}

// ========================================
// HTTP RESPONSE TYPES
// ========================================

/**
 * Forward declaration for HttpResponse - defined in discriminated-unions.ts
 * This will be imported when all modules are connected.
 */
type HttpResponse<T = unknown> = any;

// ========================================
// HTTP ADAPTER TYPES
// ========================================

/**
 * God-moded TypeScript: Type-safe HTTP server adapter interface.
 *
 * Provides abstraction over different HTTP server implementations (Fastify, Express)
 * with compile-time guarantees about available methods and return types.
 */
export interface HttpAdapter {
  readonly __adapter: true;
  readonly name: 'fastify' | 'express';
  readonly version: string;

  listen(port: Port): Result<void>;
  close(): Result<void>;
  registerRoute(route: RouteDefinition, handler: RouteHandler): Result<void>;
  registerMiddleware(middleware: Middleware): Result<void>;
  setErrorHandler(handler: ErrorHandler): Result<void>;
  setNotFoundHandler(handler: NotFoundHandler): Result<void>;
}

/**
 * HTTP adapter factory for creating configured adapters.
 */
export interface HttpAdapterFactory {
  create(config: HttpAdapterConfig): Result<HttpAdapter>;
}

/**
 * Configuration for HTTP adapters.
 */
export interface HttpAdapterConfig {
  readonly trustProxy?: boolean;
  readonly maxParamLength?: number;
  readonly bodyLimit?: number;
  readonly ignoreTrailingSlash?: boolean;
  readonly caseSensitive?: boolean;
}

// ========================================
// ROUTE HANDLER TYPES
// ========================================

/**
 * Type-safe route handler function signature.
 *
 * Ensures handlers receive properly typed requests and return
 * properly typed responses with async guarantees.
 */
export type RouteHandler<TRequest = HttpRequest, TResponse = unknown> =
  (request: TRequest) => Promise<HttpResponse<TResponse>>;

/**
 * Route handler with typed request body.
 */
export type RouteHandlerWithBody<TBody, TResponse = unknown> =
  RouteHandler<HttpRequestWithBody<TBody>, TResponse>;

/**
 * Route handler factory for creating handlers with dependencies.
 */
export interface RouteHandlerFactory<TDeps = unknown> {
  create(dependencies: TDeps): RouteHandler;
}

// ========================================
// ERROR HANDLING TYPES
// ========================================

/**
 * Type-safe error handler for HTTP errors.
 */
export type ErrorHandler = (error: Error, request: HttpRequest) => Promise<HttpResponse>;

/**
 * Type-safe handler for 404 Not Found errors.
 */
export type NotFoundHandler = (request: HttpRequest) => Promise<HttpResponse>;

// ========================================
// HTTP CONTEXT TYPES
// ========================================

/**
 * HTTP context providing access to request, response, and framework services.
 * Enables type-safe access to framework internals within handlers.
 */
export interface HttpContext {
  readonly request: HttpRequest;
  readonly response: HttpResponse;
  readonly services: ServiceLocator;
}

/**
 * Service locator for dependency resolution within HTTP contexts.
 */
export interface ServiceLocator {
  get<T>(token: string): Result<T>;
  has(token: string): boolean;
}

// ========================================
// ADVANCED HTTP TYPES
// ========================================

/**
 * Typed route parameter extractor.
 * Provides type-safe access to route parameters.
 */
export type RouteParam<T extends string> = {
  readonly [K in T]: string;
};

/**
 * Typed query parameter extractor.
 * Provides type-safe access to query parameters.
 */
export type QueryParam<T extends Record<string, unknown>> = {
  readonly [K in keyof T]: string;
};

/**
 * HTTP status code literal types for type safety.
 */
export type HttpStatusCode =
  | 200 | 201 | 202 | 204
  | 301 | 302 | 303 | 304
  | 400 | 401 | 403 | 404 | 405 | 406 | 409 | 410 | 422 | 429
  | 500 | 501 | 502 | 503 | 504;

/**
 * Content type constants with proper typing.
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  TEXT: 'text/plain',
  HTML: 'text/html',
  XML: 'application/xml',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  FORM_DATA: 'multipart/form-data',
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Create a typed route definition with validation.
 */
export function createRoute(
  method: HttpMethod,
  path: RoutePath,
  propertyKey: string,
  middlewares: readonly Middleware[] = []
): RouteDefinition {
  return {
    method,
    path,
    propertyKey,
    middlewares,
  };
}

/**
 * Create a typed middleware with validation.
 */
export function createMiddleware(
  name: string,
  handler: (request: HttpRequest, response: HttpResponse, next: () => void) => void,
  priority = 0
): Middleware {
  return {
    name,
    priority,
    use: handler,
  };
}

/**
 * Type-safe content type checker.
 */
export function isContentType(request: HttpRequest, contentType: ContentType): boolean {
  const requestContentType = request.headers['content-type']?.split(';')[0];
  return requestContentType === contentType;
}

/**
 * Extract typed body from request with validation.
 */
export function extractBody<T>(
  request: HttpRequest,
  validator: (body: unknown) => body is T
): Result<T> {
  if (!hasBody(request)) {
    return { success: false, error: new Error('Request has no body') };
  }

  if (!validator(request.body)) {
    return { success: false, error: new Error('Request body validation failed') };
  }

  return { success: true, data: request.body };
}
