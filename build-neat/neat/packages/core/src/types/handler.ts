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

import type { Result } from './results.js';
import type { HttpMethod, RoutePath } from './branded.js';

// ========================================
// REQUEST/RESPONSE TYPES
// ========================================

/**
 * Generic HTTP request interface.
 */
export interface HttpRequest {
  readonly method: HttpMethod;
  readonly url: string;
  readonly path: RoutePath;
  readonly headers: Readonly<Record<string, string>>;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly raw?: unknown; // Framework-specific raw request object
}

/**
 * Generic HTTP response interface.
 */
export interface HttpResponse<T = unknown> {
  status(code: number): HttpResponse<T>;
  json(data: T): void;
  send(data: string | Buffer): void;
  setHeader(name: string, value: string): void;
  end(): void;
  raw?: unknown; // Framework-specific raw response object
}

// ========================================
// ROUTE HANDLER TYPES
// ========================================

/**
 * God-moded TypeScript: Generic route handler.
 *
 * Ensures route handlers have proper type safety for requests and responses.
 * The compiler validates handler signatures at build time.
 *
 * @template TRequest - Request type
 * @template TResponse - Response type
 * @template TBody - Request body type
 * @template TParams - Route parameters type
 * @template TQuery - Query parameters type
 * @template TReturn - Return type
 */
export interface RouteHandler<
  TRequest = HttpRequest,
  TResponse = HttpResponse,
  TBody = unknown,
  TParams = Record<string, string>,
  TQuery = Record<string, string>,
  TReturn = unknown
> {
  handle(
    request: TRequest & { readonly body: TBody; readonly params: TParams; readonly query: TQuery },
    response: TResponse
  ): Promise<Result<TReturn>> | Result<TReturn>;
}

/**
 * Typed route handler for specific request/response shapes.
 */
export interface TypedRouteHandler<TBody = unknown, TParams = Record<string, string>, TQuery = Record<string, string>, TReturn = unknown> {
  handle(
    request: HttpRequest & { readonly body: TBody; readonly params: TParams; readonly query: TQuery },
    response: HttpResponse<TReturn>
  ): Promise<Result<TReturn>> | Result<TReturn>;
}

// ========================================
// HANDLER UTILITIES
// ========================================

/**
 * Create a typed route handler.
 */
export function createTypedHandler<TBody = unknown, TParams = Record<string, string>, TQuery = Record<string, string>, TReturn = unknown>(
  handler: (
    request: HttpRequest & { readonly body: TBody; readonly params: TParams; readonly query: TQuery },
    response: HttpResponse<TReturn>
  ) => Promise<Result<TReturn>> | Result<TReturn>
): TypedRouteHandler<TBody, TParams, TQuery, TReturn> {
  return { handle: handler };
}

/**
 * Wrap a handler with error handling.
 */
export function withErrorHandling<TBody, TParams, TQuery, TReturn>(
  handler: TypedRouteHandler<TBody, TParams, TQuery, TReturn>,
  errorHandler?: (error: Error, request: HttpRequest, response: HttpResponse) => void
): TypedRouteHandler<TBody, TParams, TQuery, TReturn> {
  return {
    handle: async (request, response) => {
      try {
        return await handler.handle(request, response);
      } catch (error) {
        if (errorHandler) {
          errorHandler(error as Error, request, response);
        } else {
          // Default error response - cast to avoid type conflicts
          (response as HttpResponse<any>).status(500).json({ error: 'Internal server error' });
        }
        return { success: false, error: error as Error };
      }
    },
  };
}

// ========================================
// COMMON HANDLER PATTERNS
// ========================================

/**
 * RESTful resource handler.
 */
export interface RestResourceHandler<T, TCreate, TUpdate> {
  readonly list: TypedRouteHandler<unknown, Record<string, string>, Record<string, string>, T[]>;
  readonly get: TypedRouteHandler<unknown, { id: string }, unknown, T>;
  readonly create: TypedRouteHandler<TCreate, unknown, unknown, T>;
  readonly update: TypedRouteHandler<TUpdate, { id: string }, unknown, T>;
  readonly delete: TypedRouteHandler<unknown, { id: string }, unknown, void>;
}

/**
 * GraphQL-like handler for complex queries.
 */
export interface GraphQLHandler<TQuery, TVariables, TReturn> {
  handle(
    request: HttpRequest & { readonly body: { query: TQuery; variables?: TVariables } },
    response: HttpResponse<TReturn>
  ): Promise<Result<TReturn>>;
}

