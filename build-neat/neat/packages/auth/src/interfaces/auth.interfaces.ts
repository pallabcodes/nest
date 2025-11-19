/**
 * Neat Auth - Core Authentication Interfaces
 *
 * Zero-configuration authentication types and interfaces
 * that work seamlessly with auto-discovery
 */

import { Request } from '@neat/core';

// ========================================
// USER & AUTHENTICATION TYPES
// ========================================

export interface User {
  id: string | number;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  permissions?: string[];
  isActive?: boolean;
  emailVerified?: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthUser extends User {
  // Additional auth-specific properties
  tokenVersion?: number;
  refreshTokenVersion?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface RefreshTokenData {
  userId: string | number;
  tokenVersion: number;
  iat: number;
  exp: number;
}

// ========================================
// JWT & TOKEN TYPES
// ========================================

export interface JwtPayload {
  sub: string | number; // User ID
  email: string;
  roles?: string[];
  permissions?: string[];
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string | number; // User ID
  tokenVersion: number;
  refreshTokenVersion: number;
  iat?: number;
  exp?: number;
}

// ========================================
// OAUTH TYPES
// ========================================

export interface OAuthProfile {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  provider: OAuthProvider;
  raw: any; // Provider-specific raw data
}

export type OAuthProvider = 'google' | 'github' | 'facebook' | 'twitter' | 'linkedin';

export interface OAuthConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope?: string[];
}

export interface OAuthConfigs {
  google?: OAuthConfig;
  github?: OAuthConfig;
  facebook?: OAuthConfig;
  twitter?: OAuthConfig;
  linkedin?: OAuthConfig;
}

// ========================================
// AUTH CONFIGURATION
// ========================================

export interface AuthConfig {
  jwt: {
    secret: string;
    expiresIn: string | number;
    refreshExpiresIn: string | number;
    issuer?: string;
    audience?: string;
  };
  bcrypt: {
    rounds: number;
  };
  oauth?: OAuthConfigs;
  routes?: {
    login?: string;
    register?: string;
    refresh?: string;
    logout?: string;
    profile?: string;
    oauth?: {
      google?: string;
      github?: string;
      facebook?: string;
      twitter?: string;
      linkedin?: string;
    };
  };
}

// ========================================
// GUARD & DECORATOR TYPES
// ========================================

export interface AuthGuardContext {
  request: Request;
  user?: AuthUser;
  roles?: string[];
  permissions?: string[];
}

export type AuthGuardResult = boolean | Promise<boolean>;

export interface RolesConfig {
  roles: string[];
  requireAll?: boolean; // If true, user must have ALL roles; if false, user must have ANY role
}

export interface PermissionsConfig {
  permissions: string[];
  requireAll?: boolean; // If true, user must have ALL permissions; if false, user must have ANY permission
}

// ========================================
// SERVICE INTERFACES
// ========================================

export interface IAuthService {
  validateUser(email: string, password: string): Promise<User | null>;
  createUser(userData: RegisterData): Promise<User>;
  findUserById(id: string | number): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string | number, updates: Partial<User>): Promise<User | null>;
  generateTokens(user: User): Promise<AuthTokens>;
  validateToken(token: string): Promise<JwtPayload | null>;
  refreshTokens(refreshToken: string): Promise<AuthTokens | null>;
  revokeUserTokens(userId: string | number): Promise<void>;
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
}

export interface IOAuthService {
  getOAuthUrl(provider: OAuthProvider): string;
  handleOAuthCallback(provider: OAuthProvider, code: string, state?: string): Promise<AuthTokens>;
  findOrCreateUserFromOAuth(profile: OAuthProfile): Promise<User>;
}

export interface IRoleService {
  hasRole(user: User, role: string): boolean;
  hasAnyRole(user: User, roles: string[]): boolean;
  hasAllRoles(user: User, roles: string[]): boolean;
  addRole(userId: string | number, role: string): Promise<void>;
  removeRole(userId: string | number, role: string): Promise<void>;
  getUserRoles(userId: string | number): Promise<string[]>;
}

export interface IPermissionService {
  hasPermission(user: User, permission: string): boolean;
  hasAnyPermission(user: User, permissions: string[]): boolean;
  hasAllPermissions(user: User, permissions: string[]): boolean;
  addPermission(userId: string | number, permission: string): Promise<void>;
  removePermission(userId: string | number, permission: string): Promise<void>;
  getUserPermissions(userId: string | number): Promise<string[]>;
}

// ========================================
// DECORATOR METADATA
// ========================================

export interface AuthMetadata {
  required: boolean;
  roles?: RolesConfig;
  permissions?: PermissionsConfig;
  strategies?: string[];
}

export interface RouteAuthMetadata extends AuthMetadata {
  public?: boolean; // Explicitly mark route as public (overrides class-level auth)
}

// ========================================
// ERROR TYPES
// ========================================

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message: string = 'Token expired') {
    super(message, 'TOKEN_EXPIRED', 401);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends AuthError {
  constructor(message: string = 'Invalid token') {
    super(message, 'INVALID_TOKEN', 401);
    this.name = 'InvalidTokenError';
  }
}

// ========================================
// UTILITY TYPES
// ========================================

export type PasswordHash = string;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TokenValidationResult {
  isValid: boolean;
  payload?: JwtPayload;
  error?: string;
}

// ========================================
// REQUEST EXTENSIONS
// ========================================

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

declare module '@neat/core' {
  interface Request {
    user?: AuthUser;
  }
}
