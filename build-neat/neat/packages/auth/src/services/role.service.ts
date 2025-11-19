/**
 * Neat Auth - Role Service
 *
 * Manages user roles and role-based authorization
 */

import { Injectable } from '@neat/core';
import { IRoleService, User } from '../interfaces/auth.interfaces.js';

@Injectable()
export class RoleService implements IRoleService {
  // Default roles hierarchy
  private readonly roleHierarchy: Record<string, string[]> = {
    'user': [],
    'moderator': ['user'],
    'admin': ['moderator', 'user'],
    'super-admin': ['admin', 'moderator', 'user']
  };

  /**
   * Check if user has a specific role
   */
  hasRole(user: User, role: string): boolean {
    if (!user.roles) {
      return false;
    }

    // Direct role check
    if (user.roles.includes(role)) {
      return true;
    }

    // Check role hierarchy (inherited roles)
    for (const userRole of user.roles) {
      const inheritedRoles = this.getInheritedRoles(userRole);
      if (inheritedRoles.includes(role)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(user: User, roles: string[]): boolean {
    return roles.some(role => this.hasRole(user, role));
  }

  /**
   * Check if user has all of the specified roles
   */
  hasAllRoles(user: User, roles: string[]): boolean {
    return roles.every(role => this.hasRole(user, role));
  }

  /**
   * Add role to user
   */
  async addRole(userId: string | number, role: string): Promise<void> {
    // This would typically update the user in the database
    throw new Error('addRole must be implemented by extending RoleService or providing a custom implementation');
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string | number, role: string): Promise<void> {
    // This would typically update the user in the database
    throw new Error('removeRole must be implemented by extending RoleService or providing a custom implementation');
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string | number): Promise<string[]> {
    // This would typically query the database
    throw new Error('getUserRoles must be implemented by extending RoleService or providing a custom implementation');
  }

  // ========================================
  // ROLE HIERARCHY METHODS
  // ========================================

  /**
   * Get all roles inherited by a specific role
   */
  getInheritedRoles(role: string): string[] {
    const inherited: string[] = [];
    const hierarchy = this.roleHierarchy[role] || [];

    for (const parentRole of hierarchy) {
      inherited.push(parentRole);
      inherited.push(...this.getInheritedRoles(parentRole));
    }

    return [...new Set(inherited)]; // Remove duplicates
  }

  /**
   * Set role hierarchy
   */
  setRoleHierarchy(hierarchy: Record<string, string[]>): void {
    this.roleHierarchy = { ...hierarchy };
  }

  /**
   * Add role to hierarchy
   */
  addRoleToHierarchy(role: string, parentRoles: string[]): void {
    this.roleHierarchy[role] = parentRoles;
  }

  /**
   * Get all available roles
   */
  getAllRoles(): string[] {
    return Object.keys(this.roleHierarchy);
  }

  /**
   * Check if role exists in hierarchy
   */
  roleExists(role: string): boolean {
    return role in this.roleHierarchy;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Validate role name
   */
  isValidRole(role: string): boolean {
    return typeof role === 'string' && role.length > 0 && role.length <= 50;
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role: string): string {
    const displayNames: Record<string, string> = {
      'user': 'User',
      'moderator': 'Moderator',
      'admin': 'Administrator',
      'super-admin': 'Super Administrator'
    };

    return displayNames[role] || role.charAt(0).toUpperCase() + role.slice(1);
  }

  /**
   * Check if role has admin privileges
   */
  isAdminRole(role: string): boolean {
    return this.hasRole({ roles: [role] } as User, 'admin');
  }

  /**
   * Get user's highest role
   */
  getHighestRole(user: User): string | null {
    if (!user.roles || user.roles.length === 0) {
      return null;
    }

    // Define role priority (higher number = higher priority)
    const rolePriority: Record<string, number> = {
      'user': 1,
      'moderator': 2,
      'admin': 3,
      'super-admin': 4
    };

    let highestRole = user.roles[0];
    let highestPriority = rolePriority[highestRole] || 0;

    for (const role of user.roles) {
      const priority = rolePriority[role] || 0;
      if (priority > highestPriority) {
        highestRole = role;
        highestPriority = priority;
      }
    }

    return highestRole;
  }
}

// ========================================
// DEFAULT ROLE CONSTANTS
// ========================================

export const DEFAULT_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin'
} as const;

export const ADMIN_ROLES = [DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.SUPER_ADMIN] as const;
export const MODERATOR_ROLES = [DEFAULT_ROLES.MODERATOR, ...ADMIN_ROLES] as const;

// ========================================
// ROLE-BASED PERMISSIONS MAP
// ========================================

/**
 * Default permissions granted by each role
 * This can be customized based on your application's needs
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [DEFAULT_ROLES.USER]: [
    'read:own-profile',
    'update:own-profile',
    'read:public-content'
  ],
  [DEFAULT_ROLES.MODERATOR]: [
    'read:own-profile',
    'update:own-profile',
    'read:public-content',
    'moderate:content',
    'read:user-profiles',
    'update:user-status'
  ],
  [DEFAULT_ROLES.ADMIN]: [
    'read:own-profile',
    'update:own-profile',
    'read:public-content',
    'moderate:content',
    'read:user-profiles',
    'update:user-status',
    'manage:users',
    'manage:content',
    'view:analytics',
    'manage:settings'
  ],
  [DEFAULT_ROLES.SUPER_ADMIN]: [
    'read:own-profile',
    'update:own-profile',
    'read:public-content',
    'moderate:content',
    'read:user-profiles',
    'update:user-status',
    'manage:users',
    'manage:content',
    'view:analytics',
    'manage:settings',
    'manage:system',
    'view:logs',
    'manage:roles'
  ]
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Check if user has admin privileges
 */
export function isUserAdmin(user: User): boolean {
  return user.roles?.some(role => ADMIN_ROLES.includes(role as any)) || false;
}

/**
 * Check if user has moderator privileges
 */
export function isUserModerator(user: User): boolean {
  return user.roles?.some(role => MODERATOR_ROLES.includes(role as any)) || false;
}

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get all permissions for user based on their roles
 */
export function getUserPermissionsFromRoles(user: User): string[] {
  if (!user.roles) return [];

  const permissions = new Set<string>();
  for (const role of user.roles) {
    const rolePermissions = getRolePermissions(role);
    rolePermissions.forEach(permission => permissions.add(permission));
  }

  return Array.from(permissions);
}
