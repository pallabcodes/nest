/**
 * Neat Framework - Interceptor System
 *
 * Interceptors run before and after route handlers, allowing for request/response
 * transformation, logging, caching, and other cross-cutting concerns.
 *
 * Key Features:
 * - Pre-handler execution (request transformation)
 * - Post-handler execution (response transformation)
 * - Exception handling within interceptors
 * - Auto-discovery integration
 * - Type-safe context access
 *
 * Usage: Interceptors are applied via decorators and auto-discovered by the framework.
 */

import type { HttpRequest, HttpResponse } from '@neat/core';

/**
 * Interceptor execution result.
 */
export interface InterceptorResult<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: Error;
}

/**
 * Interceptor call handler.
 * Represents the next interceptor or final handler in the chain.
 */
export interface CallHandler<T = any> {
  handle(): Promise<InterceptorResult<T>>;
}

/**
 * Interceptor interface.
 * Interceptors can transform requests before handlers and responses after handlers.
 */
export interface Interceptor<TInput = any, TOutput = TInput> {
  intercept(context: InterceptorContext<TInput>, next: CallHandler<TOutput>): Promise<InterceptorResult<TOutput>>;
}

/**
 * Interceptor function signature for functional interceptors.
 */
export type InterceptorFunction<TInput = any, TOutput = TInput> = (
  context: InterceptorContext<TInput>,
  next: CallHandler<TOutput>
) => Promise<InterceptorResult<TOutput>>;

/**
 * Interceptor execution context.
 */
export interface InterceptorContext<T = any> {
  readonly request: HttpRequest;
  readonly response: HttpResponse;
  readonly route: {
    readonly method: string;
    readonly path: string;
    readonly controller: string;
    readonly handler: string;
  };
  readonly data?: T;
  readonly user?: any;
  readonly startTime: number;
}

/**
 * Interceptor metadata for auto-discovery.
 */
export interface InterceptorMetadata {
  readonly name: string;
  readonly priority: number;
  readonly global: boolean;
  readonly routes?: string[];
  readonly excludeRoutes?: string[];
}
