import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from './auth.repository';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { PasswordUtil } from './utils/password.util';
import { TokenUtil } from './utils/token.util';
import { OtpUtil } from './utils/otp.util';
import { UserUtil } from './utils/user.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { OtpType } from '../../database/models/otp.model';
import { AUTH_CONSTANTS } from './auth.constants';
import {
  UserAlreadyExistsException,
  InvalidCredentialsException,
  UserNotFoundException,
  EmailAlreadyVerifiedException,
  InvalidOtpException,
  RefreshTokenNotFoundException,
} from './exceptions/auth.exceptions';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
    private readonly passwordUtil: PasswordUtil,
    private readonly tokenUtil: TokenUtil,
    private readonly otpUtil: OtpUtil,
    private readonly userUtil: UserUtil,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.authRepository.findUserByEmail(registerDto.email);
    if (existingUser) {
      throw new UserAlreadyExistsException(registerDto.email);
    }

    // Hash password
    const hashedPassword = await this.passwordUtil.hash(registerDto.password);

    // Generate OTP for email verification
    const otpCode = this.otpService.generateOtpCode();
    const expiration = this.otpService.getOtpExpiration();
    const expiresAt = new Date(Date.now() + expiration);

    // Create user with OTP
    const { user, otp } = await this.authRepository.createUserWithOtp(
      {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
        phone: registerDto.phone,
        isEmailVerified: false,
      },
      {
        code: otpCode,
        type: OtpType.VERIFY,
        expiresAt,
      },
    );

    // Generate tokens
    const userWithRoles = await this.authRepository.findUserByIdWithRoles(user.id);
    const roleNames = userWithRoles?.roles?.map((r) => r.name) || [AUTH_CONSTANTS.DEFAULTS.USER_ROLE];
    const tokens = await this.tokenService.generateTokens(user.id, user.email, roleNames);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
      otp: {
        code: otp.code,
        expiresAt: otp.expiresAt,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.authRepository.findUserByEmail(loginDto.email);
    if (!user || !user.password) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await this.passwordUtil.verify(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    const userWithRoles = await this.authRepository.findUserByIdWithRoles(user.id);
    const roleNames = userWithRoles?.roles?.map((r) => r.name) || [AUTH_CONSTANTS.DEFAULTS.USER_ROLE];
    const tokens = await this.tokenService.generateTokens(user.id, user.email, roleNames);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
    };
  }

  async verifyEmail(verifyOtpDto: VerifyOtpDto) {
    const user = await this.authRepository.findUserByEmail(verifyOtpDto.email);
    if (!user) {
      throw new UserNotFoundException(verifyOtpDto.email);
    }

    if (user.isEmailVerified) {
      throw new EmailAlreadyVerifiedException();
    }

    const otp = await this.authRepository.findValidOtp(
      user.id,
      verifyOtpDto.code,
      OtpType.VERIFY,
    );

    if (!otp) {
      throw new InvalidOtpException();
    }

    await this.authRepository.verifyEmailWithTransaction(user.id);

    return {
      message: AUTH_CONSTANTS.ERRORS.EMAIL_VERIFIED,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: true,
      },
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto) {
    const user = await this.authRepository.findUserByEmail(resendOtpDto.email);
    if (!user) {
      throw new UserNotFoundException(resendOtpDto.email);
    }

    await this.authRepository.invalidateUserOtps(user.id, resendOtpDto.type);
    const otp = await this.otpService.generateOtp(user.id, resendOtpDto.type);

    return {
      message: AUTH_CONSTANTS.ERRORS.OTP_SENT,
      otp: {
        code: otp.code,
        expiresAt: otp.expiresAt,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.authRepository.findUserByEmail(forgotPasswordDto.email);
    if (!user) {
      return {
        message: AUTH_CONSTANTS.ERRORS.EMAIL_NOT_EXISTS,
      };
    }

    await this.authRepository.invalidateUserOtps(user.id, OtpType.RESET);
    const otp = await this.otpService.generateOtp(user.id, OtpType.RESET);

    return {
      message: AUTH_CONSTANTS.ERRORS.EMAIL_NOT_EXISTS,
      otp: {
        code: otp.code,
        expiresAt: otp.expiresAt,
      },
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.authRepository.findUserByEmail(resetPasswordDto.email);
    if (!user) {
      throw new UserNotFoundException(resetPasswordDto.email);
    }

    const otp = await this.authRepository.findValidOtp(
      user.id,
      resetPasswordDto.code,
      OtpType.RESET,
    );

    if (!otp) {
      throw new InvalidOtpException();
    }

    const hashedPassword = await this.passwordUtil.hash(resetPasswordDto.newPassword);

    await this.authRepository.resetPasswordWithTransaction(user.id, hashedPassword);

    return {
      message: AUTH_CONSTANTS.ERRORS.PASSWORD_RESET_SUCCESS,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const payload = this.tokenService.verifyRefreshToken(refreshTokenDto.refreshToken);

    const user = await this.authRepository.findUserByIdWithRoles(payload.sub);
    if (!user) {
      throw new UserNotFoundException(payload.sub.toString());
    }

    const roleNames = user.roles?.map((r) => r.name) || [AUTH_CONSTANTS.DEFAULTS.USER_ROLE];
    const tokens = await this.tokenService.generateTokens(user.id, user.email, roleNames);

    return {
      tokens,
    };
  }

  async getCurrentUser(userId: number, jwtUser?: any) {
    const dbUser = await this.authRepository.findUserById(userId);
    if (!dbUser) {
      throw new UserNotFoundException(userId.toString());
    }

    let roles: string[] = jwtUser?.roles || [];
    if (roles.length === 0) {
      const userWithRoles = await this.authRepository.findUserByIdWithRoles(userId);
      roles = userWithRoles?.roles?.map((r) => r.name) || [];
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone || null,
      isEmailVerified: dbUser.isEmailVerified || false,
      isActive: dbUser.isActive !== undefined ? dbUser.isActive : true,
      roles: roles,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
  }

  /**
   * Cookie-based registration
   */
  async registerWithCookies(registerDto: RegisterDto, res: Response) {
    const result = await this.register(registerDto);

    if (result.tokens) {
      this._setAuthCookies(res, result.tokens);
    }

    // Return data without tokens (they're in cookies)
    const { tokens, ...responseData } = result;
    return responseData;
  }

  /**
   * Cookie-based login
   */
  async loginWithCookies(loginDto: LoginDto, res: Response) {
    const result = await this.login(loginDto);

    if (result.tokens) {
      this._setAuthCookies(res, result.tokens);
    }

    // Return data without tokens
    const { tokens, ...responseData } = result;
    return responseData;
  }

  /**
   * Refresh token from cookies
   */
  async refreshTokenFromRequest(req: any, res: any) {
    const refreshToken = req.cookies?.['refreshToken'];
    if (!refreshToken) {
      throw new RefreshTokenNotFoundException();
    }

    const result = await this.refreshToken({ refreshToken });

    if (result.tokens) {
      this._setAuthCookies(res, result.tokens);
    }

    return result;
  }

  // ============ PRIVATE HELPER METHODS ============

  private _setAuthCookies(res: any, tokens: any): void {
    const accessConfig = AUTH_CONSTANTS.COOKIES.ACCESS_TOKEN;
    const refreshConfig = AUTH_CONSTANTS.COOKIES.REFRESH_TOKEN;

    res.cookie(accessConfig.NAME, tokens.accessToken, {
      httpOnly: accessConfig.HTTP_ONLY,
      secure: accessConfig.SECURE,
      sameSite: accessConfig.SAME_SITE,
      maxAge: accessConfig.MAX_AGE,
    });

    res.cookie(refreshConfig.NAME, tokens.refreshToken, {
      httpOnly: refreshConfig.HTTP_ONLY,
      secure: refreshConfig.SECURE,
      sameSite: refreshConfig.SAME_SITE,
      maxAge: refreshConfig.MAX_AGE,
    });
  }
}
