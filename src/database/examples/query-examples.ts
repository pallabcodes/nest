/**
 * Query Examples - Demonstrating Best Practices from SEQUELIZE_ASSOCIATIONS_GUIDE.md
 * 
 * This file contains examples of proper query patterns for User, Role, and UserRole models.
 * Use these patterns as reference when building services and repositories.
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';
import { User, Role, UserRole } from '../models';

@Injectable()
export class QueryExamples {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(Role)
    private readonly roleModel: typeof Role,
    @InjectModel(UserRole)
    private readonly userRoleModel: typeof UserRole,
  ) {}

  /**
   * Example 1: Load user with roles (LEFT JOIN - all users returned)
   * Use Case: Get all users, include their roles if they have any
   */
  async getAllUsersWithRoles() {
    return this.userModel.findAll({
      include: [
        {
          model: Role,
          as: 'roles',
          required: false, // ✅ LEFT JOIN - all users returned, even without roles
          attributes: ['id', 'name', 'description'], // ✅ Only needed fields
        },
      ],
      attributes: ['id', 'email', 'name', 'isActive'], // ✅ Exclude sensitive fields
    });
  }

  /**
   * Example 2: Load only users who have roles (INNER JOIN)
   * Use Case: Get only users who have at least one role assigned
   */
  async getUsersWithRolesOnly() {
    return this.userModel.findAll({
      include: [
        {
          model: Role,
          as: 'roles',
          required: true, // ✅ INNER JOIN - only users WITH roles
        },
      ],
    });
  }

  /**
   * Example 3: Load user with active roles only (using 'on' for LEFT JOIN)
   * Use Case: Get all users, but only include their active roles
   */
  async getUsersWithActiveRoles() {
    return this.userModel.findAll({
      include: [
        {
          model: Role,
          as: 'roles',
          on: {
            '$roles.isActive$': true, // ✅ Filter in ON clause (preserves LEFT JOIN)
          },
          required: false, // ✅ LEFT JOIN - all users returned
        },
      ],
    });
  }

  /**
   * Example 4: Load role with users (reverse direction)
   * Use Case: Get a role and see all users who have it
   */
  async getRoleWithUsers(roleId: number) {
    return this.roleModel.findByPk(roleId, {
      include: [
        {
          model: User,
          as: 'users',
          required: false, // ✅ LEFT JOIN - role returned even if no users
          attributes: ['id', 'email', 'name'],
        },
      ],
    });
  }

  /**
   * Example 5: Load user with roles and junction table data
   * Use Case: Get user with roles, including who assigned each role and when
   */
  async getUserWithRoleAssignments(userId: number) {
    return this.userModel.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'roles',
          required: false,
          through: {
            // ✅ Access junction table (UserRole) data
            attributes: ['assignedBy', 'reason', 'assignedAt'],
          },
        },
      ],
    });
  }

  /**
   * Example 5b: Load user with roles and assigner information (alternative approach)
   * Use Case: Get user with roles, including who assigned each role
   * Note: To get assigner details, query UserRole separately or use a custom query
   */
  async getUserWithRoleAssignmentsAndAssigner(userId: number) {
    // Query UserRole directly to get assigner information
    const userRoles = await this.userRoleModel.findAll({
      where: { userId },
      include: [
        {
          model: Role,
          as: 'role',
          required: true,
        },
        {
          model: User,
          as: 'assigner',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    // Then get user separately
    const user = await this.userModel.findByPk(userId, {
      attributes: ['id', 'email', 'name', 'isActive'],
    });

    return {
      ...user?.toJSON(),
      roleAssignments: userRoles.map((ur) => ({
        role: ur.role,
        assignedBy: ur.assignedBy,
        assignedAt: ur.assignedAt,
        reason: ur.reason,
        assigner: ur.assigner,
      })),
    };
  }

  /**
   * Example 6: Nested includes (User → Roles → Permissions if you had that model)
   * Use Case: Multi-level relationships
   */
  async getUserWithRolesAndDetails(userId: number) {
    return this.userModel.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'roles',
          required: false,
          attributes: ['id', 'name', 'description', 'permissions'], // ✅ Include permissions JSON
          // If you had a Permission model:
          // include: [{
          //   model: Permission,
          //   as: 'permissions',
          //   required: false
          // }]
        },
      ],
    });
  }

  /**
   * Example 7: Filter users by role name (using 'on' for proper LEFT JOIN)
   * Use Case: Get all users, but only include ADMIN role if they have it
   */
  async getUsersWithAdminRole() {
    return this.userModel.findAll({
      include: [
        {
          model: Role,
          as: 'roles',
          on: {
            '$roles.name$': 'ADMIN', // ✅ Filter in ON clause
          },
          required: false, // ✅ LEFT JOIN - all users returned
        },
      ],
    });
  }

  /**
   * Example 8: Get only users who have ADMIN role (INNER JOIN)
   * Use Case: Get only users who have ADMIN role assigned
   */
  async getUsersWithAdminRoleOnly() {
    return this.userModel.findAll({
      include: [
        {
          model: Role,
          as: 'roles',
          where: {
            name: 'ADMIN', // ✅ Filter in WHERE clause
          },
          required: true, // ✅ INNER JOIN - only users WITH ADMIN role
        },
      ],
    });
  }

  /**
   * Example 9: Count roles per user (using subquery)
   * Use Case: Get users with role count without loading all roles
   */
  async getUsersWithRoleCount() {
    return this.userModel.findAll({
      attributes: {
        include: [
          [
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM user_roles
              WHERE user_roles.userId = User.id
            )`),
            'rolesCount',
          ],
        ],
      },
    });
  }

  /**
   * Example 10: Assign role to user with transaction
   * Use Case: Ensure atomicity when assigning roles
   */
  async assignRoleToUser(
    userId: number,
    roleId: number,
    assignedBy: number,
    reason?: string,
  ) {
    // This would use TransactionUtil in a real service
    return this.userRoleModel.create({
      userId,
      roleId,
      assignedBy,
      reason: reason || undefined, // ✅ Explicitly set to undefined if not provided
    } as any); // ✅ Type assertion needed due to Sequelize-TypeScript strict typing
  }

  /**
   * Example 11: Load user with roles, ordered by assignment date
   * Use Case: Get user's roles in chronological order
   */
  async getUserWithRolesOrdered(userId: number) {
    return this.userModel.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'roles',
          required: false,
          through: {
            attributes: ['assignedAt'],
          },
          // ✅ Order by junction table field using through alias
          order: [['userRole', 'assignedAt', 'DESC']],
        },
      ],
    });
  }

  /**
   * Example 12: Separate queries for better performance (large datasets)
   * Use Case: When you have many users and roles, use separate queries
   */
  async getUsersWithRolesSeparate() {
    return this.userModel.findAll({
      include: [
        {
          model: Role,
          as: 'roles',
          separate: true, // ✅ Runs separate query (better for large datasets)
          limit: 10, // ✅ Limit roles per user
          order: [['name', 'ASC']],
        },
      ],
    });
  }

  /**
   * Example 13: Check if user has role (using helper method)
   * Use Case: Simple role check
   */
  async checkUserRole(userId: number, roleName: string): Promise<boolean> {
    const user = await this.userModel.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'roles',
          required: false,
        },
      ],
    });

    if (!user) {
      return false;
    }

    // ✅ Use helper method from User model
    return user.hasRole(roleName);
  }

  /**
   * Example 14: Check if user has any of multiple roles
   * Use Case: Check for multiple roles at once
   */
  async checkUserAnyRole(userId: number, roleNames: string[]): Promise<boolean> {
    const user = await this.userModel.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'roles',
          required: false,
        },
      ],
    });

    if (!user) {
      return false;
    }

    // ✅ Use helper method from User model
    return user.hasAnyRole(roleNames);
  }
}

