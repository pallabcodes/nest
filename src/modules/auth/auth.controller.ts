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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  RegisterDocs,
  LoginDocs,
  VerifyEmailDocs,
  ResendOtpDocs,
  ForgotPasswordDocs,
  ResetPasswordDocs,
  RefreshTokenDocs,
  GetProfileDocs,
  LogoutDocs,
} from './auth.openapi';
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
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { AuthResponsePresenter } from './presenters/auth-response.presenter';
import type { AuthenticatedUser, OAuthUser } from '@shared-types/auth';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @RegisterDocs()
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(ValidationPipe) registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const responseData = await this.authService.registerWithCookies(registerDto, res);
    return AuthResponsePresenter.register(responseData);
  }

  @LoginDocs()
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const responseData = await this.authService.loginWithCookies(loginDto, res);
    return AuthResponsePresenter.login(responseData);
  }

  @VerifyEmailDocs()
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body(ValidationPipe) verifyOtpDto: VerifyOtpDto) {
    await this.authService.verifyEmail(verifyOtpDto);
    return AuthResponsePresenter.success('Email verified successfully');
  }

  @ResendOtpDocs()
  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body(ValidationPipe) resendOtpDto: ResendOtpDto) {
    await this.authService.resendOtp(resendOtpDto);
    return AuthResponsePresenter.success('OTP sent successfully');
  }

  @ForgotPasswordDocs()
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
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

  @ResetPasswordDocs()
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body(ValidationPipe) resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return AuthResponsePresenter.success('Password reset successfully');
  }

  @RefreshTokenDocs()
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const result = await this.authService.refreshTokenFromRequest(req, res);
    return AuthResponsePresenter.refresh(result);
  }

  @GetProfileDocs()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.authService.getCurrentUser(user.id, user);
    return AuthResponsePresenter.profile(result);
  }

  @LogoutDocs()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear auth cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return AuthResponsePresenter.success('Logout successful');
  }
}
