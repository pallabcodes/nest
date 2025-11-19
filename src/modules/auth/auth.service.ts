import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { Response, Request } from 'express';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { OtpType } from '../../database/models/otp.model';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private authRepository: AuthRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.authRepository.findUserByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.configService.get<number>('bcrypt.rounds') || 12,
    );

    // Generate OTP code and expiration
    const otpCode = this.generateOtpCode();
    const expiration = this.configService.get<number>('otp.expiration') || 600000;
    const expiresAt = new Date(Date.now() + expiration);

    // Create user and OTP atomically (transaction ensures both succeed or both fail)
    const { user, otp } = await this.authRepository.createUserWithOtp(
      {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
        phone: registerDto.phone,
      },
      {
        code: otpCode,
        type: OtpType.VERIFY,
        expiresAt,
      },
    );

    // Load user with roles for token generation
    const userWithRoles = await this.authRepository.findUserByIdWithRoles(user.id);
    const roleNames = userWithRoles?.roles?.map((r) => r.name) || ['USER'];

    // Generate tokens (outside transaction - not critical for atomicity)
    const tokens = await this.generateTokens(user.id, user.email, roleNames);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
      otp: {
        code: otp.code,
        expiresAt: otp.expiresAt,
      },
    };
  }

  async login(loginDto: LoginDto) {
    // Regular login flow
    const user = await this.authRepository.findUserByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userWithRoles = await this.authRepository.findUserByIdWithRoles(user.id);
    const roleNames = userWithRoles?.roles?.map((r) => r.name) || ['USER'];

    const tokens = await this.generateTokens(user.id, user.email, roleNames);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
    };
  }

  async verifyEmail(verifyOtpDto: VerifyOtpDto) {
    const user = await this.authRepository.findUserByEmail(verifyOtpDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Verify OTP
    const otp = await this.authRepository.findValidOtp(
      user.id,
      verifyOtpDto.code,
      OtpType.VERIFY,
    );

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Invalidate OTPs and update user status atomically (transaction ensures both succeed or both fail)
    await this.authRepository.verifyEmailWithTransaction(user.id);

    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: true,
      },
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto) {
    const user = await this.authRepository.findUserByEmail(resendOtpDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Invalidate existing OTPs of this type
    await this.authRepository.invalidateUserOtps(user.id, resendOtpDto.type);

    const otp = await this.generateOtp(user.id, resendOtpDto.type);

    return {
      message: 'OTP sent successfully',
      otp: {
        code: otp.code,
        expiresAt: otp.expiresAt,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.authRepository.findUserByEmail(forgotPasswordDto.email);
    if (!user) {
      // Don't reveal if user exists for security
      return {
        message: 'If the email exists, a password reset OTP has been sent',
      };
    }

    // Invalidate existing reset OTPs
    await this.authRepository.invalidateUserOtps(user.id, OtpType.RESET);

    const otp = await this.generateOtp(user.id, OtpType.RESET);

    // Ensure OTP code is available (handle Sequelize model serialization)
    const otpCode = otp.code || (otp as any).get?.('code') || (otp as any).toJSON?.()?.code;
    const otpExpiresAt = otp.expiresAt || (otp as any).get?.('expiresAt') || (otp as any).toJSON?.()?.expiresAt;

    if (!otpCode) {
      this.logger.error(`OTP generation failed for user ${user.id} - code is missing`, { otp });
      throw new Error('Failed to generate OTP code');
    }

    return {
      message: 'If the email exists, a password reset OTP has been sent',
      otp: {
        code: otpCode,
        expiresAt: otpExpiresAt,
      },
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.authRepository.findUserByEmail(resetPasswordDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify OTP
    const otp = await this.authRepository.findValidOtp(
      user.id,
      resetPasswordDto.code,
      OtpType.RESET,
    );

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      resetPasswordDto.newPassword,
      this.configService.get<number>('bcrypt.rounds') || 12,
    );

    // Invalidate OTPs and update password atomically (transaction ensures both succeed or both fail)
    await this.authRepository.resetPasswordWithTransaction(user.id, hashedPassword);

    // Password has been updated successfully in the transaction
    // The transaction commit ensures the update is persisted
    this.logger.log(`Password reset successful for user ${user.id}`);

    return {
      message: 'Password reset successfully',
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const user = await this.authRepository.findUserByIdWithRoles(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Extract role names from roles array
      const roleNames = user.roles?.map((r) => r.name) || ['USER'];

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.email, roleNames);

      return {
        tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getCurrentUser(userId: number, jwtUser?: { id: number; email?: string; name?: string; roles?: string[] }): Promise<{
    id: number;
    email: string;
    name: string;
    phone: string | null;
    isEmailVerified: boolean;
    isActive: boolean;
    roles: string[];
    createdAt: Date;
    updatedAt: Date;
  }> {
    const dbUser = await this.authRepository.findUserById(userId);
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    // Use roles from JWT (already validated) or fallback to database lookup
    let roles: string[] = jwtUser?.roles || [];
    if (roles.length === 0) {
      const userWithRoles = await this.authRepository.findUserByIdWithRoles(userId);
      roles = userWithRoles?.roles?.map((r) => r.name) || [];
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone || null,
      isEmailVerified: dbUser.isEmailVerified || false,
      isActive: dbUser.isActive !== undefined ? dbUser.isActive : true,
      roles: roles,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
  }

  // Helper methods
  private async generateOtp(userId: number, type: OtpType) {
    const code = this.generateOtpCode();
    const expiration = this.configService.get<number>('otp.expiration') || 600000;
    const expiresAt = new Date(Date.now() + expiration);

    // Invalidate existing OTPs of this type
    await this.authRepository.invalidateUserOtps(userId, type);

    return this.authRepository.createOtp({
      userId,
      code,
      type,
      expiresAt,
    });
  }

  private generateOtpCode(): string {
    const length = this.configService.get<number>('otp.length') || 6;
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
  }

  private async generateTokens(userId: number, email: string, roles: string[] = ['USER']) {
    try {
      const payload: { sub: number; email: string; roles: string[] } = { sub: userId, email, roles };
      const accessTokenExpiration = this.configService.get<string>('jwt.accessTokenExpiration') || '15m';
      const refreshTokenExpiration = this.configService.get<string>('jwt.refreshTokenExpiration') || '7d';

      // Verify JWT service is available
      if (!this.jwtService) {
        this.logger.error('JWT Service is not available');
        throw new Error('JWT Service is not configured');
      }

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: accessTokenExpiration,
      } as any);

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: refreshTokenExpiration,
      } as any);

      if (!accessToken || !refreshToken) {
        this.logger.error(`Token generation returned null/undefined for user ${userId}`);
        throw new Error('Failed to generate tokens');
      }

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(`Error generating tokens for user ${userId}: ${error.message}`, error.stack);
      throw new UnauthorizedException(`Failed to generate authentication tokens: ${error.message}`);
    }
  }

  async generateTokensForUser(userId: number, email: string) {
    const user = await this.authRepository.findUserByIdWithRoles(userId);
    const roleNames = user?.roles?.map((r) => r.name) || ['USER'];
    return this.generateTokens(userId, email, roleNames);
  }

  async handleOAuthCallback(user: { id: number; email: string; name: string }, res: Response): Promise<{
    user: {
      id: number;
      email: string;
      name: string;
    };
  }> {
    const tokens = await this.generateTokensForUser(user.id, user.email);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  logoutWithCookies(res: Response) {
    this.clearAuthCookies(res);
  }

  async loginWithCookies(loginDto: LoginDto, res: Response) {
    try {
      const result = await this.login(loginDto);
      
      // Debug logging
      if (!result) {
        this.logger.error('Login returned undefined result');
        throw new UnauthorizedException('Login failed: No result returned');
      }
      
      if (!result.tokens) {
        this.logger.error('Login result missing tokens property', { resultKeys: Object.keys(result || {}) });
        throw new UnauthorizedException('Failed to generate authentication tokens: tokens missing');
      }
      
      if (!result.tokens.accessToken || !result.tokens.refreshToken) {
        this.logger.error('Login tokens incomplete', { 
          hasAccessToken: !!result.tokens.accessToken,
          hasRefreshToken: !!result.tokens.refreshToken 
        });
        throw new UnauthorizedException('Failed to generate authentication tokens: incomplete tokens');
      }
      
      this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      const { tokens, ...responseData } = result;
      return responseData;
    } catch (error) {
      this.logger.error(`Login with cookies failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async registerWithCookies(registerDto: RegisterDto, res: Response) {
    const result = await this.register(registerDto);
    if (result.tokens) {
      this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    }
    const { tokens, ...responseData } = result;
    return responseData;
  }

  async refreshTokenFromRequest(req: Request, res: Response) {
    const refreshToken = req.cookies?.['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.refreshToken({ refreshToken });
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return result;
  }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const accessTokenExpiration = this.configService.get<string>('jwt.accessTokenExpiration') || '15m';
    const refreshTokenExpiration = this.configService.get<string>('jwt.refreshTokenExpiration') || '7d';
    
    const accessExpires = this.parseExpiration(accessTokenExpiration);
    const refreshExpires = this.parseExpiration(refreshTokenExpiration);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: accessExpires,
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: refreshExpires,
      path: '/',
    });
  }

  clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
  }

  private parseExpiration(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000;
    }
  }
}
