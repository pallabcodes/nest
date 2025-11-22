/**
 * Database Model Type Definitions
 * Provides type definitions for Sequelize models and database operations
 * to ensure type safety across repositories and services.
 */

import { User } from '../database/models/user.model';
import { Role } from '../database/models/role.model';
import { UserRole } from '../database/models/user-role.model';

/**
 * User with roles included (from database query)
 * Used when fetching user with associated roles
 */
export interface UserWithRoles extends User {
  /** Array of associated Role models */
  roles: Role[];
}

/**
 * Role with users included (from database query)
 * Used when fetching role with associated users
 */
export interface RoleWithUsers extends Role {
  /** Array of associated User models */
  users: User[];
}

/**
 * UserRole junction table with associations
 * Used when fetching user-role relationships with full data
 */
export interface UserRoleWithAssociations extends UserRole {
  /** Associated User model */
  user: User;
  /** Associated Role model */
  role: Role;
  /** User who assigned this role (optional) */
  assigner?: User;
}

/**
 * User creation data structure
 * Used when creating new users
 */
export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
}

/**
 * User update data structure
 * Used when updating existing users
 */
export interface UpdateUserData {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
  avatar?: string;
}

/**
 * Role creation data structure
 */
export interface CreateRoleData {
  name: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

/**
 * Role update data structure
 */
export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

/**
 * User-Role assignment data structure
 */
export interface AssignRoleData {
  roleId: number;
  assignedBy?: number;
  reason?: string;
}
