/**
 * STRATEGY USAGE EXAMPLE
 *
 * Complete example showing how to use auth strategies when you need multiple auth approaches.
 * This demonstrates the "advanced" usage pattern for when strategies are actually justified.
 */

import { Injectable, Controller, Post, Body, Param, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RegisterDto } from '../src/modules/auth/dto/register.dto';
import { LoginDto } from '../src/modules/auth/dto/login.dto';
import { AuthResponsePresenter } from '../src/modules/auth/presenters/auth-response.presenter';

// Import strategy components
import { AuthStrategyFactory, AuthStrategyType } from '../src/modules/auth/strategies/auth/auth-strategy.factory';
import { TokenResponseStrategyFactory, TokenResponseStrategyType } from '../src/modules/auth/strategies/token/token-response-strategy.factory';

// Types for clarity
type UserType = 'basic' | 'premium' | 'enterprise';
type Environment = 'development' | 'staging' | 'production';

/**
 * BUSINESS REQUIREMENT SCENARIO:
 *
 * Your app has different user tiers with different auth requirements:
 * - Basic users: Simple registration (no email verification)
 * - Premium users: Full OTP verification + email confirmation
 * - Enterprise users: Advanced security with additional validations
 *
 * You also need different token handling based on client type:
 * - Web clients: HttpOnly cookies for security
 * - Mobile/SPA clients: Response body tokens
 */

// =============================================================================
// 1. STRATEGY SERVICE - Business Logic Layer
// =============================================================================

@Injectable()
export class AdvancedAuthService {
  constructor(
    private readonly authStrategyFactory: AuthStrategyFactory,
    private readonly tokenStrategyFactory: TokenResponseStrategyFactory,
  ) {}

  /**
   * Register user with strategy based on user type
   */
  async registerUser(dto: RegisterDto, userType: UserType, clientType: 'web' | 'mobile') {
    // Choose auth strategy based on user type
    const authStrategy = this.selectAuthStrategy(userType);

    // Choose token strategy based on client type
    const tokenStrategy = this.selectTokenStrategy(clientType);

    // Execute registration with chosen strategy
    const result = await authStrategy.register(dto);

    // Apply token handling strategy
    if (result.tokens) {
      // In real implementation, you'd pass the response object
      // tokenStrategy.sendTokens(result.tokens, response);
      console.log(`Tokens sent via ${clientType} strategy`);
    }

    return result;
  }

  /**
   * Login with environment-based strategy selection
   */
  async loginUser(dto: LoginDto, environment: Environment, clientType: 'web' | 'mobile') {
    // Choose strategy based on environment
    const strategyType = this.getStrategyForEnvironment(environment);
    const authStrategy = this.authStrategyFactory.createStrategy(strategyType);

    const result = await authStrategy.login(dto);

    // Apply token strategy
    const tokenStrategy = this.selectTokenStrategy(clientType);
    if (result.tokens) {
      console.log(`Tokens sent via ${clientType} strategy in ${environment}`);
    }

    return result;
  }

  /**
   * Dynamic strategy selection based on business rules
   */
  async processRegistration(dto: RegisterDto, context: {
    userType: UserType;
    environment: Environment;
    clientType: 'web' | 'mobile';
    featureFlags?: {
      enableAdvancedSecurity?: boolean;
      requireEmailVerification?: boolean;
    };
  }) {
    // Complex business logic for strategy selection
    const strategyType = this.determineStrategyFromContext(context);
    const authStrategy = this.authStrategyFactory.createStrategy(strategyType);

    return authStrategy.register(dto);
  }

  // ============ PRIVATE METHODS ============

  private selectAuthStrategy(userType: UserType): any {
    const strategyMap = {
      basic: AuthStrategyType.SIMPLE,      // No email verification
      premium: AuthStrategyType.FULL,      // Full OTP verification
      enterprise: AuthStrategyType.FULL,   // Could be custom enterprise strategy
    };

    const strategyType = strategyMap[userType];
    return this.authStrategyFactory.createStrategy(strategyType);
  }

  private selectTokenStrategy(clientType: 'web' | 'mobile'): any {
    const strategyType = clientType === 'web'
      ? TokenResponseStrategyType.COOKIE
      : TokenResponseStrategyType.BODY;

    return this.tokenStrategyFactory.createStrategy(strategyType);
  }

  private getStrategyForEnvironment(environment: Environment): AuthStrategyType {
    // Different security levels per environment
    const envStrategies = {
      development: AuthStrategyType.SIMPLE,   // Fast development
      staging: AuthStrategyType.FULL,         // Full testing
      production: AuthStrategyType.FULL,      // Maximum security
    };

    return envStrategies[environment];
  }

  private determineStrategyFromContext(context: any): AuthStrategyType {
    // Complex business logic example
    if (context.featureFlags?.enableAdvancedSecurity) {
      return AuthStrategyType.FULL;
    }

    if (context.userType === 'enterprise') {
      return AuthStrategyType.FULL;
    }

    if (context.environment === 'production') {
      return AuthStrategyType.FULL;
    }

    return AuthStrategyType.SIMPLE;
  }
}

// =============================================================================
// 2. CONTROLLER - Presentation Layer
// =============================================================================

