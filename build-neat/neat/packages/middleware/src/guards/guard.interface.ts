/**
 * Neat Framework - Guard System
 *
 * Guards determine whether a request can proceed to the route handler.
 * They are executed before the route handler and can short-circuit the request
 * by throwing exceptions or returning false.
 *
 * Key Features:
 * - Authorization logic (roles, permissions, custom logic)
 * - Short-circuit capability (can stop request processing)
 * - Auto-discovery integration
 * - Type-safe context access
 *
 * Usage: Guards are applied via decorators and auto-discovered by the framework.
 */

import type { HttpRequest, HttpResponse } from '@neat/core';
import type { ExecutionContext } from '../interfaces/execution-context.interface';

/**
 * Guard execution result.
 * Can return boolean or throw an exception.
 */
export type GuardResult = boolean | Promise<boolean>;

/**
 * Guard interface.
 * Guards can be classes with canActivate method or functions.
 */
export interface Guard {
  canActivate(context: ExecutionContext): GuardResult;
}

/**
 * Guard function signature for functional guards.
 */
export type GuardFunction = (context: ExecutionContext) => GuardResult;

/**
 * Guard metadata for auto-discovery.
 */
export interface GuardMetadata {
  readonly name: string;
  readonly priority: number;
  readonly global: boolean;
  readonly routes?: string[];
  readonly excludeRoutes?: string[];
}

/**
 * Guard execution context.
 * Provides access to request, response, route info, and user data.
 */
export interface GuardContext extends ExecutionContext {
  readonly user?: any;
  readonly roles?: string[];
  readonly permissions?: string[];
  readonly route: {
    readonly method: string;
    readonly path: string;
    readonly controller: string;
    readonly handler: string;
  };
}
