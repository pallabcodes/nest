/**
 * Neat Framework - Middleware System
 *
 * This module provides a comprehensive middleware system for HTTP request processing.
 * Middleware enables cross-cutting concerns like authentication, logging, error handling,
 * and request transformation in a composable, type-safe manner.
 *
 * Key TypeScript Excellence Features:
 * - Generic middleware types with proper variance
 * - Functional composition with compile-time guarantees
 * - Middleware execution order validation
 * - Type-safe request/response transformation
 * - Error handling integration with Result types
 *
 * Runtime Behavior: Middleware functions are composed and executed in order,
 * allowing each middleware to modify request/response or short-circuit processing.
 * Supports both global and route-specific middleware.
 *
 * Framework Integration: Essential for enterprise applications requiring
 * authentication, authorization, logging, and request preprocessing.
 *
 * Pain Points Addressed: Eliminates manual middleware wiring, provides
 * type safety for middleware chains, and enables reusable middleware components.
 *
 * Research: Inspired by Express.js middleware but with stronger typing and
 * functional programming principles from Koa.js.
 */

import type { HttpRequest, HttpResponse } from '../types/handler.js';
import type { Result } from '../types/results.js';

// ========================================
// MIDDLEWARE TYPES
// ========================================

/**
 * God-moded TypeScript: Core middleware types with functional composition.
 */

/**
 * Middleware function signature.
 * Takes a request, response, and next function, returns a Result.
 */
export type Middleware<TRequest = HttpRequest, TResponse = HttpResponse> = (
  request: TRequest,
  response: TResponse,
  next: () => Promise<Result<TResponse>>
) => Promise<Result<TResponse>>;

/**
 * Middleware factory for creating parameterized middleware.
 */
export type MiddlewareFactory<TConfig = any, TRequest = HttpRequest, TResponse = HttpResponse> = (
  config: TConfig
) => Middleware<TRequest, TResponse>;

/**
 * Middleware metadata for decorator-based configuration.
 */
export interface MiddlewareMetadata {
  readonly type: 'global' | 'route';
  readonly priority: number;
  readonly name: string;
  readonly config?: any;
}

/**
 * Middleware execution context.
 */
export interface MiddlewareContext<TRequest = HttpRequest, TResponse = HttpResponse> {
  readonly request: TRequest;
  readonly response: TResponse;
  readonly route?: {
    readonly method: string;
    readonly path: string;
    readonly handler: string;
  };
}

// ========================================
// MIDDLEWARE COMPOSITION
// ========================================

/**
 * Compose multiple middleware functions into a single middleware.
 * Executes middleware in order, allowing each to modify request/response or short-circuit.
 */
export function composeMiddleware<TRequest = HttpRequest, TResponse = HttpResponse>(
  ...middlewares: readonly Middleware<TRequest, TResponse>[]
): Middleware<TRequest, TResponse> {
  return async (request: TRequest, response: TResponse, next: () => Promise<Result<TResponse>>) => {
    // Create execution chain
    let index = 0;

    const executeNext = async (): Promise<Result<TResponse>> => {
      if (index >= middlewares.length) {
        // All middleware executed, call final handler
        return next();
      }

      const middleware = middlewares[index++];
      return middleware(request, response, executeNext);
    };

    return executeNext();
  };
}

/**
 * Execute middleware chain with error handling.
 */
export async function executeMiddlewareChain<TRequest = HttpRequest, TResponse = HttpResponse>(
  request: TRequest,
  response: TResponse,
  middlewares: readonly Middleware<TRequest, TResponse>[],
  finalHandler: () => Promise<Result<TResponse>>
): Promise<Result<TResponse>> {
  try {
    const composedMiddleware = composeMiddleware(...middlewares);
    return await composedMiddleware(request, response, finalHandler);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Middleware execution failed')
    };
  }
}

// ========================================
// COMMON MIDDLEWARE IMPLEMENTATIONS
// ========================================

/**
 * Request logging middleware.
 * Logs incoming requests with timing and basic info.
 */
