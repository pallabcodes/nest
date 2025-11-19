/**
 * Authentication and Authorization Type Definitions
 * 
 * This file provides centralized type definitions for authentication-related types
 * used throughout the application, ensuring type safety and consistency.
 */

/**
 * JWT Payload structure embedded in access and refresh tokens
 */
export interface JwtPayload {
  /** User ID (subject) */
  sub: number;
  /** User email address */
  email: string;
  /** Array of role names (e.g., ['ADMIN', 'USER']) */
  roles: string[];
}

/**
 * Authenticated user object returned by JWT Strategy
 * This is what gets attached to request.user after JWT validation
 */
export interface AuthenticatedUser {
  /** User ID */
  id: number;
  /** User email address */
  email: string;
  /** User display name */
  name: string;
  /** Array of role names (normalized to uppercase) */
  roles: string[];
}

/**
 * User object structure used in controllers and services
 * Supports both full user data and minimal user data from JWT
 */
export interface UserPayload {
  /** User ID (required) */
  id: number;
  /** User email (optional in some contexts) */
  email?: string;
  /** User display name (optional in some contexts) */
  name?: string;
  /** Array of role names (optional, defaults to ['USER']) */
  roles?: string[];
}

/**
 * OAuth callback user structure
 * Used when handling OAuth authentication (Google, etc.)
 */
export interface OAuthUser {
  /** User ID */
  id: number;
  /** User email (required for OAuth) */
  email: string;
  /** User display name (required for OAuth) */
  name: string;
}

/**
 * Token pair structure returned after successful authentication
 */
export interface TokenPair {
  /** JWT access token (short-lived, e.g., 15 minutes) */
  accessToken: string;
  /** JWT refresh token (long-lived, e.g., 7 days) */
  refreshToken: string;
}

/**
 * Login response structure
 */
export interface LoginResponse {
  /** User information (without sensitive data) */
  user: {
    id: number;
    email: string;
    name: string;
    isEmailVerified: boolean;
  };
  /** Token pair for authentication */
  tokens: TokenPair;
}

/**
 * Registration response structure
 */
export interface RegisterResponse {
  /** User information */
  user: {
    id: number;
    email: string;
    name: string;
    isEmailVerified: boolean;
  };
  /** Token pair (if auto-login enabled) */
  tokens?: TokenPair;
  /** OTP information (if email verification required) */
  otp?: {
    code: string;
    expiresAt: Date;
  };
}

/**
 * Role name type - union of all possible role names
 * Extend this as new roles are added to the system
 */
export type RoleName = 'ADMIN' | 'USER' | 'TEACHER' | 'STUDENT';

/**
 * Extended Express Request with authenticated user
 * Use this to type request.user in controllers and guards
 */
declare global {
  namespace Express {
    interface Request {
      /** Authenticated user object (set by JWT Strategy) */
      user?: AuthenticatedUser;
    }
  }
}

export {};

