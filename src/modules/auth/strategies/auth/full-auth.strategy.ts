import * as bcrypt from 'bcrypt';
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from '../../auth.repository';
import { TokenService } from '../../services/token.service';
import { OtpService } from '../../services/otp.service';
import { OtpType } from '../../../../database/models/otp.model';
import {
  AuthStrategy,
  AuthResult,
  TokenResult,
  UserProfile,
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  ResendOtpDto,
} from './auth.strategy.interface';

/**
 * Full Auth Strategy
 *
 * Complete authentication flow with OTP verification for:
 * - Email verification during registration
 * - Password reset
 * - Account security
 */
@Injectable()
export class FullAuthStrategy implements AuthStrategy {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    // Check if user exists
    const existingUser = await this.authRepository.findUserByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.configService.get<number>('bcrypt.rounds') || 12,
    );

    // Generate OTP for email verification
    const otpCode = this.otpService.generateOtpCode();
    const expiration = this.otpService.getOtpExpiration();
    const expiresAt = new Date(Date.now() + expiration);

    // Create user with OTP in transaction
    const { user, otp } = await this.authRepository.createUserWithOtp(
      {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
        phone: registerDto.phone,
        isEmailVerified: false, // Requires verification
      },
      {
        code: otpCode,
        type: OtpType.VERIFY,
        expiresAt,
      },
    );

    // Generate tokens (user can start using app while verifying email)
    const userWithRoles = await this.authRepository.findUserByIdWithRoles(user.id);
    const roleNames = userWithRoles?.roles?.map((r) => r.name) || ['USER'];
    const tokens = await this.tokenService.generateTokens(user.id, user.email, roleNames);

    return {
      success: true,
      user: this.mapToUserProfile(user),
      tokens,
      otp: {
        code: otp.code,
        expiresAt: otp.expiresAt,
      },
      requiresVerification: true,
      message: 'User registered successfully. Please verify your email.',
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    // Find user
    const user = await this.authRepository.findUserByEmail(loginDto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const userWithRoles = await this.authRepository.findUserByIdWithRoles(user.id);
    const roleNames = userWithRoles?.roles?.map((r) => r.name) || ['USER'];
    const tokens = await this.tokenService.generateTokens(user.id, user.email, roleNames);

    return {
      success: true,
      user: this.mapToUserProfile(user, roleNames),
      tokens,
    };
  }

  async verifyEmail(verifyOtpDto: VerifyOtpDto): Promise<AuthResult> {
    const user = await this.authRepository.findUserByEmail(verifyOtpDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const otp = await this.authRepository.findValidOtp(
      user.id,
      verifyOtpDto.code,
      OtpType.VERIFY,
    );

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.authRepository.verifyEmailWithTransaction(user.id);

    return {
      success: true,
      message: 'Email verified successfully',
      user: this.mapToUserProfile({ ...user, isEmailVerified: true }),
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto): Promise<AuthResult> {
    const user = await this.authRepository.findUserByEmail(resendOtpDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.authRepository.invalidateUserOtps(user.id, resendOtpDto.type);
    const otp = await this.otpService.generateOtp(user.id, resendOtpDto.type);

    return {
      success: true,
      message: 'OTP sent successfully',
      otp: {
        code: otp.code,
        expiresAt: otp.expiresAt,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<AuthResult> {
    const user = await this.authRepository.findUserByEmail(forgotPasswordDto.email);
    if (!user) {
      // Return generic message for security
      return {
        success: true,
        message: 'If the email exists, a password reset OTP has been sent',
      };
    }

    await this.authRepository.invalidateUserOtps(user.id, OtpType.RESET);
    const otp = await this.otpService.generateOtp(user.id, OtpType.RESET);

    return {
      success: true,
      message: 'If the email exists, a password reset OTP has been sent',
      otp: {
        code: otp.code,
        expiresAt: otp.expiresAt,
      },
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<AuthResult> {
    const user = await this.authRepository.findUserByEmail(resetPasswordDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = await this.authRepository.findValidOtp(
      user.id,
      resetPasswordDto.code,
      OtpType.RESET,
    );

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const hashedPassword = await bcrypt.hash(
      resetPasswordDto.newPassword,
      this.configService.get<number>('bcrypt.rounds') || 12,
    );

    await this.authRepository.resetPasswordWithTransaction(user.id, hashedPassword);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResult> {
    const payload = this.tokenService.verifyRefreshToken(refreshTokenDto.refreshToken);

    const user = await this.authRepository.findUserByIdWithRoles(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roleNames = user.roles?.map((r) => r.name) || ['USER'];
    const tokens = await this.tokenService.generateTokens(user.id, user.email, roleNames);

    return { tokens };
  }

  async getCurrentUser(userId: number): Promise<UserProfile> {
    const user = await this.authRepository.findUserByIdWithRoles(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserProfile(user, user.roles?.map((r) => r.name) || []);
  }

  private mapToUserProfile(user: any, roles: string[] = []): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || null,
      isEmailVerified: user.isEmailVerified || false,
      isActive: user.isActive !== undefined ? user.isActive : true,
      roles: roles.length > 0 ? roles : ['USER'],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