@ApiTags('Advanced Auth Example')
@Controller('auth-advanced')
export class AdvancedAuthController {
  constructor(private readonly advancedAuthService: AdvancedAuthService) {}

  /**
   * Register basic user (simple strategy)
   */
  @Post('register/basic')
  @ApiOperation({
    summary: 'Register Basic User',
    description: 'Simple registration without email verification'
  })
  async registerBasic(@Body(ValidationPipe) dto: RegisterDto) {
    const result = await this.advancedAuthService.registerUser(dto, 'basic', 'web');

    // Ensure result matches presenter expectations
    const safeResult = {
      user: result.user!,
      tokens: result.tokens,
      otp: result.otp,
    };

    return AuthResponsePresenter.register(safeResult);
  }

  /**
   * Register premium user (full strategy)
   */
  @Post('register/premium')
  @ApiOperation({
    summary: 'Register Premium User',
    description: 'Full registration with OTP email verification'
  })
  async registerPremium(@Body(ValidationPipe) dto: RegisterDto) {
    const result = await this.advancedAuthService.registerUser(dto, 'premium', 'web');

    const safeResult = {
      user: result.user!,
      tokens: result.tokens,
      otp: result.otp,
    };

    return AuthResponsePresenter.register(safeResult);
  }

  /**
   * Dynamic registration based on context
   */
  @Post('register/dynamic')
  @ApiOperation({
    summary: 'Dynamic Registration',
    description: 'Strategy chosen based on business context'
  })
  async registerDynamic(@Body(ValidationPipe) dto: RegisterDto) {
    const context = {
      userType: 'premium' as UserType,
      environment: 'production' as Environment,
      clientType: 'mobile' as 'web' | 'mobile',
      featureFlags: {
        enableAdvancedSecurity: true,
        requireEmailVerification: true,
      },
    };

    const result = await this.advancedAuthService.processRegistration(dto, context);

    const safeResult = {
      user: result.user!,
      tokens: result.tokens,
      otp: result.otp,
    };

    return AuthResponsePresenter.register(safeResult);
  }

  /**
   * Environment-based login
   */
  @Post('login/:environment')
  @ApiOperation({
    summary: 'Environment-Based Login',
    description: 'Different strategies for dev/staging/production'
  })
  async loginByEnvironment(
    @Body(ValidationPipe) dto: LoginDto,
    @Param('environment') environment: string,
  ) {
    const env = environment as Environment;
    const result = await this.advancedAuthService.loginUser(dto, env, 'web');

    const safeResult = {
      user: result.user!,
      tokens: result.tokens,
    };

    return AuthResponsePresenter.login(safeResult);
  }
}

// =============================================================================
// 3. MODULE SETUP - Infrastructure Layer
// =============================================================================

/**
 * Example module showing how to wire up strategy-based auth
 * when you actually need multiple auth approaches.
 */
export class AdvancedAuthExampleModule {
  // This would show how to import strategy factories
  // and wire them into the advanced auth service
}

// =============================================================================
// 4. USAGE EXAMPLES - How to Use in Practice
// =============================================================================

/**
 * PRACTICAL USAGE SCENARIOS:
 */

// Scenario 1: SaaS with multiple user tiers
export class SaaSRegistrationService {
  constructor(private readonly advancedAuthService: AdvancedAuthService) {}

  async registerUser(dto: RegisterDto, subscriptionTier: 'free' | 'pro' | 'enterprise') {
    const userType = this.mapSubscriptionToUserType(subscriptionTier);
    return this.advancedAuthService.registerUser(dto, userType, 'web');
  }

  private mapSubscriptionToUserType(tier: string): UserType {
    const mapping = {
      free: 'basic' as UserType,
      pro: 'premium' as UserType,
      enterprise: 'enterprise' as UserType,
    };
    return mapping[tier] || 'basic';
  }
}

// Scenario 2: Multi-tenant application
export class MultiTenantAuthService {
  constructor(private readonly advancedAuthService: AdvancedAuthService) {}

  async authenticateForTenant(dto: LoginDto, tenantId: string) {
    const tenantConfig = await this.getTenantConfig(tenantId);
    const environment = tenantConfig.securityLevel as Environment;

    return this.advancedAuthService.loginUser(dto, environment, 'web');
  }

  private async getTenantConfig(tenantId: string) {
    // Mock implementation
    return { securityLevel: 'production' };
  }
}

// Scenario 3: Feature-flagged auth
export class FeatureFlaggedAuthService {
  constructor(private readonly advancedAuthService: AdvancedAuthService) {}

  async registerWithFeatures(dto: RegisterDto, enabledFeatures: string[]) {
    const context = {
      userType: 'premium' as UserType,
      environment: 'production' as Environment,
      clientType: 'web' as const,
      featureFlags: {
        enableAdvancedSecurity: enabledFeatures.includes('advanced-security'),
        requireEmailVerification: enabledFeatures.includes('email-verification'),
      },
    };

    return this.advancedAuthService.processRegistration(dto, context);
  }
}

/**
 * KEY INSIGHT:
 *
 * Strategies are ONLY used when you have legitimate business requirements
 * for multiple auth approaches. Don't use them just because you can.
 *
 * Use the simple AuthService for 99% of cases. Use strategies for the 1%
 * where you actually need different auth flows.
 */
