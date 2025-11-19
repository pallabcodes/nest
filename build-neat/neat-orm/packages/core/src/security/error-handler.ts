/**
 * NeatOrm - Secure Error Handler
 *
 * Enterprise-grade error handling that prevents information leakage
 * and provides secure error responses for production environments.
 *
 * Security Features:
 * - Sanitizes error messages to prevent information disclosure
 * - Masks sensitive data (passwords, tokens, connection strings)
 * - Provides safe error responses for production
 * - Logs detailed errors securely without exposing to clients
 * - Prevents stack trace leakage
 */

/**
 * Error severity levels.
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Secure error information.
 */
export interface SecureError {
  message: string;
  code: string;
  severity: ErrorSeverity;
  timestamp: Date;
  details?: Record<string, unknown>;
}

/**
 * Error handler configuration.
 */
export interface ErrorHandlerConfig {
  /**
   * Whether we're in production mode.
   * In production, detailed errors are hidden from clients.
   */
  isProduction: boolean;

  /**
   * Whether to log full error details.
   * Default: true
   */
  logDetails: boolean;

  /**
   * Patterns to mask in error messages (e.g., passwords, tokens).
   */
  sensitivePatterns: RegExp[];

  /**
   * Custom error sanitizer function.
   */
  customSanitizer?: (error: Error) => SecureError;
}

/**
 * Secure Error Handler for enterprise security.
 */
