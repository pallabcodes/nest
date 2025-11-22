import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TokenResponseStrategy,
  TokenResponseStrategyType,
  TokenResponseOptions,
} from './token-response.strategy.interface';

// Re-export for convenience
export { TokenResponseStrategyType };
import { BodyTokenStrategy } from './body-token.strategy';
import { CookieTokenStrategy } from './cookie-token.strategy';

/**
 * Token Response Strategy Factory
 *
 * Creates token response strategy instances based on configuration.
 * Enables runtime switching between different token delivery methods.
 */
@Injectable()
export class TokenResponseStrategyFactory {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Create token response strategy based on type and options
   */
  createStrategy(
    type: TokenResponseStrategyType,
    options?: Partial<TokenResponseOptions>
  ): TokenResponseStrategy {
    switch (type) {
      case TokenResponseStrategyType.BODY:
        return new BodyTokenStrategy();

      case TokenResponseStrategyType.COOKIE:
        const cookieOptions = options?.cookieOptions || CookieTokenStrategy.getDefaultOptions();
        return new CookieTokenStrategy(cookieOptions);

      case TokenResponseStrategyType.HEADER:
        throw new Error('Header token strategy not implemented yet');

      case TokenResponseStrategyType.CUSTOM:
        if (!options?.customHandler) {
          throw new Error('Custom token strategy requires customHandler');
        }
        return new CustomTokenStrategy(options.customHandler);

      default:
        throw new Error(`Unknown token response strategy type: ${type}`);
    }
  }

  /**
   * Create strategy based on configuration
   */
  createFromConfig(): TokenResponseStrategy {
    const config = this.configService.get<TokenResponseOptions>('auth.tokens', {
      strategy: TokenResponseStrategyType.BODY,
    });

    return this.createStrategy(config.strategy, config);
  }

  /**
   * Get available strategy types
   */
  getAvailableStrategies(): TokenResponseStrategyType[] {
    return Object.values(TokenResponseStrategyType);
  }

  /**
   * Validate strategy type
   */
  isValidStrategy(type: string): type is TokenResponseStrategyType {
    return Object.values(TokenResponseStrategyType).includes(type as TokenResponseStrategyType);
  }
}

/**
 * Custom Token Strategy
 *
 * Allows completely custom token handling logic
 */
class CustomTokenStrategy implements TokenResponseStrategy {
  constructor(
    private readonly customHandler: (tokens: any, res: any) => void | Promise<void>
  ) {}

  sendTokens(tokens: any, res: any): void | Promise<void> {
    return this.customHandler(tokens, res);
  }

  clearTokens(res: any): void | Promise<void> {
    // Custom strategies should handle clearing in their own way
  }

  hasTokens(req: any): boolean {
    // Custom strategies need to implement their own token checking
    return false;
  }

  extractTokens(req: any): any {
    // Custom strategies need to implement their own token extraction
    return null;
  }
}
