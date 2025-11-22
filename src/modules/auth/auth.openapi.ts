import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegisterResponseDto } from './dto/register-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SuccessResponseDto } from './dto/success-response.dto';
import { ForgotPasswordResponseDto } from './dto/forgot-password-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

/**
 * OpenAPI documentation decorators for Auth endpoints
 * This keeps the controller clean while providing comprehensive API documentation
 */

export const RegisterDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register a new user',
      description: 'Create a new user account with email verification'
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'User registered successfully',
      type: RegisterResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Validation failed or user already exists',
      type: SuccessResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Internal server error',
      type: SuccessResponseDto,
    }),
  );

export const LoginDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Login user',
      description: 'Authenticate user and return JWT tokens'
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Login successful',
      type: LoginResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Invalid credentials',
      type: SuccessResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Validation failed',
      type: SuccessResponseDto,
    }),
  );

export const VerifyEmailDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Verify email with OTP',
      description: 'Verify user email using one-time password sent to email'
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Email verified successfully',
      type: SuccessResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid or expired OTP',
      type: SuccessResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
      type: SuccessResponseDto,
    }),
  );

export const ResendOtpDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Resend OTP',
      description: 'Resend verification OTP to user email'
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'OTP sent successfully',
      type: SuccessResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid email or user not found',
      type: SuccessResponseDto,
    }),
  );

export const ForgotPasswordDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Request password reset OTP',
      description: 'Send password reset OTP to user email if account exists'
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Password reset OTP sent if email exists',
      type: ForgotPasswordResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid email format',
      type: SuccessResponseDto,
    }),
  );

export const ResetPasswordDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Reset password with OTP',
      description: 'Reset user password using OTP and new password'
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Password reset successfully',
      type: SuccessResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid or expired OTP, or weak password',
      type: SuccessResponseDto,
    }),
  );

export const RefreshTokenDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Refresh access token',
      description: 'Refresh JWT access token using refresh token from cookies'
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Tokens refreshed successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Tokens refreshed successfully' },
          data: {
            type: 'object',
            properties: {
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                  refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Invalid or expired refresh token',
      type: SuccessResponseDto,
    }),
  );

export const GetProfileDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get current authenticated user',
      description: 'Retrieve profile information for the currently authenticated user'
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Current user information',
      type: ProfileResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'User not authenticated',
      type: SuccessResponseDto,
    }),
  );

export const LogoutDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Logout user',
      description: 'Clear authentication cookies and logout user'
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Logout successful',
      type: SuccessResponseDto,
    }),
  );