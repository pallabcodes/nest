/**
 * Neat Auth - OAuth Service
 *
 * Handles OAuth authentication with multiple providers
 * (Google, GitHub, Facebook, Twitter, LinkedIn)
 */

import { Injectable } from '@neat/core';
import {
  IOAuthService,
  OAuthProfile,
  OAuthProvider,
  OAuthConfig,
  OAuthConfigs,
  AuthTokens,
  User
} from '../interfaces/auth.interfaces.js';
import { AuthService } from './auth.service.js';

@Injectable()
export class OAuthService implements IOAuthService {
  private configs: OAuthConfigs = {};

  constructor(
    private readonly authService: AuthService,
    configs?: OAuthConfigs
  ) {
    if (configs) {
      this.configs = configs;
    } else {
      this.loadConfigsFromEnv();
    }
  }

  /**
   * Get OAuth authorization URL for a provider
   */
  getOAuthUrl(provider: OAuthProvider): string {
    const config = this.configs[provider];
    if (!config) {
      throw new Error(`OAuth provider '${provider}' not configured`);
    }

    // This would generate the appropriate OAuth URL based on the provider
    // For now, return a placeholder
    return `https://${provider}.com/oauth/authorize?client_id=${config.clientID}&redirect_uri=${encodeURIComponent(config.callbackURL)}&scope=${config.scope?.join('%20') || 'email profile'}`;
  }

  /**
   * Handle OAuth callback and generate tokens
   */
  async handleOAuthCallback(provider: OAuthProvider, code: string, state?: string): Promise<AuthTokens> {
    try {
      // 1. Exchange authorization code for access token
      const accessToken = await this.exchangeCodeForToken(provider, code);

      // 2. Get user profile from OAuth provider
      const profile = await this.getUserProfile(provider, accessToken);

      // 3. Find or create user
      const user = await this.findOrCreateUserFromOAuth(profile);

      // 4. Generate JWT tokens
      return await this.authService.generateTokens(user);
    } catch (error) {
      throw new Error(`OAuth callback failed for ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find or create user from OAuth profile
   */
  async findOrCreateUserFromOAuth(profile: OAuthProfile): Promise<User> {
    // Try to find existing user by OAuth ID or email
    let user = await this.findUserByOAuthId(profile.provider, profile.id);

    if (!user && profile.email) {
      user = await this.authService.findUserByEmail(profile.email);
    }

    if (user) {
      // Update user with latest OAuth profile data
      return await this.updateUserFromOAuthProfile(user, profile);
    } else {
      // Create new user from OAuth profile
      return await this.createUserFromOAuthProfile(profile);
    }
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private loadConfigsFromEnv(): void {
    // Load OAuth configurations from environment variables
    const providers: (keyof OAuthConfigs)[] = ['google', 'github', 'facebook', 'twitter', 'linkedin'];

    for (const provider of providers) {
      const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
      const callbackUrl = process.env[`${provider.toUpperCase()}_CALLBACK_URL`];

      if (clientId && clientSecret && callbackUrl) {
        this.configs[provider] = {
          clientID: clientId,
          clientSecret,
          callbackURL: callbackUrl,
          scope: this.getDefaultScopes(provider)
        };
      }
    }
  }

  private getDefaultScopes(provider: OAuthProvider): string[] {
    const defaultScopes: Record<OAuthProvider, string[]> = {
      google: ['email', 'profile'],
      github: ['user:email'],
      facebook: ['email', 'public_profile'],
      twitter: ['email'],
      linkedin: ['r_emailaddress', 'r_liteprofile']
    };

    return defaultScopes[provider] || ['email'];
  }

  private async exchangeCodeForToken(provider: OAuthProvider, code: string): Promise<string> {
    // This would make HTTP requests to exchange the authorization code for an access token
    // Implementation depends on the specific OAuth provider
    throw new Error(`OAuth token exchange not implemented for ${provider}`);
  }

  private async getUserProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
    // This would make HTTP requests to get user profile from the OAuth provider
    // Implementation depends on the specific OAuth provider
    throw new Error(`OAuth profile retrieval not implemented for ${provider}`);
  }

  private async findUserByOAuthId(provider: OAuthProvider, oauthId: string): Promise<User | null> {
    // This would query your database for a user with the OAuth ID
    // Implementation depends on how you store OAuth IDs in your database
    throw new Error('findUserByOAuthId must be implemented by extending OAuthService');
  }

  private async updateUserFromOAuthProfile(user: User, profile: OAuthProfile): Promise<User> {
    // Update user with latest OAuth profile data
    const updates: Partial<User> = {};

    if (profile.name && !user.firstName && !user.lastName) {
      const nameParts = profile.name.split(' ');
      updates.firstName = nameParts[0];
      updates.lastName = nameParts.slice(1).join(' ');
    }

    if (profile.email && !user.email) {
      updates.email = profile.email;
    }

    if (Object.keys(updates).length > 0) {
      return await this.authService.updateUser(user.id, updates) || user;
    }

    return user;
  }

  private async createUserFromOAuthProfile(profile: OAuthProfile): Promise<User> {
    // Create new user from OAuth profile
    const userData = {
      email: profile.email!,
      username: profile.email?.split('@')[0],
      firstName: profile.firstName || profile.name?.split(' ')[0],
      lastName: profile.lastName || profile.name?.split(' ').slice(1).join(' '),
      roles: ['user'],
      isActive: true,
      emailVerified: true, // OAuth emails are typically verified
      lastLogin: new Date()
    };

    return await this.authService.createUser(userData);
  }
}

// ========================================
// PROVIDER-SPECIFIC IMPLEMENTATIONS
// ========================================

/**
 * Google OAuth Service
 */
@Injectable()
export class GoogleOAuthService extends OAuthService {
  protected async exchangeCodeForToken(code: string): Promise<string> {
    // Google-specific token exchange implementation
    // This would make a POST request to https://oauth2.googleapis.com/token
    throw new Error('Google OAuth token exchange not implemented');
  }

  protected async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    // Google-specific profile retrieval
    // This would make a GET request to https://www.googleapis.com/oauth2/v2/userinfo
    throw new Error('Google OAuth profile retrieval not implemented');
  }
}

/**
 * GitHub OAuth Service
 */
@Injectable()
export class GitHubOAuthService extends OAuthService {
  protected async exchangeCodeForToken(code: string): Promise<string> {
    // GitHub-specific token exchange implementation
    throw new Error('GitHub OAuth token exchange not implemented');
  }

  protected async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    // GitHub-specific profile retrieval
    throw new Error('GitHub OAuth profile retrieval not implemented');
  }
}

// ========================================
// OAUTH UTILITIES
// ========================================

/**
 * Generate OAuth state parameter for CSRF protection
 */
export function generateOAuthState(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

/**
 * Validate OAuth state parameter
 */
export function validateOAuthState(state: string, expectedState: string): boolean {
  return state === expectedState;
}

/**
 * Create OAuth callback URL
 */
export function createCallbackUrl(baseUrl: string, provider: OAuthProvider): string {
  return `${baseUrl}/auth/oauth/${provider}/callback`;
}

/**
 * Get available OAuth providers
 */
export function getAvailableProviders(configs: OAuthConfigs): OAuthProvider[] {
  return Object.keys(configs) as OAuthProvider[];
}

/**
 * Check if OAuth provider is configured
 */
export function isProviderConfigured(configs: OAuthConfigs, provider: OAuthProvider): boolean {
  return provider in configs;
}
