import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { User } from '../../../database/models/user.model';
import { Role } from '../../../database/models/role.model';
import { UserRole } from '../../../database/models/user-role.model';
import { CreateUserData, UpdateUserData } from '../interfaces/user.interface';

/**
 * User Repository
 *
 * Handles all user-related database operations.
 * Separated from AuthRepository for better maintainability.
 */
@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(Role)
    private readonly roleModel: typeof Role,
    @InjectModel(UserRole)
    private readonly userRoleModel: typeof UserRole,
  ) {}

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    return this.userModel.findByPk(id);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Find user with roles
   */
  async findByIdWithRoles(id: number): Promise<User | null> {
    return this.userModel.findByPk(id, {
      include: [{
        model: Role,
        through: { attributes: [] }, // Exclude junction table attributes
      }],
    });
  }

  /**
   * Create new user
   */
  async create(userData: CreateUserData): Promise<any> {
    return this.userModel.create(userData as any);
  }

  /**
   * Update user
   */
  async update(id: number, userData: UpdateUserData): Promise<boolean> {
    const [affectedRows] = await this.userModel.update(userData, {
      where: { id },
    });
    return affectedRows > 0;
  }

  /**
   * Delete user
   */
  async delete(id: number): Promise<boolean> {
    const affectedRows = await this.userModel.destroy({
      where: { id },
    });
    return affectedRows > 0;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: number): Promise<boolean> {
    const whereClause: any = { email: email.toLowerCase() };
    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    const count = await this.userModel.count({ where: whereClause });
    return count > 0;
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: number): Promise<string[]> {
    const userWithRoles = await this.findByIdWithRoles(userId);
    return userWithRoles?.roles?.map(role => role.name) || [];
  }
}
