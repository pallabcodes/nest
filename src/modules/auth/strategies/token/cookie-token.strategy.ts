import {
  TokenResponseStrategy,
  TokenPair,
  CookieTokenOptions,
} from './token-response.strategy.interface';

/**
 * Cookie Token Strategy
 *
 * Stores authentication tokens in http-only cookies for enhanced security.
 * Perfect for traditional web applications and SSR frameworks.
 */
export class CookieTokenStrategy implements TokenResponseStrategy {
  constructor(private readonly options: CookieTokenOptions) {}

  sendTokens(tokens: TokenPair, res: any): void {
    // Set access token cookie
    res.cookie(
      this.options.accessToken.name,
      tokens.accessToken,
      {
        httpOnly: this.options.accessToken.httpOnly,
        secure: this.options.accessToken.secure,
        sameSite: this.options.accessToken.sameSite,
        maxAge: this.options.accessToken.maxAge,
      }
    );

    // Set refresh token cookie
    res.cookie(
      this.options.refreshToken.name,
      tokens.refreshToken,
      {
        httpOnly: this.options.refreshToken.httpOnly,
        secure: this.options.refreshToken.secure,
        sameSite: this.options.refreshToken.sameSite,
        maxAge: this.options.refreshToken.maxAge,
      }
    );
  }

  clearTokens(res: any): void {
    // Clear access token cookie
    res.clearCookie(this.options.accessToken.name);

    // Clear refresh token cookie
    res.clearCookie(this.options.refreshToken.name);
  }

  hasTokens(req: any): boolean {
    const hasAccessToken = !!req.cookies?.[this.options.accessToken.name];
    const hasRefreshToken = !!req.cookies?.[this.options.refreshToken.name];
    return hasAccessToken && hasRefreshToken;
  }

  extractTokens(req: any): TokenPair | null {
    const accessToken = req.cookies?.[this.options.accessToken.name];
    const refreshToken = req.cookies?.[this.options.refreshToken.name];

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get default secure cookie options
   */
  static getDefaultOptions(): CookieTokenOptions {
    return {
      accessToken: {
        name: 'accessToken',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      },
      refreshToken: {
        name: 'refreshToken',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    };
  }
}
