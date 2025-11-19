/**
 * Neat Auth - Permission Service
 *
 * Manages user permissions and permission-based authorization
 */

import { Injectable } from '@neat/core';
import { IPermissionService, User } from '../interfaces/auth.interfaces.js';

@Injectable()
export class PermissionService implements IPermissionService {
  /**
   * Check if user has a specific permission
   */
  hasPermission(user: User, permission: string): boolean {
    if (!user.permissions) {
      return false;
    }

    return user.permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(user: User, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(user: User, permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  /**
   * Add permission to user
   */
  async addPermission(userId: string | number, permission: string): Promise<void> {
    // This would typically update the user in the database
    throw new Error('addPermission must be implemented by extending PermissionService or providing a custom implementation');
  }

  /**
   * Remove permission from user
   */
  async removePermission(userId: string | number, permission: string): Promise<void> {
    // This would typically update the user in the database
    throw new Error('removePermission must be implemented by extending PermissionService or providing a custom implementation');
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string | number): Promise<string[]> {
    // This would typically query the database
    throw new Error('getUserPermissions must be implemented by extending PermissionService or providing a custom implementation');
  }

  // ========================================
  // PERMISSION UTILITIES
  // ========================================

  /**
   * Check if permission string is valid
   */
  isValidPermission(permission: string): boolean {
    // Basic validation: action:resource format
    const parts = permission.split(':');
    return parts.length >= 2 && parts.every(part => part.length > 0);
  }

  /**
   * Parse permission into action and resource
   */
  parsePermission(permission: string): { action: string; resource: string; scope?: string } {
    const parts = permission.split(':');
    return {
      action: parts[0],
      resource: parts[1],
      scope: parts[2]
    };
  }

  /**
   * Check if user has permission with wildcard support
   * e.g., "read:*" matches "read:users", "read:posts", etc.
   */
  hasPermissionWithWildcards(user: User, permission: string): boolean {
    if (!user.permissions) {
      return false;
    }

    // Direct match
    if (user.permissions.includes(permission)) {
      return true;
    }

    // Check wildcards
    const { action, resource } = this.parsePermission(permission);

    // Check action wildcards (e.g., "*:users" or "read:*")
    for (const userPermission of user.permissions) {
      const { action: userAction, resource: userResource } = this.parsePermission(userPermission);

      if ((userAction === '*' || userAction === action) &&
          (userResource === '*' || userResource === resource)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get permissions matching a pattern
   */
  getPermissionsMatching(user: User, pattern: string): string[] {
    if (!user.permissions) {
      return [];
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return user.permissions.filter(permission => regex.test(permission));
  }

  /**
   * Group permissions by resource
   */
  groupPermissionsByResource(permissions: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};

    for (const permission of permissions) {
      const { resource } = this.parsePermission(permission);
      if (!groups[resource]) {
        groups[resource] = [];
      }
      groups[resource].push(permission);
    }

    return groups;
  }

  // ========================================
  // BULK OPERATIONS
  // ========================================

  /**
   * Add multiple permissions to user
   */
  async addPermissions(userId: string | number, permissions: string[]): Promise<void> {
    for (const permission of permissions) {
      await this.addPermission(userId, permission);
    }
  }

  /**
   * Remove multiple permissions from user
   */
  async removePermissions(userId: string | number, permissions: string[]): Promise<void> {
    for (const permission of permissions) {
      await this.removePermission(userId, permission);
    }
  }

  /**
   * Set user's permissions (replace all)
   */
  async setUserPermissions(userId: string | number, permissions: string[]): Promise<void> {
    // This would typically replace all permissions for the user
    throw new Error('setUserPermissions must be implemented by extending PermissionService or providing a custom implementation');
  }

  /**
   * Clear all permissions from user
   */
  async clearUserPermissions(userId: string | number): Promise<void> {
    // This would typically remove all permissions from the user
    throw new Error('clearUserPermissions must be implemented by extending PermissionService or providing a custom implementation');
  }

  // ========================================
  // PERMISSION TEMPLATES
  // ========================================

  /**
   * Get predefined permission templates
   */
  getPermissionTemplates(): Record<string, string[]> {
    return {
      basic: [
        'read:own-profile',
        'update:own-profile',
        'read:public-content'
      ],
      moderator: [
        'read:own-profile',
        'update:own-profile',
        'read:public-content',
        'moderate:content',
        'read:user-profiles',
        'update:user-status'
      ],
      admin: [
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
      superAdmin: [
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
        'manage:roles',
        'manage:permissions'
      ]
    };
  }

  /**
   * Apply permission template to user
   */
  async applyPermissionTemplate(userId: string | number, templateName: string): Promise<void> {
    const templates = this.getPermissionTemplates();
    const permissions = templates[templateName];

    if (!permissions) {
      throw new Error(`Permission template '${templateName}' not found`);
    }

    await this.setUserPermissions(userId, permissions);
  }
}

// ========================================
// COMMON PERMISSION CONSTANTS
// ========================================

export const COMMON_PERMISSIONS = {
  // Profile permissions
  READ_OWN_PROFILE: 'read:own-profile',
  UPDATE_OWN_PROFILE: 'update:own-profile',

  // User management
  READ_USERS: 'read:users',
  CREATE_USERS: 'create:users',
  UPDATE_USERS: 'update:users',
  DELETE_USERS: 'delete:users',
  MANAGE_USERS: 'manage:users',

  // Content management
  READ_CONTENT: 'read:content',
  CREATE_CONTENT: 'create:content',
  UPDATE_CONTENT: 'update:content',
  DELETE_CONTENT: 'delete:content',
  MANAGE_CONTENT: 'manage:content',
  MODERATE_CONTENT: 'moderate:content',

  // System permissions
  VIEW_ANALYTICS: 'view:analytics',
  MANAGE_SETTINGS: 'manage:settings',
  VIEW_LOGS: 'view:logs',
  MANAGE_SYSTEM: 'manage:system',

  // Role and permission management
  MANAGE_ROLES: 'manage:roles',
  MANAGE_PERMISSIONS: 'manage:permissions',

  // Wildcard permissions
  READ_ALL: 'read:*',
  MANAGE_ALL: 'manage:*',
  ADMIN_ALL: '*:*'
} as const;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Check if user has admin-level permissions
 */
export function hasAdminPermissions(user: User): boolean {
  return user.permissions?.some(permission =>
    permission === COMMON_PERMISSIONS.ADMIN_ALL ||
    permission === COMMON_PERMISSIONS.MANAGE_ALL
  ) || false;
}

/**
 * Check if user can manage a specific resource
 */
export function canManageResource(user: User, resource: string): boolean {
  if (!user.permissions) return false;

  return user.permissions.some(permission => {
    const { action, resource: permResource } = permission.split(':');
    return (action === 'manage' || action === '*') &&
           (permResource === resource || permResource === '*');
  });
}

/**
 * Filter permissions by resource type
 */
export function filterPermissionsByResource(permissions: string[], resource: string): string[] {
  return permissions.filter(permission => {
    const { resource: permResource } = permission.split(':');
    return permResource === resource;
  });
}

/**
 * Get permission scope (own, team, organization, etc.)
 */
export function getPermissionScope(permission: string): string | null {
  const parts = permission.split(':');
  return parts.length >= 3 ? parts[2] : null;
}

/**
 * Create scoped permission
 */
export function createScopedPermission(action: string, resource: string, scope: string): string {
  return `${action}:${resource}:${scope}`;
}
