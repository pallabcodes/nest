import type { RegisterResponse, LoginResponse } from '@shared-types/auth';
import type { ApiResponse, SuccessMessageResponse } from '@shared-types/api';

/**
 * AuthResponsePresenter
 *
 * Presents auth-related domain entities/DTOs in API response format.
 *
 * Use this presenter in AuthController to ensure consistent response formats
 * and easy matching of expected response formats (assignments, API contracts).
 */
export class AuthResponsePresenter {
  /**
   * Registration response with optional OTP
   */
  static register(data: {
    user: { id: number; email: string; name: string; isEmailVerified: boolean };
    tokens?: { accessToken: string; refreshToken: string };
    otp?: { code: string; expiresAt: Date };
  }): ApiResponse<{ user: RegisterResponse['user']; otp?: RegisterResponse['otp'] }> {
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
   * Login response
   */
  static login(data: {
    user: { id: number; email: string; name: string; isEmailVerified: boolean };
    tokens?: { accessToken: string; refreshToken: string };
  }): ApiResponse<{ user: LoginResponse['user'] }> {
    if (!data?.user) {
      return {
        success: false,
        message: 'Invalid response data',
        data: null as unknown as { user: LoginResponse['user'] },
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
   * Token refresh response
   */
  static refresh(
    tokens:
      | { accessToken: string; refreshToken: string }
      | { tokens: { accessToken: string; refreshToken: string } },
  ) {
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
   * OAuth authentication response
   */
  static oauth(data: {
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
   * Success message response (for verify, resend, etc.)
   */
  static success(message: string, data?: unknown): SuccessMessageResponse | ApiResponse<unknown> {
    if (data) {
      return {
        success: true,
        message,
        data: data as unknown,
      };
    }
    return {
      success: true,
      message,
      data: null,
    };
  }

  /**
   * Generic response wrapper
   */
  static wrap<T = unknown>(domain: T): ApiResponse<T> {
    return {
      success: true,
      data: domain,
    };
  }

  /**
   * Current user profile response
   */
  static profile(domain: {
    id: number;
    email: string;
    name: string;
    phone?: string | null;
    isEmailVerified: boolean;
    isActive?: boolean;
    roles?: string[] | Array<{ name: string }>;
    createdAt: Date;
    updatedAt: Date;
  }): ApiResponse<{
    id: number;
    email: string;
    name: string;
    phone?: string | null;
    isEmailVerified: boolean;
    isActive: boolean;
    roles: string[];
    createdAt: Date;
    updatedAt: Date;
  }> {
    // Extract roles - handle both string arrays (from JWT) and object arrays (from DB)
    let roles: string[] = [];
    if (domain.roles && Array.isArray(domain.roles)) {
      roles = domain.roles
        .map((r: string | { name: string }) => {
          if (typeof r === 'string') {
            return r;
          }
          if (r && typeof r === 'object' && 'name' in r && typeof r.name === 'string') {
            return r.name;
          }
          return null;
        })
        .filter((r: string | null): r is string => r !== null && r !== undefined && r !== '');
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
        roles,
        createdAt: domain.createdAt,
        updatedAt: domain.updatedAt,
      },
    };
  }
}
