import { Response } from 'express';
import { TokenResponseStrategy, TokenPair } from './token-response.strategy.interface';

/**
 * Body Token Strategy
 *
 * Returns authentication tokens in the HTTP response body.
 * This is the default strategy and works for most SPAs and mobile apps.
 */
export class BodyTokenStrategy implements TokenResponseStrategy {
  sendTokens(tokens: TokenPair, res: Response): void {
    // Tokens are returned in response body by controller
    // This strategy doesn't modify the response directly
  }

  clearTokens(res: Response): void {
    // No action needed - tokens are in response body
  }

  hasTokens(req: any): boolean {
    // Check for tokens in Authorization header (Bearer)
    const authHeader = req.headers.authorization;
    return !!(authHeader && authHeader.startsWith('Bearer '));
  }

  extractTokens(req: any): TokenPair | null {
    // Extract from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Note: This strategy assumes single token in header
    // For access tokens, refresh tokens are usually in separate header or body
    // This is a simplified implementation - adjust based on your needs
    return {
      accessToken: token,
      refreshToken: '', // Would need separate header or body field
    };
  }
}
