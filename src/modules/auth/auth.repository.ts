import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction, QueryTypes } from 'sequelize';
import { User } from '../../database/models/user.model';
import { Otp, OtpType } from '../../database/models/otp.model';
import { Role } from '../../database/models/role.model';
import { UserRole } from '../../database/models/user-role.model';
import { SocialAuth, SocialProvider } from '../../database/models/social-auth.model';
import { TransactionUtil } from '../../database/utils/transaction.util';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Otp)
    private otpModel: typeof Otp,
    @InjectModel(Role)
    private roleModel: typeof Role,
    @InjectModel(UserRole)
    private userRoleModel: typeof UserRole,
    @InjectModel(SocialAuth)
    private socialAuthModel: typeof SocialAuth,
    private transactionUtil: TransactionUtil,
  ) {}

  // User operations
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    isEmailVerified?: boolean;
  }): Promise<User> {
    // Sequelize will automatically handle createdAt/updatedAt when timestamps: true
    return this.userModel.create(userData as any, {
      // Explicitly exclude timestamps from the data to let Sequelize handle them
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({
      where: { email },
      // Password is included by default - no need to explicitly include it
      // Using include causes duplicate password in SQL query
    });
  }

  async findUserById(id: number): Promise<User | null> {
    return this.userModel.findByPk(id, {
      rejectOnEmpty: false,
    });
  }

  async findUserByIdWithRoles(id: number): Promise<User | null> {
    return this.userModel.findByPk(id, {
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] }, // Exclude junction table attributes
        },
      ],
    });
  }

  async updateUser(id: number, updateData: Partial<User>, transaction?: Transaction): Promise<[number]> {
    // For password updates, use raw query to ensure it's updated
    if (updateData.password) {
      const [affectedRows] = await this.userModel.update(
        { password: updateData.password },
        { 
          where: { id }, 
          transaction,
          // Force update even if password field is excluded
          returning: false,
        },
      );
      return [affectedRows];
    }
    return this.userModel.update(updateData, { where: { id }, transaction });
  }

  // OTP operations
  async createOtp(otpData: {
    userId: number;
    code: string;
    type: OtpType;
    expiresAt: Date;
  }, transaction?: Transaction): Promise<Otp> {
    return this.otpModel.create(otpData as any, { transaction });
  }

  async findValidOtp(userId: number, code: string, type: OtpType): Promise<Otp | null> {
    return this.otpModel.findOne({
      where: {
        userId,
        code,
        type,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });
  }

  async invalidateUserOtps(userId: number, type: OtpType, transaction?: Transaction): Promise<number> {
    return this.otpModel.destroy({
      where: {
        userId,
        type,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
      transaction,
    });
  }

  async deleteExpiredOtps(): Promise<number> {
    return this.otpModel.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
  }

  async findUserOtps(userId: number, type: OtpType): Promise<Otp[]> {
    return this.otpModel.findAll({
      where: {
        userId,
        type,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
      order: [['createdAt', 'DESC']],
      limit: 1,
    });
  }

  // Role operations
  async findRoleByName(name: string): Promise<Role | null> {
    return this.roleModel.findOne({ where: { name } });
  }

  async assignRoleToUser(userId: number, roleId: number, assignedBy?: number, reason?: string): Promise<UserRole> {
    return this.userRoleModel.create({
      userId,
      roleId,
      assignedBy: assignedBy || userId,
      reason: reason || 'Role assignment',
    } as any);
  }

  // Social Auth operations
  async createSocialAuth(socialAuthData: {
    userId: number;
    provider: SocialProvider;
    providerId: string;
  }): Promise<SocialAuth> {
    return this.socialAuthModel.create(socialAuthData as any);
  }

  async findSocialAuth(provider: SocialProvider, providerId: string): Promise<SocialAuth | null> {
    return this.socialAuthModel.findOne({
      where: { provider, providerId },
      include: [{ model: User, as: 'user' }],
    });
  }

  // ============================================
  // TRANSACTIONAL OPERATIONS (using TransactionUtil)
  // ============================================

  /**
   * Create user and OTP atomically
   * Uses TransactionUtil for logging and metrics
   */
  async createUserWithOtp(
    userData: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      isEmailVerified?: boolean;
    },
    otpData: {
      code: string;
      type: OtpType;
      expiresAt: Date;
    },
  ): Promise<{ user: User; otp: Otp }> {
    return this.transactionUtil.execute(
      async (transaction) => {
        // Step 1: Create user
        // Sequelize will automatically handle createdAt/updatedAt when timestamps: true
        // Explicitly include password field to ensure it's saved
        const user = await this.userModel.create(
          {
            ...userData,
            password: userData.password, // Explicitly ensure password is included
          } as any,
          { transaction },
        );

        // Step 2: Create OTP for the user
        const otp = await this.otpModel.create(
          {
            userId: user.id,
            code: otpData.code,
            type: otpData.type,
            expiresAt: otpData.expiresAt,
          } as any,
          { transaction },
        );

        // Step 3: Assign default USER role
        const defaultRole = await this.roleModel.findOne({ where: { name: 'USER' }, transaction });
        if (defaultRole) {
          await this.userRoleModel.create(
            {
              userId: user.id,
              roleId: defaultRole.id,
              assignedBy: user.id,
              reason: 'Default role assignment on registration',
            } as any,
            { transaction },
          );
        }

        return { user, otp };
      },
      { operationName: 'createUserWithOtp' },
    );
  }

  /**
   * Verify email atomically: invalidate OTPs and update user status
   * Uses TransactionUtil for logging and metrics
   */
  async verifyEmailWithTransaction(userId: number): Promise<void> {
    return this.transactionUtil.execute(
      async (transaction) => {
        // Step 1: Invalidate all verification OTPs for this user
        await this.invalidateUserOtps(userId, OtpType.VERIFY, transaction);

        // Step 2: Mark user email as verified
        await this.updateUser(userId, { isEmailVerified: true }, transaction);
      },
      { operationName: 'verifyEmail' },
    );
  }

  /**
   * Reset password atomically: invalidate OTPs and update password
   * Uses TransactionUtil for logging and metrics
   */
  async resetPasswordWithTransaction(userId: number, hashedPassword: string): Promise<void> {
    return this.transactionUtil.execute(
      async (transaction) => {
        // Step 1: Invalidate all reset OTPs for this user
        await this.invalidateUserOtps(userId, OtpType.RESET, transaction);

        // Step 2: Update user password - use direct update to ensure it works
        const [affectedRows] = await this.userModel.update(
          { password: hashedPassword },
          { 
            where: { id: userId }, 
            transaction,
          },
        );

        if (affectedRows === 0) {
          throw new Error(`Failed to update password for user ${userId} - no rows affected`);
        }

        // Step 3: Verify the update worked within the transaction
        // Note: We can't compare bcrypt hashes directly (they're different each time)
        // The transaction commit will ensure the update happened
        // Verification will be done in the service layer using bcrypt.compare
      },
      { operationName: 'resetPassword' },
    );
  }
}
