/**
 * Neat Auth - Authentication Service
 *
 * Core authentication service with JWT token management
 * and user authentication logic
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  IAuthService,
  User,
  AuthUser,
  LoginCredentials,
  RegisterData,
  AuthTokens,
  JwtPayload,
  AuthConfig,
  PasswordHash,
  AuthError,
  UnauthorizedError,
  TokenExpiredError,
  InvalidTokenError
} from '../interfaces/auth.interfaces.js';
import { Injectable } from '@neat/core';

@Injectable()
export class AuthService implements IAuthService {
  private config: AuthConfig;

  constructor(config?: AuthConfig) {
    this.config = config || this.getDefaultConfig();
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    // This would typically query your database
    // For now, we'll throw an error indicating this needs to be implemented
    throw new Error('validateUser must be implemented by extending AuthService or providing a custom implementation');
  }

  /**
   * Create a new user
   */
  async createUser(userData: RegisterData): Promise<User> {
    // This would typically create a user in your database
    throw new Error('createUser must be implemented by extending AuthService or providing a custom implementation');
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string | number): Promise<User | null> {
    // This would typically query your database
    throw new Error('findUserById must be implemented by extending AuthService or providing a custom implementation');
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    // This would typically query your database
    throw new Error('findUserByEmail must be implemented by extending AuthService or providing a custom implementation');
  }

  /**
   * Update user
   */
  async updateUser(id: string | number, updates: Partial<User>): Promise<User | null> {
    // This would typically update a user in your database
    throw new Error('updateUser must be implemented by extending AuthService or providing a custom implementation');
  }

  /**
   * Generate access and refresh tokens for a user
   */
  async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles || [],
      permissions: user.permissions || [],
      tokenVersion: (user as AuthUser).tokenVersion || 1
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiresIn(this.config.jwt.expiresIn)
    };
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = jwt.verify(token, this.config.jwt.secret, {
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience
      }) as JwtPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError();
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new InvalidTokenError();
      }
      throw new AuthError('Token validation failed', 'TOKEN_VALIDATION_FAILED');
    }
  }

  /**
   * Refresh access tokens using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    try {
      // Verify refresh token
      const refreshPayload = jwt.verify(refreshToken, this.config.jwt.secret) as any;

      // Find user
      const user = await this.findUserById(refreshPayload.sub);
      if (!user) {
        return null;
      }

      // Check token version
      const userTokenVersion = (user as AuthUser).tokenVersion || 1;
      const refreshTokenVersion = (user as AuthUser).refreshTokenVersion || 1;

      if (refreshPayload.tokenVersion !== userTokenVersion ||
          refreshPayload.refreshTokenVersion !== refreshTokenVersion) {
        return null; // Token has been revoked
      }

      // Generate new tokens
      return await this.generateTokens(user);
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke all tokens for a user (logout from all devices)
   */
  async revokeUserTokens(userId: string | number): Promise<void> {
    // This would typically update the user's token version in the database
    // to invalidate all existing tokens
    throw new Error('revokeUserTokens must be implemented by extending AuthService or providing a custom implementation');
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<PasswordHash> {
    return await bcrypt.hash(password, this.config.bcrypt.rounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: PasswordHash): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.config.jwt.secret, {
      expiresIn: this.config.jwt.expiresIn,
      issuer: this.config.jwt.issuer,
      audience: this.config.jwt.audience
    });
  }

  private async generateRefreshToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      tokenVersion: (user as AuthUser).tokenVersion || 1,
      refreshTokenVersion: (user as AuthUser).refreshTokenVersion || 1
    };

    return jwt.sign(payload, this.config.jwt.secret, {
      expiresIn: this.config.jwt.refreshExpiresIn
    });
  }

  private parseExpiresIn(expiresIn: string | number): number {
    if (typeof expiresIn === 'number') {
      return expiresIn;
    }

    // Parse string like "15m", "1h", "7d"
    const match = expiresIn.toString().match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // 15 minutes default
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 900;
    }
  }

  private getDefaultConfig(): AuthConfig {
    return {
      jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE
      },
      bcrypt: {
        rounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
      }
    };
  }
}

// ========================================
// EXTENSIBLE AUTH SERVICE
// ========================================

/**
 * Base class for implementing custom authentication services
 * Extend this class and implement the abstract methods
 */
export abstract class BaseAuthService extends AuthService {
  constructor(config?: AuthConfig) {
    super(config);
  }

  // Abstract methods that must be implemented
  abstract validateUser(email: string, password: string): Promise<User | null>;
  abstract createUser(userData: RegisterData): Promise<User>;
  abstract findUserById(id: string | number): Promise<User | null>;
  abstract findUserByEmail(email: string): Promise<User | null>;
  abstract updateUser(id: string | number, updates: Partial<User>): Promise<User | null>;
  abstract revokeUserTokens(userId: string | number): Promise<void>;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Extract user from JWT token without full validation
 * Useful for quick checks
 */
export function extractUserFromToken(token: string): JwtPayload | null {
  try {
    // Decode without verification (for quick checks)
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = jwt.decode(token) as JwtPayload;
    if (!payload.exp) return false;

    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
