import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
// import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
// import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { AuthResponsePresenter } from './presenters/auth-response.presenter';
import type { AuthenticatedUser, OAuthUser } from '@shared-types/auth';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account with email verification'
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: 1,
            email: "user@example.com",
            name: "John Doe",
            isEmailVerified: false
          },
          tokens: {
            accessToken: "eyJhbGciOiJIUzI1NiIs...",
            refreshToken: "eyJhbGciOiJIUzI1NiIs..."
          }
        }
      }
    }
  })
  async register(@Body(ValidationPipe) registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const responseData = await this.authService.registerWithCookies(registerDto, res);
    return AuthResponsePresenter.register(responseData);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticate user and return JWT tokens'
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: 1,
            email: "user@example.com",
            name: "John Doe",
            isEmailVerified: true
          },
          tokens: {
            accessToken: "eyJhbGciOiJIUzI1NiIs...",
            refreshToken: "eyJhbGciOiJIUzI1NiIs..."
          }
        }
      }
    }
  })
  async login(@Body(ValidationPipe) loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const responseData = await this.authService.loginWithCookies(loginDto, res);
    return AuthResponsePresenter.login(responseData);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Body(ValidationPipe) verifyOtpDto: VerifyOtpDto) {
    await this.authService.verifyEmail(verifyOtpDto);
    return AuthResponsePresenter.success('Email verified successfully');
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async resendOtp(@Body(ValidationPipe) resendOtpDto: ResendOtpDto) {
    await this.authService.resendOtp(resendOtpDto);
    return AuthResponsePresenter.success('OTP sent successfully');
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'Password reset OTP sent if email exists' })
  async forgotPassword(@Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    // Include OTP in response for development/testing (in production, this would be sent via email)
    if (result?.otp?.code) {
      return AuthResponsePresenter.success(
        result.message || 'Password reset OTP sent if email exists',
        {
          otp: {
            code: result.otp.code,
            expiresAt: result.otp.expiresAt,
          },
        },
      );
    }
      return AuthResponsePresenter.success(
      result?.message || 'Password reset OTP sent if email exists',
    );
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Body(ValidationPipe) resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return AuthResponsePresenter.success('Password reset successfully');
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  async refreshToken(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const result = await this.authService.refreshTokenFromRequest(req, res);
    return AuthResponsePresenter.refresh(result);
  }

  // @UseGuards(JwtAuthGuard) // TODO: Add when guard is implemented
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user information' })
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.authService.getCurrentUser(user.id, user);
    return AuthResponsePresenter.profile(result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear auth cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return AuthResponsePresenter.success('Logout successful');
  }

}
