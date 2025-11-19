/**
 * Neat Auth - Authentication Decorators
 *
 * Zero-configuration decorators for authentication and authorization
 * that work seamlessly with auto-discovery
 */

import 'reflect-metadata';
import { AuthMetadata, RouteAuthMetadata, RolesConfig, PermissionsConfig } from '../interfaces/auth.interfaces.js';

// ========================================
// METADATA KEYS
// ========================================

export const AUTH_METADATA_KEY = Symbol('neat:auth');
export const ROUTE_AUTH_METADATA_KEY = Symbol('neat:route-auth');
export const PUBLIC_ROUTE_KEY = Symbol('neat:public-route');

// ========================================
// CLASS-LEVEL DECORATORS
// ========================================

/**
 * Mark a controller class as requiring authentication
 * All routes in this controller will require authentication unless marked as @Public()
 *
 * @param options Authentication options
 */
export function AuthRequired(options?: {
  strategies?: string[];
}) {
  return function (target: any) {
    const metadata: AuthMetadata = {
      required: true,
      strategies: options?.strategies || ['jwt']
    };

    Reflect.defineMetadata(AUTH_METADATA_KEY, metadata, target);
  };
}

/**
 * Mark a controller class with role-based authorization
 * All routes in this controller will require these roles unless overridden
 *
 * @param roles Required roles
 * @param requireAll If true, user must have ALL roles; if false, user must have ANY role
 */
export function RolesRequired(roles: string[], requireAll: boolean = false) {
  return function (target: any) {
    const existingMetadata: AuthMetadata = Reflect.getMetadata(AUTH_METADATA_KEY, target) || {
      required: true,
      strategies: ['jwt']
    };

    existingMetadata.roles = { roles, requireAll };
    Reflect.defineMetadata(AUTH_METADATA_KEY, existingMetadata, target);
  };
}

/**
 * Mark a controller class with permission-based authorization
 * All routes in this controller will require these permissions unless overridden
 *
 * @param permissions Required permissions
 * @param requireAll If true, user must have ALL permissions; if false, user must have ANY permission
 */
export function PermissionsRequired(permissions: string[], requireAll: boolean = false) {
  return function (target: any) {
    const existingMetadata: AuthMetadata = Reflect.getMetadata(AUTH_METADATA_KEY, target) || {
      required: true,
      strategies: ['jwt']
    };

    existingMetadata.permissions = { permissions, requireAll };
    Reflect.defineMetadata(AUTH_METADATA_KEY, existingMetadata, target);
  };
}

// ========================================
// METHOD-LEVEL DECORATORS
// ========================================

/**
 * Mark a specific route as requiring authentication
 * Overrides class-level authentication settings
 */
export function Auth() {
  return function (target: any, propertyKey: string) {
    const metadata: RouteAuthMetadata = {
      required: true,
      strategies: ['jwt']
    };

    Reflect.defineMetadata(ROUTE_AUTH_METADATA_KEY, metadata, target.constructor, propertyKey);
  };
}

/**
 * Mark a specific route as requiring specific roles
 * Overrides class-level role requirements
 *
 * @param roles Required roles
 * @param requireAll If true, user must have ALL roles; if false, user must have ANY role
 */
export function Roles(roles: string[], requireAll: boolean = false) {
  return function (target: any, propertyKey: string) {
    const existingMetadata: RouteAuthMetadata = Reflect.getMetadata(ROUTE_AUTH_METADATA_KEY, target.constructor, propertyKey) || {
      required: true,
      strategies: ['jwt']
    };

    existingMetadata.roles = { roles, requireAll };
    Reflect.defineMetadata(ROUTE_AUTH_METADATA_KEY, existingMetadata, target.constructor, propertyKey);
  };
}

/**
 * Mark a specific route as requiring specific permissions
 * Overrides class-level permission requirements
 *
 * @param permissions Required permissions
 * @param requireAll If true, user must have ALL permissions; if false, user must have ANY permission
 */
export function Permissions(permissions: string[], requireAll: boolean = false) {
  return function (target: any, propertyKey: string) {
    const existingMetadata: RouteAuthMetadata = Reflect.getMetadata(ROUTE_AUTH_METADATA_KEY, target.constructor, propertyKey) || {
      required: true,
      strategies: ['jwt']
    };

    existingMetadata.permissions = { permissions, requireAll };
    Reflect.defineMetadata(ROUTE_AUTH_METADATA_KEY, existingMetadata, target.constructor, propertyKey);
  };
}

/**
 * Mark a route as public (no authentication required)
 * Overrides class-level authentication requirements
 */
export function Public() {
  return function (target: any, propertyKey: string) {
    const metadata: RouteAuthMetadata = {
      required: false,
      public: true
    };

    Reflect.defineMetadata(ROUTE_AUTH_METADATA_KEY, metadata, target.constructor, propertyKey);
  };
}

/**
 * Mark a route to use specific authentication strategies
 * Useful for routes that support multiple auth methods
 */
