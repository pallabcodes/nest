import { Injectable, Controller, Post, Body, Param, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthStrategyFactory, AuthStrategyType } from './strategies/auth/auth-strategy.factory';
import { TokenResponseStrategyFactory, TokenResponseStrategyType } from './strategies/token/token-response-strategy.factory';
import { AuthResponsePresenter } from './presenters/auth-response.presenter';

/**
 * STRATEGY DEMONSTRATION SERVICE
 *
 * This shows how strategies work when you need multiple auth approaches.
 * NOT part of the main auth flow - just a demonstration.
 *
 * In real usage, you would conditionally use strategies based on:
 * - Environment (dev vs prod)
 * - User type (admin vs regular)
 * - Feature flags
 * - Configuration
 */
@Injectable()
export class AuthStrategiesDemoService {
  constructor(
    private readonly authStrategyFactory: AuthStrategyFactory,
    private readonly tokenStrategyFactory: TokenResponseStrategyFactory,
  ) {}

  /**
   * Example: Different auth flow based on user type
   */
  async registerWithStrategy(userType: 'simple' | 'full', dto: RegisterDto) {
    // Choose strategy based on business logic
    const strategyType = userType === 'simple'
      ? AuthStrategyType.SIMPLE
      : AuthStrategyType.FULL;

    const authStrategy = this.authStrategyFactory.createStrategy(strategyType);
    const result = await authStrategy.register(dto);

    // Ensure result matches presenter expectations for demo
    return {
      user: result.user!,
      tokens: result.tokens,
      otp: result.otp,
    };
  }

  /**
   * Example: Different token handling based on client type
   */
  async loginWithStrategy(clientType: 'web' | 'mobile', dto: LoginDto) {
    // Always use full auth strategy for login
    const authStrategy = this.authStrategyFactory.createStrategy(AuthStrategyType.FULL);

    // Choose token strategy based on client
    const tokenStrategyType = clientType === 'web'
      ? TokenResponseStrategyType.COOKIE
      : TokenResponseStrategyType.BODY;

    const tokenStrategy = this.tokenStrategyFactory.createStrategy(tokenStrategyType);

    const result = await authStrategy.login(dto);

    // Apply token strategy
    if (result.tokens) {
      // In real usage, you'd pass the response object here
      // tokenStrategy.sendTokens(result.tokens, res);
      console.log(`Tokens would be sent via: ${tokenStrategyType}`);
    }

    // Ensure result matches presenter expectations for demo
    return {
      user: result.user!,
      tokens: result.tokens,
    };
  }

  /**
   * Example: Configuration-driven strategy selection
   */
  async dynamicAuthFlow(flowType: string, dto: RegisterDto) {
    // Map string to strategy type
    const strategyMap = {
      'mvp': AuthStrategyType.SIMPLE,
      'production': AuthStrategyType.FULL,
    };

    const strategyType = strategyMap[flowType] || AuthStrategyType.FULL;
    const strategy = this.authStrategyFactory.createStrategy(strategyType);
    const result = await strategy.register(dto);

    // Ensure result matches presenter expectations for demo
    return {
      user: result.user!,
      tokens: result.tokens,
      otp: result.otp,
    };
  }
}

/**
 * DEMONSTRATION CONTROLLER
 *
 * Shows how strategies would be used in practice.
 * NOT part of the main API - just for demonstration.
 */
@ApiTags('Auth Strategies Demo')
@Controller('auth-demo')
export class AuthStrategiesDemoController {
  constructor(
    private readonly demoService: AuthStrategiesDemoService,
  ) {}

  @Post('register-simple')
  @ApiOperation({
    summary: 'Register with Simple Strategy',
    description: 'No email verification - for MVPs'
  })
  async registerSimple(@Body(ValidationPipe) dto: RegisterDto) {
    const result = await this.demoService.registerWithStrategy('simple', dto);
    return AuthResponsePresenter.register(result);
  }

  @Post('register-full')
  @ApiOperation({
    summary: 'Register with Full Strategy',
    description: 'Email verification + OTP - for production'
  })
  async registerFull(@Body(ValidationPipe) dto: RegisterDto) {
    const result = await this.demoService.registerWithStrategy('full', dto);
    return AuthResponsePresenter.register(result);
  }

  @Post('login-web')
  @ApiOperation({
    summary: 'Login for Web Client',
    description: 'Uses cookie-based token strategy'
  })
  async loginWeb(@Body(ValidationPipe) dto: LoginDto) {
    const result = await this.demoService.loginWithStrategy('web', dto);
    return AuthResponsePresenter.login(result);
  }

  @Post('login-mobile')
  @ApiOperation({
    summary: 'Login for Mobile Client',
    description: 'Uses body-based token strategy'
  })
  async loginMobile(@Body(ValidationPipe) dto: LoginDto) {
    const result = await this.demoService.loginWithStrategy('mobile', dto);
    return AuthResponsePresenter.login(result);
  }

  @Post('dynamic/:flowType')
  @ApiOperation({
    summary: 'Dynamic Auth Flow',
    description: 'Strategy chosen based on flowType parameter'
  })
  async dynamicFlow(
    @Body(ValidationPipe) dto: RegisterDto,
    @Param('flowType') flowType: string,
  ) {
    const result = await this.demoService.dynamicAuthFlow(flowType, dto);
    return AuthResponsePresenter.register(result);
  }
}
