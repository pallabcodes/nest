import * as bcrypt from 'bcrypt';
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from '../../auth.repository';
import { TokenService } from '../../services/token.service';
import {
  AuthStrategy,
  AuthResult,
  TokenResult,
  UserProfile,
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
} from './auth.strategy.interface';

/**
 * Simple Auth Strategy
 *
 * Minimal authentication flow: register → login (no OTP verification).
 * Perfect for MVPs, demos, or projects that don't need email verification.
 */
@Injectable()
export class SimpleAuthStrategy implements AuthStrategy {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
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

    // Create user with default role
    const user = await this.authRepository.createUser({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      phone: registerDto.phone,
      isEmailVerified: true, // Auto-verify for simple strategy
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(user.id, user.email, ['USER']);

    return {
      success: true,
      user: this.mapToUserProfile(user),
      tokens,
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

  // Optional methods not implemented in simple strategy
  verifyEmail?(): Promise<AuthResult> {
    throw new Error('Email verification not supported in simple auth strategy');
  }

  resendOtp?(): Promise<AuthResult> {
    throw new Error('OTP not supported in simple auth strategy');
  }

  forgotPassword?(): Promise<AuthResult> {
    throw new Error('Password reset not supported in simple auth strategy');
  }

  resetPassword?(): Promise<AuthResult> {
    throw new Error('Password reset not supported in simple auth strategy');
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
