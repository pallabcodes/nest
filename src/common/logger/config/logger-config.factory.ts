import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

export interface LoggerConfig {
  level?: string;
  enableConsoleLogging?: boolean;
  enableFileLogging?: boolean;
  logDirectory?: string;
  maxSize?: string;
  maxFiles?: string;
}

/**
 * Logger Configuration Factory
 *
 * Creates Winston logger configuration with transports.
 * Separated from LoggerService for better single responsibility.
 */
export class LoggerConfigFactory {
  static createLogger(config: LoggerConfig, logDirectory: string): winston.Logger {
    const transports: winston.transport[] = [];

    if (config?.enableConsoleLogging !== false) {
      transports.push(this.createConsoleTransport());
    }

    if (config?.enableFileLogging !== false) {
      transports.push(this.createErrorFileTransport(config, logDirectory));
      transports.push(this.createCombinedFileTransport(config, logDirectory));
    }

    return winston.createLogger({
      level: config?.level || 'info',
      transports,
      exceptionHandlers: [this.createExceptionFileTransport(config, logDirectory)],
      rejectionHandlers: [this.createRejectionFileTransport(config, logDirectory)],
    });
  }

  private static createConsoleTransport(): winston.transport {
    return new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        }),
      ),
    });
  }

  private static createErrorFileTransport(
    config: LoggerConfig,
    logDirectory: string,
  ): winston.transport {
    return new DailyRotateFile({
      filename: path.join(logDirectory, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: config?.maxSize || '20m',
      maxFiles: config?.maxFiles || '14d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    });
  }

  private static createCombinedFileTransport(
    config: LoggerConfig,
    logDirectory: string,
  ): winston.transport {
    return new DailyRotateFile({
      filename: path.join(logDirectory, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config?.maxSize || '20m',
      maxFiles: config?.maxFiles || '14d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    });
  }

  private static createExceptionFileTransport(
    config: LoggerConfig,
    logDirectory: string,
  ): winston.transport {
    return new DailyRotateFile({
      filename: path.join(logDirectory, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config?.maxSize || '20m',
      maxFiles: config?.maxFiles || '14d',
    });
  }

  private static createRejectionFileTransport(
    config: LoggerConfig,
    logDirectory: string,
  ): winston.transport {
    return new DailyRotateFile({
      filename: path.join(logDirectory, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config?.maxSize || '20m',
      maxFiles: config?.maxFiles || '14d',
    });
  }
}
