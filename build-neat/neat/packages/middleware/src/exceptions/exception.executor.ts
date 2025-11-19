/**
 * Neat Framework - Exception Filter Executor
 *
 * Executes exception filters to handle and format errors into HTTP responses.
 * Filters are selected based on exception type and priority.
 */

import type { HttpRequest, HttpResponse } from '@neat/core';
import type {
  ExceptionFilter,
  ExceptionFilterResult,
  ExceptionFilterContext
} from './exception.interface';

/**
 * Exception filter execution result.
 */
export interface ExceptionFilterExecutionResult {
  readonly handled: boolean;
  readonly result?: ExceptionFilterResult;
  readonly filter?: string;
}

/**
 * Exception filter executor that manages error handling.
 */
export class ExceptionFilterExecutor {
  private readonly filters = new Map<string, ExceptionFilter>();
  private readonly filterMetadata = new Map<string, { exceptionTypes?: string[]; priority: number }>();

  /**
   * Register an exception filter instance.
   */
  registerFilter(name: string, filter: ExceptionFilter, metadata?: { exceptionTypes?: string[]; priority: number }): void {
    this.filters.set(name, filter);
    if (metadata) {
      this.filterMetadata.set(name, metadata);
    }
  }

  /**
   * Execute exception filters for an error.
   * Returns the first filter that can handle the exception.
   */
  handleException(
    exception: Error,
    context: ExceptionFilterContext,
    filterNames?: string[]
  ): ExceptionFilterExecutionResult {
    const applicableFilters = this.getApplicableFilters(exception, filterNames);

    for (const { name, filter } of applicableFilters) {
      try {
        const result = filter.catch(exception, context);
        return {
          handled: true,
          result,
          filter: name
        };
      } catch (filterError) {
        // Filter failed, try next one
        console.warn(`Exception filter '${name}' failed:`, filterError);
      }
    }

    // No filter handled the exception
    return { handled: false };
  }

  /**
   * Get filters that can handle the given exception.
   */
  private getApplicableFilters(exception: Error, filterNames?: string[]): Array<{ name: string; filter: ExceptionFilter }> {
    let candidates: string[];

    if (filterNames && filterNames.length > 0) {
      candidates = filterNames;
    } else {
      // Get all registered filters
      candidates = Array.from(this.filters.keys());
    }

    // Filter by exception type and sort by priority
    const applicable = candidates
      .map(name => ({
        name,
        filter: this.filters.get(name)!,
        metadata: this.filterMetadata.get(name)
      }))
      .filter(({ metadata }) => {
        if (!metadata?.exceptionTypes) return true; // Global filter
        return metadata.exceptionTypes.some(type =>
          exception.name === type ||
          exception.constructor.name === type ||
          (exception as any).errorCode === type
        );
      })
      .sort((a, b) => (a.metadata?.priority || 0) - (b.metadata?.priority || 0));

    return applicable.map(({ name, filter }) => ({ name, filter }));
  }

  /**
   * Get all registered exception filters.
   */
  getRegisteredFilters(): string[] {
    return Array.from(this.filters.keys());
  }

  /**
   * Clear all registered exception filters.
   */
  clearFilters(): void {
    this.filters.clear();
    this.filterMetadata.clear();
  }
}

/**
 * Create an exception filter executor instance.
 */
export function createExceptionFilterExecutor(): ExceptionFilterExecutor {
  return new ExceptionFilterExecutor();
}

/**
 * Create exception filter context from HTTP request/response.
 */
export function createExceptionFilterContext(
  request: HttpRequest,
  response: HttpResponse,
  routeInfo?: {
    method: string;
    path: string;
    controller: string;
    handler: string;
  },
  user?: any
): ExceptionFilterContext {
  return {
    request,
    response,
    route: routeInfo,
    user,
    timestamp: new Date()
  };
}
