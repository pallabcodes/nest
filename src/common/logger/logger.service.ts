import { Injectable, LoggerService as NestLoggerService, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as fs from 'fs';
import { LoggerConfigFactory } from './config/logger-config.factory';
import { LogCleanupService } from './services/log-cleanup.service';

export interface LogContext {
  correlationId?: string;
  userId?: string | number;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

// Global context for correlation ID (set by middleware)
globalThis.requestContext = globalThis.requestContext || {};

/**
 * Logger Service
 *
 * Main logging service that delegates configuration and cleanup to specialized services.
 */
@Injectable()
export class LoggerService implements NestLoggerService, OnModuleDestroy {
  private readonly logger: winston.Logger;
  private readonly logDirectory: string;
  private readonly enableScheduledDeletion: boolean;
  private readonly deletionSchedule: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logCleanupService: LogCleanupService,
  ) {
    const loggerConfig = this.configService.get('logger');
    this.logDirectory = loggerConfig?.logDirectory || 'logs';
    this.enableScheduledDeletion = loggerConfig?.enableScheduledDeletion || false;
    this.deletionSchedule = loggerConfig?.deletionSchedule || '1w';

    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }

    this.logger = LoggerConfigFactory.createLogger(loggerConfig, this.logDirectory);

    if (this.enableScheduledDeletion) {
      this.logCleanupService.setupScheduledDeletion(
        this.logDirectory,
        this.deletionSchedule,
        this.logger,
      );
    }
  }

  private getCorrelationId(): string | undefined {
    if (globalThis.requestContext?.correlationId) {
      return globalThis.requestContext.correlationId;
    }
    return undefined;
  }

  private enhanceContext(context?: LogContext): LogContext {
    const enhanced: LogContext = { ...context };
    const correlationId = this.getCorrelationId();

    if (correlationId && !enhanced.correlationId) {
      enhanced.correlationId = correlationId;
    }

    return enhanced;
  }

  private formatError(
    error: unknown,
    context?: LogContext,
  ): { message: string; stack?: string; context?: LogContext } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        ...(context && { context }),
      };
    }

    if (typeof error === 'string') {
      return {
        message: error,
        ...(context && { context }),
      };
    }

    return {
      message: String(error),
      ...(context && { context }),
    };
  }

  log(message: string, context?: string | LogContext): void {
    const enhancedContext = this.enhanceContext(
      typeof context === 'string' ? { context } : context,
    );
    this.logger.info(message, enhancedContext);
  }

  error(message: string, errorOrTrace?: string | Error, context?: string | LogContext): void {
    const enhancedContext = this.enhanceContext(
      typeof context === 'string' ? { context } : context,
    );

    if (errorOrTrace instanceof Error) {
      const formatted = this.formatError(errorOrTrace, enhancedContext);
      this.logger.error(formatted.message, {
        stack: formatted.stack,
        ...formatted.context,
      });
    } else if (errorOrTrace) {
      this.logger.error(message, {
        trace: errorOrTrace,
        ...enhancedContext,
      });
    } else {
      this.logger.error(message, enhancedContext);
    }
  }

  warn(message: string, context?: string | LogContext): void {
    const enhancedContext = this.enhanceContext(
      typeof context === 'string' ? { context } : context,
    );
    this.logger.warn(message, enhancedContext);
  }

  debug(message: string, context?: string | LogContext): void {
    const enhancedContext = this.enhanceContext(
      typeof context === 'string' ? { context } : context,
    );
    this.logger.debug(message, enhancedContext);
  }

  verbose(message: string, context?: string | LogContext): void {
    const enhancedContext = this.enhanceContext(
      typeof context === 'string' ? { context } : context,
    );
    this.logger.verbose(message, enhancedContext);
  }

  logError(error: Error | unknown, message?: string, context?: LogContext): void {
    const formatted = this.formatError(error, context);
    this.logger.error(message || formatted.message, {
      stack: formatted.stack,
      ...formatted.context,
    });
  }

  logWithContext(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    context: LogContext,
  ): void {
    const enhancedContext = this.enhanceContext(context);
    this.logger[level](message, enhancedContext);
  }

  setCorrelationId(correlationId: string): void {
    globalThis.requestContext.correlationId = correlationId;
  }

  getCurrentCorrelationId(): string | undefined {
    return this.getCorrelationId();
  }

  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: string | number,
  ): void {
    const level = statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${url} - ${statusCode} (${duration}ms)`;

    this.logWithContext(level, message, {
      method,
      url,
      statusCode,
      duration,
      userId,
    });
  }

  onModuleDestroy(): void {
    this.logCleanupService.onModuleDestroy();
  }
}
