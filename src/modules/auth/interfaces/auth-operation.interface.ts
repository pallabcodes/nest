/**
 * Auth Operation Interface
 *
 * Defines the contract for auth operations.
 * Each operation encapsulates a complete auth flow.
 */
export interface AuthOperation<TInput, TResult> {
  /**
   * Execute the auth operation
   */
  execute(input: TInput): Promise<TResult>;
}

/**
 * Auth Operation Result Types
 */
export interface RegisterResult {
  user: any;
  tokens: any;
  otp: any;
}

export interface LoginResult {
  user: any;
  tokens: any;
}

export interface VerifyEmailResult {
  message: string;
  user: any;
}

export interface OtpResult {
  message: string;
  otp: any;
}

export interface PasswordResetResult {
  message: string;
}

export interface RefreshTokenResult {
  tokens: any;
}

export interface CurrentUserResult {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}