export function createRequestLoggingMiddleware<TRequest = HttpRequest, TResponse = HttpResponse>(
  logger: (message: string, data?: any) => void = console.log
): Middleware<TRequest, TResponse> {
  return async (request: TRequest, response: TResponse, next) => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Log request start
    logger(`[${requestId}] --> ${getRequestMethod(request)} ${getRequestPath(request)}`, {
      timestamp: new Date().toISOString(),
      userAgent: getUserAgent(request),
      ip: getClientIP(request)
    });

    try {
      const result = await next();

      // Log request completion
      const duration = Date.now() - startTime;
      logger(`[${requestId}] <-- ${getRequestMethod(request)} ${getRequestPath(request)}`, {
        status: result.success ? 'SUCCESS' : 'ERROR',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      // Log request error
      const duration = Date.now() - startTime;
      logger(`[${requestId}] <-- ${getRequestMethod(request)} ${getRequestPath(request)} ERROR`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  };
}

/**
 * CORS middleware for cross-origin requests.
 */
export function createCORSMiddleware<TRequest = HttpRequest, TResponse = HttpResponse>(
  config: {
    origin?: string | string[] | ((origin: string) => boolean);
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
    maxAge?: number;
  } = {}
): Middleware<TRequest, TResponse> {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    credentials = false,
    maxAge = 86400
  } = config;

  return async (request: TRequest, response: TResponse, next) => {
    // Set CORS headers
    const requestOrigin = getRequestHeader(request, 'origin');

    // Determine allowed origin
    let allowedOrigin = '*';
    if (typeof origin === 'string') {
      allowedOrigin = origin;
    } else if (Array.isArray(origin)) {
      if (requestOrigin && origin.includes(requestOrigin)) {
        allowedOrigin = requestOrigin;
      } else {
        allowedOrigin = origin[0] || '*';
      }
    } else if (typeof origin === 'function' && requestOrigin) {
      allowedOrigin = origin(requestOrigin) ? requestOrigin : 'null';
    }

    setResponseHeader(response, 'Access-Control-Allow-Origin', allowedOrigin);
    setResponseHeader(response, 'Access-Control-Allow-Methods', methods.join(', '));
    setResponseHeader(response, 'Access-Control-Allow-Headers', headers.join(', '));

    if (credentials) {
      setResponseHeader(response, 'Access-Control-Allow-Credentials', 'true');
    }

    setResponseHeader(response, 'Access-Control-Max-Age', maxAge.toString());

    // Handle preflight requests
    if (getRequestMethod(request) === 'OPTIONS') {
      setResponseStatus(response, 200);
      return { success: true, data: response };
    }

    return next();
  };
}

/**
 * JSON body parsing middleware.
 */
export function createJSONBodyParserMiddleware<TRequest = HttpRequest, TResponse = HttpResponse>(
  options: {
    limit?: string;
    strict?: boolean;
    type?: string | string[];
  } = {}
): Middleware<TRequest, TResponse> {
  const { limit = '1mb', strict = true, type = 'application/json' } = options;

  return async (request: TRequest, response: TResponse, next) => {
    const contentType = getRequestHeader(request, 'content-type') || '';

    // Check if request has JSON content type
    if (!isContentTypeMatch(contentType, type)) {
      return next(); // Skip parsing, continue to next middleware
    }

    try {
      const rawBody = getRequestBody(request);

      if (!rawBody) {
        return next(); // No body to parse
      }

      // Check body size limit (simplified check)
      if (rawBody.length > parseSizeLimit(limit)) {
        setResponseStatus(response, 413); // Payload Too Large
        return {
          success: false,
          error: new Error(`Request body too large. Maximum size: ${limit}`)
        };
      }

      const parsedBody = JSON.parse(rawBody);

      // Store parsed body on request
      setRequestBody(request, parsedBody);

      return next();
    } catch (error) {
      setResponseStatus(response, 400); // Bad Request
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Invalid JSON body')
      };
    }
  };
}

/**
 * Error handling middleware (catches and formats errors).
 */
export function createErrorHandlingMiddleware<TRequest = HttpRequest, TResponse = HttpResponse>(
  logger: (error: Error, request: TRequest) => void = console.error
): Middleware<TRequest, TResponse> {
  return async (request: TRequest, response: TResponse, next) => {
    try {
      return await next();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');

      // Log the error
      logger(err, request);

      // Format error response
      setResponseStatus(response, 500);
      setResponseBody(response, {
        success: false,
        error: {
          message: err.message,
          timestamp: new Date().toISOString(),
          path: getRequestPath(request),
          method: getRequestMethod(request)
        }
      });

      return { success: true, data: response };
    }
  };
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Generate a unique request ID.
 */
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Parse size limit string to bytes.
 */
function parseSizeLimit(limit: string): number {
  const units: Record<string, number> = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = limit.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 1024 * 1024; // Default 1MB

  const size = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(size * (units[unit] || 1));
}

/**
 * Check if content type matches.
 */
function isContentTypeMatch(contentType: string, expected: string | string[]): boolean {
  const types = Array.isArray(expected) ? expected : [expected];
  return types.some(type => contentType.includes(type));
}

// ========================================
// REQUEST/RESPONSE UTILITIES
// ========================================

// These are adapter-specific and would be implemented by the HTTP adapter
// For now, providing placeholder implementations

function getRequestMethod(request: any): string {
  return request.method || 'GET';
}

function getRequestPath(request: any): string {
  return request.url || request.path || '/';
}

function getRequestHeader(request: any, name: string): string | undefined {
  return request.headers?.[name.toLowerCase()];
}

function getRequestBody(request: any): string | undefined {
  return request.body;
}

function setRequestBody(request: any, body: any): void {
  request.parsedBody = body;
}

function getUserAgent(request: any): string | undefined {
  return getRequestHeader(request, 'user-agent');
}

function getClientIP(request: any): string | undefined {
  return getRequestHeader(request, 'x-forwarded-for') ||
         getRequestHeader(request, 'x-real-ip') ||
         request.ip ||
         'unknown';
}

function setResponseHeader(response: any, name: string, value: string): void {
  if (!response.headers) response.headers = {};
  response.headers[name.toLowerCase()] = value;
}

function setResponseStatus(response: any, status: number): void {
  response.status = status;
}

function setResponseBody(response: any, body: any): void {
  response.body = body;
}

// ========================================
// MIDDLEWARE REGISTRY
// ========================================

/**
 * Global middleware registry.
 */
export class MiddlewareRegistry {
  private readonly globalMiddleware = new Map<string, Middleware>();
  private readonly routeMiddleware = new Map<string, Map<string, Middleware[]>>();

  /**
   * Register global middleware.
   */
  registerGlobal(name: string, middleware: Middleware): void {
    this.globalMiddleware.set(name, middleware);
  }

  /**
   * Register route-specific middleware.
   */
  registerForRoute(routeKey: string, middleware: Middleware): void {
    if (!this.routeMiddleware.has(routeKey)) {
      this.routeMiddleware.set(routeKey, new Map());
    }

    const routeMiddlewares = this.routeMiddleware.get(routeKey)!;
    const existing = routeMiddlewares.get(routeKey) || [];
    routeMiddlewares.set(routeKey, [...existing, middleware]);
  }

  /**
   * Get middleware for a route (global + route-specific).
   */
  getMiddlewareForRoute(routeKey: string): Middleware[] {
    const global = Array.from(this.globalMiddleware.values());
    const routeSpecific = this.routeMiddleware.get(routeKey)?.get(routeKey) || [];

    return [...global, ...routeSpecific];
  }

  /**
   * Clear all middleware.
   */
  clear(): void {
    this.globalMiddleware.clear();
    this.routeMiddleware.clear();
  }
}

/**
 * Create a middleware registry instance.
 */
export function createMiddlewareRegistry(): MiddlewareRegistry {
  return new MiddlewareRegistry();
}
