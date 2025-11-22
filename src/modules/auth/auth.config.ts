import { AuthStrategy } from './strategies/auth/auth.strategy.interface';
import { TokenResponseStrategy } from './strategies/token/token-response.strategy.interface';
import { AuthStrategyFactory } from './strategies/auth/auth-strategy.factory';
import { TokenResponseStrategyFactory } from './strategies/token/token-response-strategy.factory';

/**
 * Auth Configuration
 *
 * Centralized configuration for authentication strategies and token handling.
 * This module provides the strategies that the AuthService will use.
 */
export class AuthConfig {
  constructor(
    private readonly authStrategy: AuthStrategy,
    private readonly tokenStrategy: TokenResponseStrategy,
  ) {}

  /**
   * Get the configured auth strategy
   */
  getAuthStrategy(): AuthStrategy {
    return this.authStrategy;
  }

  /**
   * Get the configured token response strategy
   */
  getTokenStrategy(): TokenResponseStrategy {
    return this.tokenStrategy;
  }

  /**
   * Create auth config from factories
   */
  static create(
    authFactory: AuthStrategyFactory,
    tokenFactory: TokenResponseStrategyFactory,
  ): AuthConfig {
    const authStrategy = authFactory.createFromConfig();
    const tokenStrategy = tokenFactory.createFromConfig();

    return new AuthConfig(authStrategy, tokenStrategy);
  }
}
