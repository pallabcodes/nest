import { Injectable } from '@nestjs/common';
import { BaseResponseMapper } from '@common/mappers/base-response-mapper';

/**
 * AuthResponseMapper
 *
 * Maps auth-related domain entities/DTOs to API response format.
 *
 * Use this mapper in AuthController to ensure consistent response formats
 * and easy matching of expected response formats (assignments, API contracts).
 */
@Injectable()
export class AuthResponseMapper extends BaseResponseMapper<any, any> {
  /**
   * Transform user registration response
   */
  toRegisterResponse(data: {
    user: any;
    tokens?: { accessToken: string; refreshToken: string };
    otp?: { code: string; expiresAt: Date };
  }) {
    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          isEmailVerified: data.user.isEmailVerified,
        },
        ...(data.otp && {
          otp: {
            code: data.otp.code,
            expiresAt: data.otp.expiresAt,
          },
        }),
      },
    };
  }

  /**
   * Transform login response
   */
  toLoginResponse(data: {
    user: any;
    tokens?: { accessToken: string; refreshToken: string };
  }) {
    if (!data || !data.user) {
      return {
        success: false,
        message: 'Invalid response data',
      };
    }
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          isEmailVerified: data.user.isEmailVerified,
        },
      },
    };
  }

  /**
   * Transform token refresh response
   */
  toRefreshTokenResponse(tokens: { accessToken: string; refreshToken: string } | { tokens: { accessToken: string; refreshToken: string } }) {
    // Handle both formats: direct tokens or wrapped in tokens property
    const tokenData = 'tokens' in tokens ? tokens.tokens : tokens;

    return {
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        tokens: {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
        },
      },
    };
  }

  /**
   * Transform OAuth callback response
   */
  toOAuthResponse(data: {
    user: { id: number; email: string; name: string };
    tokens?: { accessToken: string; refreshToken: string };
  }) {
    return {
      success: true,
      message: 'Authentication successful',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
        },
      },
    };
  }

  /**
   * Transform success message response (for verify, resend, etc.)
   */
  toSuccessMessageResponse(message: string, data?: any) {
    return {
      success: true,
      message,
      ...(data && { data }),
    };
  }

  /**
   * Default implementation (fallback)
   */
  toResponse(domain: any): any {
    return {
      success: true,
      data: domain,
    };
  }

  /**
   * CREATE response (for registration)
   */
  toCreateResponse(domain: any): any {
    if (domain.user) {
      return this.toRegisterResponse(domain);
    }
    return this.toResponse(domain);
  }

  /**
   * READ response (for get current user)
   */
  toReadResponse(domain: any): any {
    if (domain.id && domain.email) {
      // Extract roles - handle both string arrays (from JWT) and object arrays (from DB)
      let roles: string[] = [];
      if (domain.roles && Array.isArray(domain.roles)) {
        roles = domain.roles
          .map((r: any) => {
            if (typeof r === 'string') return r;
            if (r && typeof r === 'object' && r.name) return r.name;
            return null;
          })
          .filter((r: any) => r !== null && r !== undefined && r !== '');
      }
      
      return {
        success: true,
        data: {
          id: domain.id,
          email: domain.email,
          name: domain.name,
          phone: domain.phone,
          isEmailVerified: domain.isEmailVerified,
          isActive: domain.isActive !== undefined ? domain.isActive : true,
          roles: roles,
          createdAt: domain.createdAt,
          updatedAt: domain.updatedAt,
        },
      };
    }
    return this.toResponse(domain);
  }
}

