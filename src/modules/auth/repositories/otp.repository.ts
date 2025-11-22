import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Otp } from '../../../database/models/otp.model';
import { OtpType } from '../../../database/models/otp.model';
import { CreateOtpData } from '../interfaces/otp.interface';

/**
 * OTP Repository
 *
 * Handles all OTP-related database operations.
 * Separated from AuthRepository for better maintainability.
 */
@Injectable()
export class OtpRepository {
  constructor(
    @InjectModel(Otp)
    private readonly otpModel: typeof Otp,
  ) {}

  /**
   * Find OTP by ID
   */
  async findById(id: number): Promise<Otp | null> {
    return this.otpModel.findByPk(id);
  }

  /**
   * Find valid OTP for user
   */
  async findValidOtp(userId: number, code: string, type: OtpType): Promise<Otp | null> {
    return this.otpModel.findOne({
      where: {
        userId,
        code,
        type,
        expiresAt: {
          [Op.gt]: new Date(),
        },
        isUsed: false,
      },
      order: [['createdAt', 'DESC']], // Get the most recent one
    });
  }

  /**
   * Create new OTP
   */
  async create(otpData: CreateOtpData): Promise<any> {
    return this.otpModel.create(otpData as any);
  }

  /**
   * Mark OTP as used
   */
  async markAsUsed(id: number): Promise<boolean> {
    const [affectedRows] = await this.otpModel.update(
      { isUsed: true },
      { where: { id } }
    );
    return affectedRows > 0;
  }

  /**
   * Invalidate user OTPs by type
   */
  async invalidateUserOtps(userId: number, type: OtpType): Promise<number> {
    return this.otpModel.update(
      { isUsed: true },
      {
        where: {
          userId,
          type,
          isUsed: false,
        }
      }
    ).then(([affectedRows]) => affectedRows);
  }

  /**
   * Clean up expired OTPs
   */
  async cleanupExpired(): Promise<number> {
    return this.otpModel.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
  }

  /**
   * Get OTP count for user (rate limiting)
   */
  async getUserOtpCount(userId: number, type: OtpType, since: Date): Promise<number> {
    return this.otpModel.count({
      where: {
        userId,
        type,
        createdAt: {
          [Op.gte]: since,
        },
      },
    });
  }
}
