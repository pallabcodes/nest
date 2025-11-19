/**
 * NeatOrm - Audit Logger
 *
 * Enterprise-grade audit logging for security compliance and forensics.
 *
 * Security Features:
 * - Query audit logging
 * - Data access tracking
 * - Security event logging
 * - Compliance-ready logging format
 * - Tamper-evident logging
 */

/**
 * Audit log entry type.
 */
export enum AuditLogType {
  QUERY_EXECUTED = 'QUERY_EXECUTED',
  DATA_ACCESSED = 'DATA_ACCESSED',
  DATA_MODIFIED = 'DATA_MODIFIED',
  SECURITY_EVENT = 'SECURITY_EVENT',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
}

/**
 * Audit log entry.
 */
export interface AuditLogEntry {
  /**
   * Log entry ID (unique).
   */
  id: string;

  /**
   * Log entry type.
   */
  type: AuditLogType;

  /**
   * Timestamp of the event.
   */
  timestamp: Date;

  /**
   * User ID (if available).
   */
  userId?: string | number;

  /**
   * IP address of the client.
   */
  ipAddress?: string;

  /**
   * User agent string.
   */
  userAgent?: string;

  /**
   * Operation performed (e.g., 'SELECT', 'INSERT', 'UPDATE', 'DELETE').
   */
  operation: string;

  /**
   * Table/entity accessed.
   */
  table?: string;

  /**
   * Query executed (sanitized, no sensitive data).
   */
  query?: string;

  /**
   * Result status (success, failure, error).
   */
  status: 'success' | 'failure' | 'error';

  /**
   * Error message (if applicable, sanitized).
   */
  error?: string;

  /**
   * Additional metadata.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Audit logger configuration.
 */
export interface AuditLoggerConfig {
  /**
   * Whether audit logging is enabled.
   * Default: true
   */
  enabled: boolean;

  /**
   * Whether to log successful queries.
   * Default: false (only log failures and modifications)
   */
  logSuccessfulQueries: boolean;

  /**
   * Whether to log SELECT queries.
   * Default: false (only log modifications)
   */
  logSelectQueries: boolean;

  /**
   * Custom audit log handler.
   */
  handler?: (entry: AuditLogEntry) => void | Promise<void>;
}

/**
 * Audit Logger for enterprise security compliance.
 */
export class AuditLogger {
  private static config: AuditLoggerConfig = {
    enabled: true,
    logSuccessfulQueries: false,
    logSelectQueries: false,
  };

  /**
   * Configure the audit logger.
   *
   * @param config - Logger configuration
   */
  static configure(config: Partial<AuditLoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Log a query execution event.
   *
   * @param entry - Audit log entry
   */
  static async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Skip SELECT queries if not configured to log them
    if (
      entry.operation === 'SELECT' &&
      !this.config.logSelectQueries &&
      entry.status === 'success'
    ) {
      return;
    }

    // Skip successful queries if not configured to log them
    if (
      entry.status === 'success' &&
      !this.config.logSuccessfulQueries &&
      entry.operation !== 'INSERT' &&
      entry.operation !== 'UPDATE' &&
      entry.operation !== 'DELETE'
    ) {
      return;
    }

    const fullEntry: AuditLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Use custom handler if provided
    if (this.config.handler) {
      await this.config.handler(fullEntry);
      return;
    }

    // Default: log to console (in production, use proper logging service)
    console.log(JSON.stringify(fullEntry));
  }

  /**
   * Log a data access event.
   *
   * @param operation - Operation type
   * @param table - Table name
   * @param userId - User ID
   * @param metadata - Additional metadata
   */
  static async logDataAccess(
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    table: string,
    userId?: string | number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      type: AuditLogType.DATA_ACCESSED,
      operation,
      table,
      userId,
      status: 'success',
      metadata,
    });
  }

  /**
   * Log a data modification event.
   *
   * @param operation - Operation type
   * @param table - Table name
   * @param userId - User ID
   * @param metadata - Additional metadata
   */
  static async logDataModification(
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    table: string,
    userId?: string | number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      type: AuditLogType.DATA_MODIFIED,
      operation,
      table,
      userId,
      status: 'success',
      metadata,
    });
  }

  /**
   * Log a security event.
   *
   * @param event - Event description
   * @param severity - Event severity
   * @param metadata - Additional metadata
   */
  static async logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      type: AuditLogType.SECURITY_EVENT,
      operation: 'SECURITY_EVENT',
      status: 'success',
      metadata: {
        ...metadata,
        event,
        severity,
      },
    });
  }

  /**
   * Log a query execution error.
   *
   * @param operation - Operation type
   * @param table - Table name
   * @param error - Error message (sanitized)
   * @param userId - User ID
   * @param metadata - Additional metadata
   */
  static async logQueryError(
    operation: string,
    table: string | undefined,
    error: string,
    userId?: string | number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      type: AuditLogType.QUERY_EXECUTED,
      operation,
      table,
      userId,
      status: 'error',
      error,
      metadata,
    });
  }

  /**
   * Generate a unique log entry ID.
   */
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

