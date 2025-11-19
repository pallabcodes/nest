/**
 * Neat Framework - Interceptor Executor
 *
 * Executes interceptors in priority order, allowing request/response transformation.
 * Interceptors can modify data before and after route handler execution.
 */

import type { HttpRequest, HttpResponse } from '@neat/core';
import type {
  Interceptor,
  InterceptorResult,
  InterceptorContext,
  CallHandler
} from './interceptor.interface';

/**
 * Interceptor execution result.
 */
export interface InterceptorExecutionResult<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: Error;
  readonly executionTime: number;
}

/**
 * Call handler implementation for interceptor chaining.
 */
class CallHandlerImpl<T = any> implements CallHandler<T> {
  constructor(
    private readonly interceptors: Interceptor[],
    private readonly context: InterceptorContext,
    private readonly finalHandler: () => Promise<InterceptorResult<T>>,
    private readonly index: number = 0
  ) {}

  async handle(): Promise<InterceptorResult<T>> {
    if (this.index >= this.interceptors.length) {
      // All interceptors executed, call final handler
      return this.finalHandler();
    }

    const interceptor = this.interceptors[this.index];
    const nextHandler = new CallHandlerImpl(
      this.interceptors,
      this.context,
      this.finalHandler,
      this.index + 1
    );

    return interceptor.intercept(this.context, nextHandler);
  }
}

/**
 * Interceptor executor that manages interceptor execution lifecycle.
 */
export class InterceptorExecutor {
  private readonly interceptors = new Map<string, Interceptor>();

  /**
   * Register an interceptor instance.
   */
  registerInterceptor(name: string, interceptor: Interceptor): void {
    this.interceptors.set(name, interceptor);
  }

  /**
   * Execute interceptors for a route.
   */
  async executeInterceptors<T = any>(
    context: InterceptorContext,
    interceptorNames: string[],
    finalHandler: () => Promise<InterceptorResult<T>>
  ): Promise<InterceptorExecutionResult<T>> {
    const startTime = Date.now();

    try {
      // Get interceptor instances
      const interceptorInstances: Interceptor[] = [];
      for (const name of interceptorNames) {
        const interceptor = this.interceptors.get(name);
        if (!interceptor) {
          throw new Error(`Interceptor '${name}' not found. Make sure it's registered.`);
        }
        interceptorInstances.push(interceptor);
      }

      // Create call handler chain
      const callHandler = new CallHandlerImpl(
        interceptorInstances,
        context,
        finalHandler
      );

      // Execute interceptor chain
      const result = await callHandler.handle();

      const executionTime = Date.now() - startTime;

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Interceptor execution failed'),
        executionTime
      };
    }
  }

  /**
   * Get all registered interceptors.
   */
  getRegisteredInterceptors(): string[] {
    return Array.from(this.interceptors.keys());
  }

  /**
   * Clear all registered interceptors.
   */
  clearInterceptors(): void {
    this.interceptors.clear();
  }
}

/**
 * Create an interceptor executor instance.
 */
export function createInterceptorExecutor(): InterceptorExecutor {
  return new InterceptorExecutor();
}

/**
 * Create interceptor context from HTTP request/response.
 */
export function createInterceptorContext(
  request: HttpRequest,
  response: HttpResponse,
  routeInfo: {
    method: string;
    path: string;
    controller: string;
    handler: string;
  },
  data?: any,
  user?: any
): InterceptorContext {
  return {
    request,
    response,
    route: routeInfo,
    data,
    user,
    startTime: Date.now()
  };
}
