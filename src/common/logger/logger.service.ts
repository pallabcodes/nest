import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');
import * as fs from 'fs';
import * as path from 'path';

export interface LogContext {
  [key: string]: unknown;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;
  private readonly logDirectory: string;
  private readonly enableScheduledDeletion: boolean;
  private readonly deletionSchedule: string;
  private deletionInterval: NodeJS.Timeout | null = null;

  constructor(private configService: ConfigService) {
    const loggerConfig = this.configService.get('logger');
    this.logDirectory = loggerConfig?.logDirectory || 'logs';
    this.enableScheduledDeletion = loggerConfig?.enableScheduledDeletion || false;
    this.deletionSchedule = loggerConfig?.deletionSchedule || '1w';

    // Ensure log directory exists
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }

    this.logger = this.createWinstonLogger(loggerConfig);
    this.setupScheduledDeletion();
  }

  private createWinstonLogger(config: any): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (config?.enableConsoleLogging !== false) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            }),
          ),
        }),
      );
    }

    // File transports (only if enabled)
    if (config?.enableFileLogging !== false) {
      // Error log file
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.logDirectory, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: config?.maxSize || '20m',
          maxFiles: config?.maxFiles || '14d',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
      );

      // Combined log file (all levels)
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.logDirectory, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: config?.maxSize || '20m',
          maxFiles: config?.maxFiles || '14d',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
      );
    }

    return winston.createLogger({
      level: config?.level || 'info',
      transports,
      exceptionHandlers: [
        new DailyRotateFile({
          filename: path.join(this.logDirectory, 'exceptions-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: config?.maxSize || '20m',
          maxFiles: config?.maxFiles || '14d',
        }),
      ],
      rejectionHandlers: [
        new DailyRotateFile({
          filename: path.join(this.logDirectory, 'rejections-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: config?.maxSize || '20m',
          maxFiles: config?.maxFiles || '14d',
        }),
      ],
    });
  }

  private setupScheduledDeletion(): void {
    if (!this.enableScheduledDeletion) {
      return;
    }

    const scheduleMs = this.parseDeletionSchedule(this.deletionSchedule);
    if (!scheduleMs) {
      this.logger.warn(
        `Invalid deletion schedule: ${this.deletionSchedule}. Skipping scheduled deletion.`,
      );
      return;
    }

    // Run deletion immediately, then on schedule
    this.deleteOldLogs();
    this.deletionInterval = setInterval(() => {
      this.deleteOldLogs();
    }, scheduleMs);

    this.logger.info(`Scheduled log deletion enabled: ${this.deletionSchedule}`);
  }

  private parseDeletionSchedule(schedule: string): number | null {
    const match = schedule.match(/^(\d+)([dwmy])$/);
    if (!match) {
      return null;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      d: 24 * 60 * 60 * 1000, // days
      w: 7 * 24 * 60 * 60 * 1000, // weeks
      m: 30 * 24 * 60 * 60 * 1000, // months (approximate)
      y: 365 * 24 * 60 * 60 * 1000, // years
    };

    return value * (multipliers[unit] || 0);
  }

  private deleteOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDirectory);
      const now = Date.now();
      const scheduleMs = this.parseDeletionSchedule(this.deletionSchedule);

      if (!scheduleMs) {
        return;
      }

      files.forEach((file) => {
        const filePath = path.join(this.logDirectory, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > scheduleMs) {
          fs.unlinkSync(filePath);
          this.logger.debug(`Deleted old log file: ${file}`);
        }
      });
    } catch (error) {
      this.logger.error('Error deleting old logs:', error);
    }
  }

  /**
   * Properly handles Error objects, extracting both message and stack
   */
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

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, errorOrTrace?: string | Error, context?: string): void {
    if (errorOrTrace instanceof Error) {
      const formatted = this.formatError(errorOrTrace, context ? { context } : undefined);
      this.logger.error(formatted.message, {
        stack: formatted.stack,
        ...formatted.context,
      });
    } else if (errorOrTrace) {
      this.logger.error(message, {
        trace: errorOrTrace,
        ...(context && { context }),
      });
    } else {
      this.logger.error(message, context ? { context } : undefined);
    }
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context ? { context } : undefined);
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, context ? { context } : undefined);
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, context ? { context } : undefined);
  }

  /**
   * Enhanced error logging with full error details
   */
  logError(error: Error | unknown, message?: string, context?: LogContext): void {
    const formatted = this.formatError(error, context);
    this.logger.error(message || formatted.message, {
      stack: formatted.stack,
      ...formatted.context,
    });
  }

  /**
   * Log with custom context
   */
  logWithContext(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    context: LogContext,
  ): void {
    this.logger[level](message, context);
  }

  onModuleDestroy(): void {
    if (this.deletionInterval) {
      clearInterval(this.deletionInterval);
    }
  }
}