export function UseAuthStrategies(strategies: string[]) {
  return function (target: any, propertyKey?: string) {
    if (propertyKey) {
      // Method-level
      const existingMetadata: RouteAuthMetadata = Reflect.getMetadata(ROUTE_AUTH_METADATA_KEY, target.constructor, propertyKey) || {
        required: true
      };

      existingMetadata.strategies = strategies;
      Reflect.defineMetadata(ROUTE_AUTH_METADATA_KEY, existingMetadata, target.constructor, propertyKey);
    } else {
      // Class-level
      const existingMetadata: AuthMetadata = Reflect.getMetadata(AUTH_METADATA_KEY, target) || {
        required: true
      };

      existingMetadata.strategies = strategies;
      Reflect.defineMetadata(AUTH_METADATA_KEY, existingMetadata, target);
    }
  };
}

// ========================================
// METADATA RETRIEVAL HELPERS
// ========================================

/**
 * Get authentication metadata for a controller class
 */
export function getAuthMetadata(target: any): AuthMetadata | undefined {
  return Reflect.getMetadata(AUTH_METADATA_KEY, target);
}

/**
 * Get authentication metadata for a specific route
 */
export function getRouteAuthMetadata(target: any, propertyKey: string): RouteAuthMetadata | undefined {
  return Reflect.getMetadata(ROUTE_AUTH_METADATA_KEY, target, propertyKey);
}

/**
 * Check if a route is marked as public
 */
export function isRoutePublic(target: any, propertyKey: string): boolean {
  const metadata = getRouteAuthMetadata(target, propertyKey);
  return metadata?.public === true;
}

/**
 * Get effective authentication requirements for a route
 * Combines class-level and method-level metadata
 */
export function getEffectiveAuthMetadata(target: any, propertyKey: string): RouteAuthMetadata {
  const classMetadata = getAuthMetadata(target);
  const methodMetadata = getRouteAuthMetadata(target, propertyKey);

  // If method has explicit metadata, use it
  if (methodMetadata) {
    return methodMetadata;
  }

  // Otherwise, use class metadata (if any)
  if (classMetadata) {
    return {
      ...classMetadata,
      public: false // Class-level can't be public
    };
  }

  // No auth requirements
  return {
    required: false,
    public: true
  };
}

// ========================================
// UTILITY DECORATORS
// ========================================

/**
 * Inject the current authenticated user into a parameter
 * Must be used with authenticated routes
 */
export function CurrentUser() {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    // This would be processed by the dependency injection system
    // For now, we'll mark it for the auth guard to handle
    Reflect.defineMetadata(
      Symbol(`neat:param:user:${parameterIndex}`),
      { type: 'user', index: parameterIndex },
      target.constructor,
      propertyKey
    );
  };
}

/**
 * Inject user roles into a parameter
 */
export function UserRoles() {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    Reflect.defineMetadata(
      Symbol(`neat:param:roles:${parameterIndex}`),
      { type: 'roles', index: parameterIndex },
      target.constructor,
      propertyKey
    );
  };
}

/**
 * Inject user permissions into a parameter
 */
export function UserPermissions() {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    Reflect.defineMetadata(
      Symbol(`neat:param:permissions:${parameterIndex}`),
      { type: 'permissions', index: parameterIndex },
      target.constructor,
      propertyKey
    );
  };
}

// ========================================
// CONDITIONAL AUTH DECORATORS
// ========================================

/**
 * Require admin role (convenience decorator)
 */
export function AdminOnly() {
  return Roles(['admin'], true);
}

/**
 * Require moderator role (convenience decorator)
 */
export function ModeratorOnly() {
  return Roles(['moderator', 'admin'], false); // Has moderator OR admin
}

/**
 * Require user to be the owner of the resource
 * (This would need custom logic in the guard)
 */
export function OwnerOnly() {
  return function (target: any, propertyKey: string) {
    const existingMetadata: RouteAuthMetadata = Reflect.getMetadata(ROUTE_AUTH_METADATA_KEY, target.constructor, propertyKey) || {
      required: true,
      strategies: ['jwt']
    };

    existingMetadata.ownerRequired = true;
    Reflect.defineMetadata(ROUTE_AUTH_METADATA_KEY, existingMetadata, target.constructor, propertyKey);
  };
}

// ========================================
// EXPERIMENTAL DECORATORS
// ========================================

/**
 * Rate limiting decorator (future feature)
 */
export function RateLimit(requests: number, windowMs: number) {
  return function (target: any, propertyKey: string) {
    // This would integrate with a rate limiting system
    Reflect.defineMetadata(
      Symbol('neat:rate-limit'),
      { requests, windowMs },
      target.constructor,
      propertyKey
    );
  };
}

/**
 * Audit logging decorator (future feature)
 */
export function AuditLog(action?: string) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(
      Symbol('neat:audit-log'),
      { action: action || propertyKey },
      target.constructor,
      propertyKey
    );
  };
}
