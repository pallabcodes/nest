/**
 * Neat Framework - Guard Decorators
 *
 * Decorators for marking classes and methods as guards.
 * Guards are auto-discovered and applied to routes based on metadata.
 */

import 'reflect-metadata';
import type { GuardMetadata } from './guard.interface';

/**
 * Metadata keys for guard reflection.
 */
export const GUARD_METADATA = Symbol('NEAT:GUARD');
export const GUARD_GLOBAL_METADATA = Symbol('NEAT:GUARD_GLOBAL');
export const GUARD_ROUTE_METADATA = Symbol('NEAT:GUARD_ROUTE');

/**
 * Mark a class as a guard.
 * Guards are auto-discovered and can be applied globally or to specific routes.
 *
 * @param metadata Guard configuration
 */
export function Guard(metadata: GuardMetadata) {
  return function (target: any) {
    Reflect.defineMetadata(GUARD_METADATA, metadata, target);

    // Mark as injectable for dependency injection
    Reflect.defineMetadata(Symbol('NEAT:INJECTABLE'), true, target);
  };
}

/**
 * Mark a class as a global guard.
 * Global guards are applied to all routes unless explicitly excluded.
 */
export function GlobalGuard() {
  return function (target: any) {
    Reflect.defineMetadata(GUARD_GLOBAL_METADATA, true, target);

    // Apply guard decorator with global settings
    Guard({
      name: target.name || 'GlobalGuard',
      priority: 0,
      global: true
    })(target);
  };
}

/**
 * Apply guards to a specific route or controller.
 * Can be used on controllers or individual route methods.
 *
 * @param guards Array of guard classes or guard names
 */
export function UseGuards(...guards: (any | string)[]) {
  return function (target: any, propertyKey?: string) {
    const metadata = {
      guards,
      target: propertyKey ? 'method' : 'class'
    };

    if (propertyKey) {
      // Method-level guard
      Reflect.defineMetadata(GUARD_ROUTE_METADATA, metadata, target.constructor, propertyKey);
    } else {
      // Class-level guard
      Reflect.defineMetadata(GUARD_ROUTE_METADATA, metadata, target);
    }
  };
}

/**
 * Require specific roles for access.
 * Automatically creates a role-based guard.
 *
 * @param roles Required roles
 */
export function RolesRequired(...roles: string[]) {
  return function (target: any, propertyKey?: string) {
    const guard = createRoleGuard(roles);

    UseGuards(guard)(target, propertyKey);
  };
}

/**
 * Require specific permissions for access.
 * Automatically creates a permission-based guard.
 *
 * @param permissions Required permissions
 */
export function PermissionsRequired(...permissions: string[]) {
  return function (target: any, propertyKey?: string) {
    const guard = createPermissionGuard(permissions);

    UseGuards(guard)(target, propertyKey);
  };
}

/**
 * Mark route as public (bypass authentication guards).
 */
export function Public() {
  return function (target: any, propertyKey?: string) {
    const metadata = { public: true };

    if (propertyKey) {
      Reflect.defineMetadata(Symbol('NEAT:PUBLIC'), metadata, target.constructor, propertyKey);
    } else {
      Reflect.defineMetadata(Symbol('NEAT:PUBLIC'), metadata, target);
    }
  };
}

/**
 * Require admin role for access.
 */
export function AdminOnly() {
  return RolesRequired('admin');
}

/**
 * Create a role-based guard dynamically.
 */
function createRoleGuard(roles: string[]): any {
  const guardName = `RoleGuard_${roles.join('_')}`;

  class RoleGuard {
    static readonly guardName = guardName;

    async canActivate(context: any): Promise<boolean> {
      const userRoles = context.roles || [];
      return roles.some(role => userRoles.includes(role));
    }
  }

  Guard({
    name: guardName,
    priority: 10,
    global: false
  })(RoleGuard);

  return RoleGuard;
}

/**
 * Create a permission-based guard dynamically.
 */
function createPermissionGuard(permissions: string[]): any {
  const guardName = `PermissionGuard_${permissions.join('_')}`;

  class PermissionGuard {
    static readonly guardName = guardName;

    async canActivate(context: any): Promise<boolean> {
      const userPermissions = context.permissions || [];
      return permissions.some(permission => userPermissions.includes(permission));
    }
  }

  Guard({
    name: guardName,
    priority: 10,
    global: false
  })(PermissionGuard);

  return PermissionGuard;
}

/**
 * Get guard metadata from a class.
 */
export function getGuardMetadata(target: any): GuardMetadata | undefined {
  return Reflect.getMetadata(GUARD_METADATA, target);
}

/**
 * Get route guard metadata.
 */
export function getRouteGuardMetadata(target: any, propertyKey?: string): any {
  if (propertyKey) {
    return Reflect.getMetadata(GUARD_ROUTE_METADATA, target.constructor, propertyKey) ||
           Reflect.getMetadata(GUARD_ROUTE_METADATA, target);
  }
  return Reflect.getMetadata(GUARD_ROUTE_METADATA, target);
}

/**
 * Check if a route is marked as public.
 */
export function isPublicRoute(target: any, propertyKey?: string): boolean {
  const metadata = propertyKey ?
    Reflect.getMetadata(Symbol('NEAT:PUBLIC'), target.constructor, propertyKey) ||
    Reflect.getMetadata(Symbol('NEAT:PUBLIC'), target) :
    Reflect.getMetadata(Symbol('NEAT:PUBLIC'), target);

  return metadata?.public === true;
}
