/**
 * Neat Framework - Middleware Types
 *
 * Type definitions for the middleware system providing cross-cutting concerns
 * like authentication, logging, and request processing in HTTP applications.
 *
 * Key TypeScript Excellence Features:
 * - Generic middleware types with proper contravariance/covariance
 * - Type-safe middleware composition and execution
 * - Branded types for middleware identification
 * - Discriminated unions for middleware configuration
 *
 * Framework Integration: Foundation for enterprise-grade HTTP middleware
 * with compile-time guarantees and runtime safety.
 */

import type { HttpRequest, HttpResponse } from '../types/handler.js';
import type { Result } from '../types/results.js';

// ========================================
// CORE MIDDLEWARE TYPES
// ========================================

/**
 * God-moded TypeScript: Generic middleware types with functional composition support.
 */

/**
 * Core middleware function signature.
 * Takes request, response, and next function, returns a Result.
 * Properly typed for contravariance in request and covariance in response.
 */
export type Middleware<
  TInputRequest = HttpRequest,
  TOutputResponse = HttpResponse
> = (
  request: TInputRequest,
  response: TOutputResponse,
  next: () => Promise<Result<TOutputResponse>>
) => Promise<Result<TOutputResponse>>;

/**
 * Middleware factory for creating parameterized middleware.
 * Allows configuration at registration time.
 */
export type MiddlewareFactory<
  TConfig = any,
  TInputRequest = HttpRequest,
  TOutputResponse = HttpResponse
> = (
  config: TConfig
) => Middleware<TInputRequest, TOutputResponse>;

/**
 * Middleware execution context with route information.
 */
export interface MiddlewareContext<
  TRequest = HttpRequest,
  TResponse = HttpResponse
> {
  readonly request: TRequest;
  readonly response: TResponse;
  readonly route?: {
    readonly method: string;
    readonly path: string;
    readonly handler: string;
  };
  readonly metadata?: Record<string, any>;
}

// ========================================
// MIDDLEWARE METADATA
// ========================================

/**
 * Middleware scope - global or route-specific.
 */
export type MiddlewareScope = 'global' | 'route';

/**
 * Middleware priority for execution order.
 * Lower numbers execute first.
 */
export type MiddlewarePriority = number;

/**
 * Middleware metadata for decorator-based configuration.
 */
export interface MiddlewareMetadata {
  readonly name: string;
  readonly scope: MiddlewareScope;
  readonly priority: MiddlewarePriority;
  readonly config?: any;
  readonly dependencies?: readonly string[];
}

/**
 * Branded middleware identifier for type safety.
 */
export type MiddlewareId = string & { readonly __brand: 'MiddlewareId' };

/**
 * Middleware registration options.
 */
export interface MiddlewareRegistrationOptions {
  readonly priority?: MiddlewarePriority;
  readonly dependencies?: readonly MiddlewareId[];
  readonly condition?: (context: MiddlewareContext) => boolean;
}

// ========================================
// MIDDLEWARE EXECUTION
// ========================================

/**
 * Middleware chain execution result.
 */
export interface MiddlewareExecutionResult<TResponse = HttpResponse> {
  readonly success: boolean;
  readonly response: TResponse;
  readonly error?: Error;
  readonly duration?: number;
  readonly executedMiddleware?: readonly string[];
}

/**
 * Middleware chain configuration.
 */
export interface MiddlewareChainConfig {
  readonly enableTiming?: boolean;
  readonly maxExecutionTime?: number;
  readonly errorHandler?: (error: Error, context: MiddlewareContext) => void;
  readonly skipConditions?: readonly ((context: MiddlewareContext) => boolean)[];
}

// ========================================
// COMMON MIDDLEWARE INTERFACES
// ========================================

/**
 * CORS middleware configuration.
 */
export interface CORSMiddlewareConfig {
  readonly origin?: string | string[] | ((origin: string) => boolean);
  readonly methods?: readonly string[];
  readonly headers?: readonly string[];
  readonly credentials?: boolean;
  readonly maxAge?: number;
}

/**
 * Body parser middleware configuration.
 */
export interface BodyParserMiddlewareConfig {
  readonly limit?: string;
  readonly strict?: boolean;
  readonly type?: string | readonly string[];
  readonly encoding?: string;
}

/**
 * Rate limiting middleware configuration.
 */
export interface RateLimitMiddlewareConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly keyGenerator?: (request: HttpRequest) => string;
  readonly skipSuccessfulRequests?: boolean;
  readonly skipFailedRequests?: boolean;
}

/**
 * Authentication middleware configuration.
 */
export interface AuthMiddlewareConfig {
  readonly scheme?: string;
  readonly realm?: string;
  readonly validators?: readonly AuthValidator[];
  readonly optional?: boolean;
}

/**
 * Authentication validator function.
 */
export type AuthValidator = (
  credentials: any,
  context: MiddlewareContext
) => Promise<Result<AuthUser>>;

/**
 * Authenticated user information.
 */
export interface AuthUser {
  readonly id: string;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
  readonly metadata?: Record<string, any>;
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Middleware composition utility type.
 */
export type ComposedMiddleware<
  TRequest = HttpRequest,
  TResponse = HttpResponse
> = Middleware<TRequest, TResponse>;

/**
 * Conditional middleware that may or may not execute.
 */
export type ConditionalMiddleware<
  TRequest = HttpRequest,
  TResponse = HttpResponse
> = (
  condition: (context: MiddlewareContext<TRequest, TResponse>) => boolean
) => Middleware<TRequest, TResponse>;

/**
 * Middleware that can transform the request type.
 */
export type RequestTransformerMiddleware<
  TInputRequest = HttpRequest,
  TOutputRequest = TInputRequest,
  TResponse = HttpResponse
> = (
  request: TInputRequest,
  response: TResponse,
  next: (transformedRequest: TOutputRequest) => Promise<Result<TResponse>>
) => Promise<Result<TResponse>>;

// ========================================
// BRANDED TYPE CONSTRUCTORS
// ========================================

/**
 * Create a branded middleware ID.
 */
export function brandMiddlewareId(id: string): MiddlewareId {
  return id as MiddlewareId;
}

/**
 * Type guard for middleware ID.
 */
export function isMiddlewareId(value: any): value is MiddlewareId {
  return typeof value === 'string' && value.length > 0;
}

// ========================================
// TYPE GUARDS
// ========================================

/**
 * Check if a function is a middleware.
 */
export function isMiddleware(value: any): value is Middleware {
  return typeof value === 'function' && value.length === 3;
}

/**
 * Check if a function is a middleware factory.
 */
export function isMiddlewareFactory(value: any): value is MiddlewareFactory {
  return typeof value === 'function' && value.length === 1;
}

/**
 * Validate middleware metadata.
 */
export function isValidMiddlewareMetadata(value: any): value is MiddlewareMetadata {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    (value.scope === 'global' || value.scope === 'route') &&
    typeof value.priority === 'number'
  );
}
