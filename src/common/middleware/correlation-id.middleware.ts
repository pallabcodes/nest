import { Injectable, NestMiddleware, Inject, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { LoggerService } from '../logger/logger.service';

// Extend Express Request interface to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Correlation ID Middleware
 *
 * Adds a unique correlation ID to each incoming request for distributed tracing
 * and request tracking across services.
 *
 * Features:
 * - Generates unique UUID for each request
 * - Adds correlation ID to request headers for downstream services
 * - Includes correlation ID in response headers
 * - Supports custom correlation ID from client (for debugging)
 * - Integrates with LoggerService for structured logging
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(
    @Optional()
    @Inject(LoggerService)
    private readonly logger?: LoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Check if client provided a correlation ID, otherwise generate one
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();

    // Attach correlation ID to request object for use in controllers/services
    req.correlationId = correlationId;

    // Set correlation ID in logger context for structured logging
    if (this.logger) {
      this.logger.setCorrelationId(correlationId);
    }

    // Add correlation ID to response headers
    res.setHeader('x-correlation-id', correlationId);

    // Add correlation ID to request headers for downstream services
    req.headers['x-correlation-id'] = correlationId;

    // Log request start
    if (this.logger) {
      this.logger.debug(`Request started: ${req.method} ${req.url}`, {
        correlationId,
        method: req.method,
        url: req.url,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      });
    }

    next();
  }
}