export class SecureErrorHandler {
  private static readonly DEFAULT_SENSITIVE_PATTERNS = [
    /password['":\s]*=?\s*['"]?[^'"]+['"]?/gi,
    /token['":\s]*=?\s*['"]?[^'"]+['"]?/gi,
    /secret['":\s]*=?\s*['"]?[^'"]+['"]?/gi,
    /api[_-]?key['":\s]*=?\s*['"]?[^'"]+['"]?/gi,
    /connection[_-]?string['":\s]*=?\s*['"]?[^'"]+['"]?/gi,
    /postgres:\/\/[^@]+@/gi,
    /mysql:\/\/[^@]+@/gi,
    /mongodb:\/\/[^@]+@/gi,
  ];

  /**
   * Sanitize an error for safe client response.
   *
   * @param error - Error to sanitize
   * @param config - Error handler configuration
   * @returns Sanitized error information
   */
  static sanitizeError(
    error: Error | unknown,
    config: ErrorHandlerConfig
  ): SecureError {
    const baseError: SecureError = {
      message: 'An error occurred while processing your request',
      code: 'INTERNAL_ERROR',
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    };

    if (!(error instanceof Error)) {
      return baseError;
    }

    // Mask sensitive information
    let sanitizedMessage = this.maskSensitiveData(
      error.message,
      config.sensitivePatterns
    );

    // In production, don't expose detailed error messages
    if (config.isProduction) {
      // Map common database errors to safe messages
      sanitizedMessage = this.mapToSafeMessage(error);
    } else {
      // In development, show more details but still mask sensitive data
      sanitizedMessage = this.maskSensitiveData(
        error.message,
        config.sensitivePatterns
      );
    }

    // Determine error code and severity
    const { code, severity } = this.classifyError(error);

    return {
      ...baseError,
      message: sanitizedMessage,
      code,
      severity,
      details: config.isProduction ? undefined : this.extractSafeDetails(error),
    };
  }

  /**
   * Mask sensitive data in error messages.
   */
  private static maskSensitiveData(
    message: string,
    patterns: RegExp[]
  ): string {
    let sanitized = message;
    const allPatterns = [...this.DEFAULT_SENSITIVE_PATTERNS, ...patterns];

    for (const pattern of allPatterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        // Mask the sensitive part
        if (match.includes('=')) {
          const [key, value] = match.split('=');
          return `${key}=***MASKED***`;
        }
        return '***MASKED***';
      });
    }

    return sanitized;
  }

  /**
   * Map database errors to safe, generic messages.
   */
  private static mapToSafeMessage(error: Error): string {
    const message = error.message.toLowerCase();

    // Database connection errors
    if (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('refused')
    ) {
      return 'Database connection error. Please try again later.';
    }

    // Authentication errors
    if (
      message.includes('authentication') ||
      message.includes('password') ||
      message.includes('credential')
    ) {
      return 'Authentication failed. Please check your credentials.';
    }

    // Permission errors
    if (
      message.includes('permission') ||
      message.includes('access denied') ||
      message.includes('unauthorized')
    ) {
      return 'You do not have permission to perform this operation.';
    }

    // Constraint violations
    if (
      message.includes('constraint') ||
      message.includes('unique') ||
      message.includes('duplicate')
    ) {
      return 'The operation violates a data constraint.';
    }

    // Foreign key violations
    if (message.includes('foreign key') || message.includes('reference')) {
      return 'The operation violates referential integrity.';
    }

    // Generic fallback
    return 'An error occurred while processing your request.';
  }

  /**
   * Classify error by type and determine severity.
   */
  private static classifyError(error: Error): {
    code: string;
    severity: ErrorSeverity;
  } {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // SQL injection attempts
    if (
      message.includes('sql') ||
      message.includes('injection') ||
      message.includes('syntax error')
    ) {
      return { code: 'SECURITY_VIOLATION', severity: ErrorSeverity.CRITICAL };
    }

    // Connection errors
    if (
      name.includes('connection') ||
      message.includes('connection') ||
      message.includes('timeout')
    ) {
      return { code: 'CONNECTION_ERROR', severity: ErrorSeverity.HIGH };
    }

    // Authentication errors
    if (
      name.includes('auth') ||
      message.includes('authentication') ||
      message.includes('unauthorized')
    ) {
      return { code: 'AUTHENTICATION_ERROR', severity: ErrorSeverity.HIGH };
    }

    // Validation errors
    if (
      name.includes('validation') ||
      name.includes('type') ||
      message.includes('invalid')
    ) {
      return { code: 'VALIDATION_ERROR', severity: ErrorSeverity.MEDIUM };
    }

    // Generic errors
    return { code: 'INTERNAL_ERROR', severity: ErrorSeverity.MEDIUM };
  }

  /**
   * Extract safe details from error (no sensitive data).
   */
  private static extractSafeDetails(error: Error): Record<string, unknown> {
    const details: Record<string, unknown> = {
      name: error.name,
    };

    // Only include stack trace in development
    if (error.stack) {
      // Remove file paths and line numbers that might leak system info
      const sanitizedStack = error.stack
        .split('\n')
        .map((line) => {
          // Remove absolute paths
          return line.replace(/\/[^\s]+/g, '[REDACTED]');
        })
        .join('\n');
      details.stack = sanitizedStack;
    }

    return details;
  }

  /**
   * Log error securely without exposing sensitive information.
   *
   * @param error - Error to log
   * @param context - Additional context
   * @param config - Error handler configuration
   */
  static logErrorSecurely(
    error: Error | unknown,
    context: Record<string, unknown> = {},
    config: ErrorHandlerConfig
  ): void {
    if (!config.logDetails) {
      return;
    }

    const sanitized = this.sanitizeError(error, config);
    const logData = {
      ...sanitized,
      context: this.sanitizeContext(context, config.sensitivePatterns),
    };

    // In production, use structured logging
    if (config.isProduction) {
      // Use a proper logging service (e.g., Winston, Pino)
      console.error(JSON.stringify(logData));
    } else {
      // In development, more verbose logging
      console.error('Error:', logData);
      if (error instanceof Error && error.stack) {
        console.error('Stack:', error.stack);
      }
    }
  }

  /**
   * Sanitize context object to remove sensitive data.
   */
  private static sanitizeContext(
    context: Record<string, unknown>,
    patterns: RegExp[]
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      // Skip sensitive keys
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('key') ||
        lowerKey.includes('credential')
      ) {
        sanitized[key] = '***MASKED***';
        continue;
      }

      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = this.maskSensitiveData(value, patterns);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

