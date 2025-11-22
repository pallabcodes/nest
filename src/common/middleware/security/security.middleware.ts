import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../logger/logger.service';

/**
 * Security Middleware
 *
 * Provides comprehensive security features:
 * - Security headers via Helmet
 * - Rate limiting for API protection
 * - Request sanitization
 * - Security logging
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly rateLimitEnabled: boolean;
  private readonly helmetEnabled: boolean;
  private readonly cspEnabled: boolean;
  private readonly hstsEnabled: boolean;
  private readonly hstsMaxAge: number;

  constructor(
    private configService: ConfigService,
    @Optional()
    @Inject(LoggerService)
    private readonly logger?: LoggerService,
  ) {
    const securityConfig = this.configService.get('security');
    this.windowMs = securityConfig?.rateLimit?.windowMs || 15 * 60 * 1000;
    this.maxRequests = securityConfig?.rateLimit?.maxRequests || 100;
    this.rateLimitEnabled = securityConfig?.rateLimit?.enabled !== false;
    this.helmetEnabled = securityConfig?.helmet?.enabled !== false;
    this.cspEnabled = securityConfig?.helmet?.contentSecurityPolicy !== false;
    this.hstsEnabled = securityConfig?.helmet?.hsts?.enabled !== false;
    this.hstsMaxAge = securityConfig?.helmet?.hsts?.maxAge || 31536000;
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Apply Helmet security headers if enabled
    if (this.helmetEnabled) {
      this.applySecurityHeaders(req, res);
    }

    // Apply rate limiting if enabled
    if (this.rateLimitEnabled && !this.checkRateLimit(req)) {
      this.logger?.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('user-agent'),
        correlationId: req.correlationId,
      });

      throw new HttpException(
        {
          success: false,
          message: 'Too many requests',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          details: {
            retryAfter: Math.ceil(this.windowMs / 1000),
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Sanitize input
    this.sanitizeInput(req);

    next();
  }

  private applySecurityHeaders(req: Request, res: Response): void {
    const helmetOptions: any = {
      crossOriginEmbedderPolicy: false, // Allow embedding for API responses
    };

    // Add CSP if enabled
    if (this.cspEnabled) {
      helmetOptions.contentSecurityPolicy = {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      };
    }

    // Add HSTS if enabled
    if (this.hstsEnabled) {
      helmetOptions.hsts = {
        maxAge: this.hstsMaxAge,
        includeSubDomains: true,
        preload: true,
      };
    }

    // Apply Helmet security headers
    helmet(helmetOptions)(req, res, () => {});

    // Additional custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Remove server header for security
    res.removeHeader('X-Powered-By');
  }

  private checkRateLimit(req: Request): boolean {
    const key = this.getRateLimitKey(req);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const current = this.rateLimitStore.get(key);

    if (!current || current.resetTime < windowStart) {
      // First request or window expired
      this.rateLimitStore.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (current.count >= this.maxRequests) {
      return false;
    }

    // Increment counter
    current.count++;
    return true;
  }

  private getRateLimitKey(req: Request): string {
    // Use IP address for rate limiting
    // In production, you might want to use user ID for authenticated requests
    const user = req.user as any;
    const identifier = user?.id || req.ip || 'unknown';
    return `rate_limit:${identifier}`;
  }

  private sanitizeInput(req: Request): void {
    // Basic input sanitization
    if (req.body && typeof req.body === 'object') {
      this.sanitizeObject(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      this.sanitizeObject(req.query);
    }
  }

  private sanitizeObject(obj: any): void {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS vectors
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.sanitizeObject(obj[key]);
      }
    }
  }

  /**
   * Clean up expired rate limit entries
   * Call this periodically to prevent memory leaks
   */
  cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (value.resetTime < now) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Get current rate limit status for monitoring
   */
  getRateLimitStats(): { totalKeys: number; memoryUsage: string } {
    return {
      totalKeys: this.rateLimitStore.size,
      memoryUsage: `${Math.round(JSON.stringify([...this.rateLimitStore]).length / 1024)}KB`,
    };
  }
}
