import { AuthStrategyType } from './strategies/auth/auth-strategy.factory';
import { TokenResponseStrategyType } from './strategies/token/token-response.strategy.interface';

/**
 * Authentication Configuration Examples
 *
 * Copy these examples to your .env file or config service
 */

// =============================================================================
// 🚀 QUICK START - Simple Auth + Body Tokens (Perfect for MVPs)
// =============================================================================
export const MVP_CONFIG = {
  // Simple registration (no email verification)
  auth: {
    strategy: AuthStrategyType.SIMPLE,
  },
  // Tokens in response body (for SPAs)
  tokens: {
    strategy: TokenResponseStrategyType.BODY,
  },
};

// =============================================================================
// 🔒 PRODUCTION READY - Full Auth + Cookie Tokens
// =============================================================================
export const PRODUCTION_CONFIG = {
  // Full security (email verification, password reset)
  auth: {
    strategy: AuthStrategyType.FULL,
  },
  // Http-only cookies (secure for web apps)
  tokens: {
    strategy: TokenResponseStrategyType.COOKIE,
    cookieOptions: {
      accessToken: {
        name: 'accessToken',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      },
      refreshToken: {
        name: 'refreshToken',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    },
  },
};

// =============================================================================
// 🧪 TESTING - Hardcoded Auth + Custom Tokens (if you add it)
// =============================================================================
export const TESTING_CONFIG = {
  // Custom hardcoded strategy for testing
  auth: {
    strategy: 'hardcoded' as any, // Would need to add this strategy
  },
  // Custom token handling
  tokens: {
    strategy: TokenResponseStrategyType.CUSTOM,
    customHandler: (tokens: any, res: any) => {
      // Custom logic, e.g., store in Redis, send via WebSocket, etc.
      console.log('Custom token handling:', tokens);
    },
  },
};

// =============================================================================
// 📱 MOBILE APP - Simple Auth + Header Tokens
// =============================================================================
export const MOBILE_CONFIG = {
  auth: {
    strategy: AuthStrategyType.SIMPLE,
  },
  tokens: {
    strategy: 'header' as any, // Would need to implement HeaderTokenStrategy
    headerOptions: {
      accessToken: { name: 'X-Access-Token' },
      refreshToken: { name: 'X-Refresh-Token' },
    },
  },
};

/**
 * How to Use:
 *
 * 1. In your .env file:
 *    AUTH_STRATEGY=simple
 *    AUTH_TOKENS_STRATEGY=body
 *
 * 2. Or in your config service:
 *    export default () => ({
 *      auth: PRODUCTION_CONFIG.auth,
 *      tokens: PRODUCTION_CONFIG.tokens,
 *    });
 *
 * 3. Switch instantly by changing config values!
 */