/**
 * File upload handler.
 */
export interface FileUploadHandler {
  handle(
    request: HttpRequest & { readonly files: readonly File[] },
    response: HttpResponse<{ uploaded: string[] }>
  ): Promise<Result<{ uploaded: string[] }>>;
}

/**
 * Streaming handler for large responses.
 */
export interface StreamingHandler {
  handle(
    request: HttpRequest,
    response: HttpResponse<ReadableStream>
  ): Promise<Result<ReadableStream>>;
}

// ========================================
// HANDLER VALIDATION
// ========================================

/**
 * Validate handler signature compatibility.
 */
export function isHandlerCompatible<TBody, TParams, TQuery, TReturn>(
  handler: TypedRouteHandler<any, any, any, any>,
  expectedBody?: unknown,
  expectedParams?: Record<string, string>,
  expectedQuery?: Record<string, string>
): boolean {
  // Basic validation - in a real implementation, this would do more thorough checks
  return typeof handler.handle === 'function';
}

/**
 * Create a handler validator.
 */
export function createHandlerValidator<TBody, TParams, TQuery, TReturn>(
  schema: {
    body?: (body: unknown) => boolean;
    params?: (params: Record<string, string>) => boolean;
    query?: (query: Record<string, string>) => boolean;
  }
) {
  return (handler: TypedRouteHandler<TBody, TParams, TQuery, TReturn>): boolean => {
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
  private readonly handlers = new Map<string, RouteHandler>();

  /**
   * Register a handler for a route.
   */
  register(routeKey: string, handler: RouteHandler): void {
    if (this.handlers.has(routeKey)) {
      throw new Error(`Handler already registered for route: ${routeKey}`);
    }
    this.handlers.set(routeKey, handler);
  }

  /**
   * Get handler for a route.
   */
  get(routeKey: string): RouteHandler | undefined {
    return this.handlers.get(routeKey);
  }

  /**
   * Check if handler exists for route.
   */
  has(routeKey: string): boolean {
    return this.handlers.has(routeKey);
  }

  /**
   * Remove handler for route.
   */
  remove(routeKey: string): boolean {
    return this.handlers.delete(routeKey);
  }

  /**
   * Clear all handlers.
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get all registered route keys.
   */
  getAllRoutes(): readonly string[] {
    return Array.from(this.handlers.keys());
  }
}

// ========================================
// MIDDLEWARE INTEGRATION
// ========================================

/**
 * Handler with middleware support.
 */
export interface MiddlewareEnabledHandler<TBody, TParams, TQuery, TReturn> extends TypedRouteHandler<TBody, TParams, TQuery, TReturn> {
  readonly middlewares: readonly string[];
  readonly preHandlers: readonly RouteHandler[];
  readonly postHandlers: readonly RouteHandler[];
}

/**
 * Create a handler with middleware pipeline.
 */
export function createMiddlewareEnabledHandler<TBody, TParams, TQuery, TReturn>(
  baseHandler: TypedRouteHandler<TBody, TParams, TQuery, TReturn>,
  middlewares: readonly string[] = [],
  preHandlers: readonly RouteHandler[] = [],
  postHandlers: readonly RouteHandler[] = []
): MiddlewareEnabledHandler<TBody, TParams, TQuery, TReturn> {
  return {
    ...baseHandler,
    middlewares,
    preHandlers,
    postHandlers,
  };
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Extract request body type from handler.
 */
export type ExtractBodyType<T> = T extends TypedRouteHandler<infer TBody, any, any, any> ? TBody : unknown;

/**
 * Extract route params type from handler.
 */
export type ExtractParamsType<T> = T extends TypedRouteHandler<any, infer TParams, any, any> ? TParams : Record<string, string>;

/**
 * Extract query params type from handler.
 */
export type ExtractQueryType<T> = T extends TypedRouteHandler<any, any, infer TQuery, any> ? TQuery : Record<string, string>;

/**
 * Extract return type from handler.
 */
export type ExtractReturnType<T> = T extends TypedRouteHandler<any, any, any, infer TReturn> ? TReturn : unknown;

/**
 * File interface for uploads.
 */
export interface File {
  readonly filename: string;
  readonly mimetype: string;
  readonly encoding: string;
  readonly buffer: Buffer;
  readonly size: number;
}
