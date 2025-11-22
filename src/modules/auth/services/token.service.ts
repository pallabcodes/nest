import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface TokenPayload {
  sub: number;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Token Service
 *
 * Handles JWT token generation and validation.
 * Separated from AuthService for better single responsibility.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate access and refresh token pair
   */
  async generateTokens(
    userId: number,
    email: string,
    roles: string[] = ['USER'],
  ): Promise<TokenPair> {
    try {
      const payload: TokenPayload = { sub: userId, email, roles };
      const accessTokenExpiration =
        this.configService.get<string>('jwt.accessTokenExpiration') || '15m';
      const refreshTokenExpiration =
        this.configService.get<string>('jwt.refreshTokenExpiration') || '7d';

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
      this.logger.error(
        `Error generating tokens for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException(`Failed to generate authentication tokens: ${error.message}`);
    }
  }

  /**
   * Verify refresh token and extract payload
   */
  verifyRefreshToken(refreshToken: string): TokenPayload {
    try {
      return this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
