/**
 * Neat Auth - Authentication Guards
 *
 * Guards that protect routes and enforce authentication/authorization
 * Automatically discovered and applied by the framework
 */

import { Injectable } from '@neat/core';
import {
  AuthGuardContext,
  AuthGuardResult,
  AuthUser,
  RouteAuthMetadata,
  ForbiddenError,
  UnauthorizedError
} from '../interfaces/auth.interfaces.js';
import { getEffectiveAuthMetadata } from '../decorators/auth.decorators.js';
import { AuthService } from '../services/auth.service.js';
import { RoleService } from './role.service.js';
import { PermissionService } from './permission.service.js';

@Injectable()
export class AuthGuard {
  constructor(
    private readonly authService: AuthService,
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService
  ) {}

  /**
   * Main authentication guard
   * Checks if request has valid authentication and required permissions
   */
  async canActivate(context: AuthGuardContext): Promise<AuthGuardResult> {
    const { request } = context;

    // Get authentication metadata for this route
    const metadata = this.getRouteMetadata(request);

    // If route is public, allow access
    if (metadata.public) {
      return true;
    }

    // If auth is not required, allow access
    if (!metadata.required) {
      return true;
    }

    // Extract and validate token
    const user = await this.authenticateRequest(request);
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Store user in request for use in controllers
    (request as any).user = user;

    // Check role requirements
    if (metadata.roles) {
      const hasRequiredRoles = this.checkRoles(user, metadata.roles);
      if (!hasRequiredRoles) {
        throw new ForbiddenError('Insufficient role permissions');
      }
    }

    // Check permission requirements
    if (metadata.permissions) {
      const hasRequiredPermissions = this.checkPermissions(user, metadata.permissions);
      if (!hasRequiredPermissions) {
        throw new ForbiddenError('Insufficient permissions');
      }
    }

    return true;
  }

  /**
   * JWT-specific guard
   */
  async jwtGuard(context: AuthGuardContext): Promise<AuthGuardResult> {
    const { request } = context;
    const user = await this.authenticateRequest(request);

    if (!user) {
      throw new UnauthorizedError('JWT authentication required');
    }

    (request as any).user = user;
    return true;
  }

  /**
   * Role-based authorization guard
   */
  async roleGuard(context: AuthGuardContext, requiredRoles: string[], requireAll: boolean = false): Promise<AuthGuardResult> {
    const { request } = context;
    const user = (request as any).user as AuthUser;

    if (!user) {
      throw new UnauthorizedError('Authentication required for role check');
    }

    const hasRoles = requireAll
      ? this.roleService.hasAllRoles(user, requiredRoles)
      : this.roleService.hasAnyRole(user, requiredRoles);

    if (!hasRoles) {
      throw new ForbiddenError(`Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }

  /**
   * Permission-based authorization guard
   */
  async permissionGuard(context: AuthGuardContext, requiredPermissions: string[], requireAll: boolean = false): Promise<AuthGuardResult> {
    const { request } = context;
    const user = (request as any).user as AuthUser;

    if (!user) {
      throw new UnauthorizedError('Authentication required for permission check');
    }

    const hasPermissions = requireAll
      ? this.permissionService.hasAllPermissions(user, requiredPermissions)
      : this.permissionService.hasAnyPermission(user, requiredPermissions);

    if (!hasPermissions) {
      throw new ForbiddenError(`Required permissions: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }

  /**
   * Owner-only guard (checks if user owns the resource)
   */
  async ownerGuard(context: AuthGuardContext, resourceOwnerId: string | number): Promise<AuthGuardResult> {
    const { request } = context;
    const user = (request as any).user as AuthUser;

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (user.id !== resourceOwnerId) {
      throw new ForbiddenError('Access denied: not the resource owner');
    }

    return true;
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private getRouteMetadata(request: any): RouteAuthMetadata {
    // This would be implemented to extract metadata from the route
    // For now, return default (no auth required)
    return {
      required: false,
      public: true
    };
  }

  private async authenticateRequest(request: any): Promise<AuthUser | null> {
    // Extract token from Authorization header
    const authHeader = request.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = await this.authService.validateToken(token);
      if (!payload) {
        return null;
      }

      // Get full user data
      const user = await this.authService.findUserById(payload.sub);
      if (!user) {
        return null;
      }

      // Return user with auth-specific data
      return {
        ...user,
        tokenVersion: payload.tokenVersion
      };
    } catch (error) {
      return null;
    }
  }

  private checkRoles(user: AuthUser, rolesConfig: any): boolean {
    const { roles, requireAll = false } = rolesConfig;

    if (!user.roles) {
      return false;
    }

    return requireAll
      ? this.roleService.hasAllRoles(user, roles)
      : this.roleService.hasAnyRole(user, roles);
  }

  private checkPermissions(user: AuthUser, permissionsConfig: any): boolean {
    const { permissions, requireAll = false } = permissionsConfig;

    if (!user.permissions) {
      return false;
    }

    return requireAll
      ? this.permissionService.hasAllPermissions(user, permissions)
      : this.permissionService.hasAnyPermission(user, permissions);
  }
}

// ========================================
// SPECIFIC GUARDS
// ========================================

/**
 * JWT Authentication Guard
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard {
  async canActivate(context: AuthGuardContext): Promise<AuthGuardResult> {
    return this.jwtGuard(context);
  }
}

/**
 * Admin-only Guard
 */
@Injectable()
export class AdminGuard extends AuthGuard {
  async canActivate(context: AuthGuardContext): Promise<AuthGuardResult> {
    return this.roleGuard(context, ['admin'], true);
  }
}

/**
 * Moderator Guard (moderator or admin)
 */
@Injectable()
export class ModeratorGuard extends AuthGuard {
  async canActivate(context: AuthGuardContext): Promise<AuthGuardResult> {
    return this.roleGuard(context, ['moderator', 'admin'], false);
  }
}

/**
 * Owner-only Guard
 */
@Injectable()
export class OwnerGuard extends AuthGuard {
  async canActivate(context: AuthGuardContext): Promise<AuthGuardResult> {
    // This would need additional context about the resource owner
    // For now, just check if user is authenticated
    const { request } = context;
    const user = (request as any).user;

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    return true;
  }
}

// ========================================
// GUARD REGISTRY
// ========================================

/**
 * Registry of available guards for auto-discovery
 */
export const guardRegistry = new Map<string, any>([
  ['auth', AuthGuard],
  ['jwt', JwtAuthGuard],
  ['admin', AdminGuard],
  ['moderator', ModeratorGuard],
  ['owner', OwnerGuard]
]);

/**
 * Register a custom guard
 */
export function registerGuard(name: string, guardClass: any) {
  guardRegistry.set(name, guardClass);
}

/**
 * Get guard by name
 */
export function getGuard(name: string): any {
  return guardRegistry.get(name);
}

/**
 * Get all registered guards
 */
export function getAllGuards(): Map<string, any> {
  return new Map(guardRegistry);
}
