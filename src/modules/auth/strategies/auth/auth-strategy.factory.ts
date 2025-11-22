import { Injectable } from '@nestjs/common';
import { AuthRepository } from '../../auth.repository';
import { TokenService } from '../../services/token.service';
import { OtpService } from '../../services/otp.service';
import { ConfigService } from '@nestjs/config';
import { AuthStrategy } from './auth.strategy.interface';
import { SimpleAuthStrategy } from './simple-auth.strategy';
import { FullAuthStrategy } from './full-auth.strategy';

/**
 * Auth Strategy Type
 */
export enum AuthStrategyType {
  SIMPLE = 'simple',
  FULL = 'full',
}

/**
 * Auth Strategy Factory
 *
 * Creates authentication strategy instances based on configuration.
 * Enables runtime switching between different auth approaches.
 */
@Injectable()
export class AuthStrategyFactory {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create auth strategy based on type
   */
  createStrategy(type: AuthStrategyType): AuthStrategy {
    switch (type) {
      case AuthStrategyType.SIMPLE:
        return new SimpleAuthStrategy(
          this.authRepository,
          this.tokenService,
          this.configService,
        );

      case AuthStrategyType.FULL:
        return new FullAuthStrategy(
          this.authRepository,
          this.tokenService,
          this.otpService,
          this.configService,
        );

      default:
        throw new Error(`Unknown auth strategy type: ${type}`);
    }
  }

  /**
   * Create strategy based on configuration
   */
  createFromConfig(): AuthStrategy {
    const strategyType = this.configService.get<AuthStrategyType>(
      'auth.strategy',
      AuthStrategyType.FULL
    );

    return this.createStrategy(strategyType);
  }

  /**
   * Get available strategy types
   */
  getAvailableStrategies(): AuthStrategyType[] {
    return Object.values(AuthStrategyType);
  }

  /**
   * Validate strategy type
   */
  isValidStrategy(type: string): type is AuthStrategyType {
    return Object.values(AuthStrategyType).includes(type as AuthStrategyType);
  }
}
