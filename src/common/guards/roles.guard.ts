import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '@shared-types/auth';

/**
 * RolesGuard - Role-based access control guard
 * 
 * Protects routes based on user roles. Must be used after JwtAuthGuard.
 * 
 * Supports multiple role formats for backward compatibility:
 * 1. New system: user.roles (array of strings from AuthenticatedUser)
 * 2. Legacy: user.role (single role string)
 * 3. Legacy: user.roleNames (array of strings)
 * 
 * Role matching is case-insensitive: 'admin' matches 'ADMIN', 'Admin', etc.
 * 
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN')
 * @Put(':id')
 * async update() { ... }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || !Array.isArray(requiredRoles) || requiredRoles.length === 0) {
      return true;
    }

    // Normalize and validate required roles
    const normalizedRequiredRoles = requiredRoles
      .filter((r): r is string => r != null && typeof r === 'string' && r.trim().length > 0)
      .map((r) => r.trim().toLowerCase());

    // If no valid roles after filtering, allow access (no valid roles to check)
    if (normalizedRequiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    // User must be authenticated (JwtAuthGuard should run first)
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required roles
    const hasRole = this.checkUserRoles(user, normalizedRequiredRoles);

    if (!hasRole) {
      const userRoles = this.getUserRoles(user);
      throw new ForbiddenException(
        `Access denied. Required roles: ${normalizedRequiredRoles.join(', ')}. Your roles: ${userRoles.join(', ') || 'none'}`,
      );
    }

    return true;
  }

  /**
   * Check if user has any of the required roles
   * 
   * Routes to appropriate method based on user role format.
   * Uses OR logic: user needs ANY of the required roles.
   * 
   * @param user - Authenticated user object (from request.user)
   * @param normalizedRequiredRoles - Already normalized array of required role names (lowercase)
   * @returns true if user has at least one required role, false otherwise
   */
  private checkUserRoles(user: AuthenticatedUser | any, normalizedRequiredRoles: string[]): boolean {
    // New Role-based system: user.roles is an array (from AuthenticatedUser) -> currenly using
    if (user.roles && Array.isArray(user.roles)) {
      return this.checkUserRolesArr(user.roles, normalizedRequiredRoles);
    }

    // Legacy system: user.role is a single role string
    if (user.role && typeof user.role === 'string') {
      return this.checkUserRolesStr(user.role, normalizedRequiredRoles);
    }

    if (user.roleNames && Array.isArray(user.roleNames)) {
      return this.checkUserRolesArr(user.roleNames, normalizedRequiredRoles);
    }

    return false;
  }

  /**
   * Check if user has required roles when user roles are stored as an array
   * 
   * @param userRoles - Array of user roles (can be strings or objects with name property)
   * @param normalizedRequiredRoles - Normalized array of required role names (lowercase)
   * @returns true if user has ANY of the required roles (OR logic)
   */
  private checkUserRolesArr(userRoles: any[], normalizedRequiredRoles: string[]): boolean {
    // Extract and normalize user role names
    const userRoleNames = userRoles
      .map((role: any) => {
        const roleName = typeof role === 'string' ? role : role?.name;
        return roleName && typeof roleName === 'string' ? roleName.trim().toLowerCase() : null;
      })
      .filter((r): r is string => r != null);

    // Check if user has ANY of the required roles (OR logic)
    // Returns true if at least one required role exists in user's roles
    return normalizedRequiredRoles.some((requiredRole) => userRoleNames.includes(requiredRole));
  }

  /**
   * Check if user has required roles when user role is stored as a single string
   * 
   * @param userRole - Single user role string
   * @param normalizedRequiredRoles - Normalized array of required role names (lowercase)
   * @returns true if user's role matches ANY of the required roles (OR logic)
   */
  private checkUserRolesStr(userRole: string, normalizedRequiredRoles: string[]): boolean {
    const normalizedUserRole = userRole.trim().toLowerCase();
    // Check if user's single role matches ANY of the required roles
    return normalizedRequiredRoles.includes(normalizedUserRole);
  }

  /**
   * Get user roles as array of strings for error messages
   * 
   * Extracts roles from user object, supporting multiple formats.
   * Used to provide helpful error messages when access is denied.
   * 
   * @param user - Authenticated user object
   * @returns Array of role names (normalized to strings)
   */
  private getUserRoles(user: AuthenticatedUser | any): string[] {
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles.map((role: any) => (typeof role === 'string' ? role : role.name));
    }
    if (user.role) {
      return [user.role];
    }
    if (user.roleNames && Array.isArray(user.roleNames)) {
      return user.roleNames;
    }
    return [];
  }
}
