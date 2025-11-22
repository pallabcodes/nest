import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { User } from '../../database/models/user.model';
import { Otp, OtpType } from '../../database/models/otp.model';
import { Role } from '../../database/models/role.model';
import { UserRole } from '../../database/models/user-role.model';
import { SocialAuth, SocialProvider } from '../../database/models/social-auth.model';
import { UserRepository } from './repositories/user.repository';
import { OtpRepository } from './repositories/otp.repository';
import { TransactionUtil } from '../../database/utils/transaction.util';
import { CreateUserData, UpdateUserData } from './interfaces/user.interface';
import { CreateOtpData } from './interfaces/otp.interface';

@Injectable()
export class AuthRepository {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpRepository: OtpRepository,
    private transactionUtil: TransactionUtil,
  ) {}

  // User operations
  async createUser(userData: CreateUserData): Promise<User> {
    return this.userRepository.create(userData);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findUserById(id: number): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async findUserByIdWithRoles(id: number): Promise<User | null> {
    return this.userRepository.findByIdWithRoles(id);
  }

  async updateUser(
    id: number,
    updateData: Partial<User>,
    transaction?: Transaction,
  ): Promise<[number]> {
    // TODO: Implement user update
    // 1. Update user with provided data
    // 2. Handle password updates specially if needed
    // 3. Use transaction if provided
    // 4. Return affected rows count
    throw new Error('Not implemented');
  }

  // OTP operations
  async createOtp(otpData: CreateOtpData, transaction?: Transaction): Promise<any> {
    return this.otpRepository.create(otpData);
  }

  async findValidOtp(userId: number, code: string, type: OtpType): Promise<any | null> {
    return this.otpRepository.findValidOtp(userId, code, type);
  }

  async invalidateUserOtps(userId: number, type: OtpType, transaction?: Transaction): Promise<number> {
    return this.otpRepository.invalidateUserOtps(userId, type);
  }

  async deleteExpiredOtps(): Promise<number> {
    // TODO: Implement delete expired OTPs
    // 1. Delete OTPs where expiresAt is in the past
    // 2. Return number of deleted OTPs
    throw new Error('Not implemented');
  }

  async findUserOtps(userId: number, type: OtpType): Promise<Otp[]> {
    // TODO: Implement find user OTPs
    // 1. Query OTPs by userId, type, and future expiration
    // 2. Order by createdAt DESC, limit to 1
    // 3. Return array of OTPs
    throw new Error('Not implemented');
  }

  // Role operations
  async findRoleByName(name: string): Promise<Role | null> {
    // TODO: Implement find role by name
    // 1. Query role by name
    // 2. Return role or null
    throw new Error('Not implemented');
  }

  async assignRoleToUser(
    userId: number,
    roleId: number,
    assignedBy?: number,
    reason?: string,
  ): Promise<UserRole> {
    // TODO: Implement assign role to user
    // 1. Create UserRole junction record
    // 2. Set assignedBy and reason
    // 3. Return created UserRole
    throw new Error('Not implemented');
  }

  // Social Auth operations
  async createSocialAuth(socialAuthData: {
    userId: number;
    provider: SocialProvider;
    providerId: string;
  }): Promise<SocialAuth> {
    // TODO: Implement create social auth
    // 1. Create social auth record
    // 2. Return created record
    throw new Error('Not implemented');
  }

  async findSocialAuth(provider: SocialProvider, providerId: string): Promise<SocialAuth | null> {
    // TODO: Implement find social auth
    // 1. Query by provider and providerId
    // 2. Include associated user
    // 3. Return record or null
    throw new Error('Not implemented');
  }

  // ============================================
  // TRANSACTIONAL OPERATIONS (using TransactionUtil)
  // ============================================

  /**
   * Create user and OTP atomically
   * Uses TransactionUtil for logging and metrics
   */
  async createUserWithOtp(
    userData: CreateUserData,
    otpData: CreateOtpData,
  ): Promise<{ user: User; otp: any }> {
    return this.transactionUtil.execute(async (transaction) => {
      // Create user
      const user = await this.userRepository.create(userData);

      // Create OTP with user ID
      const otp = await this.otpRepository.create({
        ...otpData,
        userId: user.id,
      });

      // TODO: Assign default role (would need RoleRepository)

      return { user, otp };
    }, { operationName: 'createUserWithOtp' });
  }

  /**
   * Verify email atomically: invalidate OTPs and update user status
   * Uses TransactionUtil for logging and metrics
   */
  async verifyEmailWithTransaction(userId: number): Promise<void> {
    return this.transactionUtil.execute(async (transaction) => {
      // Invalidate verification OTPs
      await this.otpRepository.invalidateUserOtps(userId, OtpType.VERIFY);

      // Update user verification status
      await this.userRepository.update(userId, { isEmailVerified: true });
    }, { operationName: 'verifyEmailWithTransaction' });
  }

  /**
   * Reset password atomically: invalidate OTPs and update password
   * Uses TransactionUtil for logging and metrics
   */
  async resetPasswordWithTransaction(userId: number, hashedPassword: string): Promise<void> {
    return this.transactionUtil.execute(async (transaction) => {
      // Invalidate reset OTPs
      await this.otpRepository.invalidateUserOtps(userId, OtpType.RESET);

      // Update user password
      await this.userRepository.update(userId, { password: hashedPassword });
    }, { operationName: 'resetPasswordWithTransaction' });
  }
}
