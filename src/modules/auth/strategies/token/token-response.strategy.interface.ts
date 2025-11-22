import { Response } from 'express';
import { TokenPair } from '../auth/auth.strategy.interface';

// Re-export TokenPair for convenience
export type { TokenPair };

/**
 * Token Response Strategy Interface
 *
 * Defines how authentication tokens are delivered to clients.
 * Supports multiple response methods: body, cookies, headers, etc.
 */
export interface TokenResponseStrategy {
  /**
   * Send tokens in response
   */
  sendTokens(tokens: TokenPair, res: Response): void | Promise<void>;

  /**
   * Clear tokens from response
   */
  clearTokens(res: Response): void | Promise<void>;

  /**
   * Check if tokens are present in request
   */
  hasTokens(req: any): boolean;

  /**
   * Extract tokens from request
   */
  extractTokens(req: any): TokenPair | null;
}

/**
 * Token Response Strategy Type
 * Used for configuration and factory selection
 */
export enum TokenResponseStrategyType {
  BODY = 'body',
  COOKIE = 'cookie',
  HEADER = 'header',
  CUSTOM = 'custom',
}

/**
 * Token Response Options
 * Configuration for different token response strategies
 */
export interface TokenResponseOptions {
  strategy: TokenResponseStrategyType;
  cookieOptions?: CookieTokenOptions;
  headerOptions?: HeaderTokenOptions;
  customHandler?: (tokens: TokenPair, res: Response) => void | Promise<void>;
}

/**
 * Cookie Token Options
 */
export interface CookieTokenOptions {
  accessToken: {
    name: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number; // in milliseconds
  };
  refreshToken: {
    name: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number; // in milliseconds
  };
}

/**
 * Header Token Options
 */
export interface HeaderTokenOptions {
  accessToken: {
    name: string;
  };
  refreshToken: {
    name: string;
  };
}
