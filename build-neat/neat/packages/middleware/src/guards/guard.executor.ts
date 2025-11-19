/**
 * Neat Framework - Guard Executor
 *
 * Executes guards in priority order and handles authorization logic.
 * Guards can short-circuit requests by returning false or throwing exceptions.
 */

import type { HttpRequest, HttpResponse } from '@neat/core';
import type { Guard, GuardContext, GuardResult } from './guard.interface';
import { getGuardMetadata, isPublicRoute } from './guard.decorators';

/**
 * Guard execution result.
 */
export interface GuardExecutionResult {
  readonly allowed: boolean;
  readonly guard?: string;
  readonly error?: Error;
}

/**
 * Guard executor that manages guard execution lifecycle.
 */
export class GuardExecutor {
  private readonly guards = new Map<string, Guard>();

  /**
   * Register a guard instance.
   */
  registerGuard(name: string, guard: Guard): void {
    this.guards.set(name, guard);
  }

  /**
   * Execute guards for a route.
   * Returns true if all guards pass, false if any guard fails.
   */
  async executeGuards(
    context: GuardContext,
    guardNames: string[]
  ): Promise<GuardExecutionResult> {
    // Check if route is public
    if (isPublicRoute(context.route.controller as any, context.route.handler)) {
      return { allowed: true };
    }

    // Execute guards in order
    for (const guardName of guardNames) {
      const guard = this.guards.get(guardName);

      if (!guard) {
        throw new Error(`Guard '${guardName}' not found. Make sure it's registered.`);
      }

      try {
        const result: GuardResult = await guard.canActivate(context);

        if (result === false) {
          return {
            allowed: false,
            guard: guardName,
            error: new Error(`Access denied by guard '${guardName}'`)
          };
        }
      } catch (error) {
        return {
          allowed: false,
          guard: guardName,
          error: error instanceof Error ? error : new Error('Guard execution failed')
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get all registered guards.
   */
  getRegisteredGuards(): string[] {
    return Array.from(this.guards.keys());
  }

  /**
   * Clear all registered guards.
   */
  clearGuards(): void {
    this.guards.clear();
  }
}

/**
 * Create a guard executor instance.
 */
export function createGuardExecutor(): GuardExecutor {
  return new GuardExecutor();
}

/**
 * Convert HTTP request/response to guard context.
 */
export function createGuardContext(
  request: HttpRequest,
  response: HttpResponse,
  routeInfo: {
    method: string;
    path: string;
    controller: string;
    handler: string;
  },
  user?: any
): GuardContext {
  return {
    request,
    response,
    route: routeInfo,
    user,
    roles: user?.roles || [],
    permissions: user?.permissions || []
  };
}
