/**
 * Neat Framework - Execution Context
 *
 * Unified execution context interface used across all middleware components.
 * Provides access to request, response, route info, and user data.
 */

import type { HttpRequest, HttpResponse } from '@neat/core';

/**
 * Execution context available to all middleware components.
 * Guards, interceptors, pipes, and exception filters all receive this context.
 */
export interface ExecutionContext {
  readonly request: HttpRequest;
  readonly response: HttpResponse;
  readonly route?: {
    readonly method: string;
    readonly path: string;
    readonly controller: string;
    readonly handler: string;
  };
  readonly user?: any;
  readonly roles?: string[];
  readonly permissions?: string[];
  readonly data?: any;
  readonly startTime?: number;
}
