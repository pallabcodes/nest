import { Injectable } from '@nestjs/common';
import { TokenService } from '../services/token.service';

/**
 * Token Utility
 *
 * Higher-level token operations and validations.
 * Abstracts complex token logic from services.
 */
@Injectable()
export class TokenUtil {
  constructor(private readonly tokenService: TokenService) {}

  /**
   * Validate token payload structure
   */
  validatePayload(payload: any): { isValid: boolean; userId?: number; email?: string } {
    if (!payload || typeof payload !== 'object') {
      return { isValid: false };
    }

    const { sub, email, iat, exp } = payload;

    // Check required fields
    if (!sub || !email) {
      return { isValid: false };
    }

    // Check token expiration (with 30 second buffer)
    if (exp && Date.now() >= (exp * 1000 - 30000)) {
      return { isValid: false };
    }

    return {
      isValid: true,
      userId: typeof sub === 'number' ? sub : parseInt(sub, 10),
      email: typeof email === 'string' ? email : String(email),
    };
  }

  /**
   * Check if token is close to expiration
   */
  isTokenNearExpiration(token: string, thresholdMinutes: number = 30): boolean {
    try {
      const payload = this.tokenService.verifyRefreshToken(token);
      if (!payload.exp) return true;

      const expirationTime = payload.exp * 1000;
      const thresholdTime = Date.now() + (thresholdMinutes * 60 * 1000);

      return expirationTime <= thresholdTime;
    } catch {
      return true; // Consider invalid tokens as "near expiration"
    }
  }

  /**
   * Extract user info from token without full verification
   */
  decodeToken(token: string): any | null {
    try {
      // Simple base64 decode for JWT payload (not cryptographically secure)
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}
