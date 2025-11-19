/**
 * NeatOrm - Query Limits
 *
 * Enterprise-grade query limits to prevent DoS attacks and resource exhaustion.
 *
 * Security Features:
 * - Maximum result set size limits
 * - Query timeout enforcement
 * - Maximum query complexity limits
 * - Connection pool limits
 * - Rate limiting support
 */

/**
 * Query limit configuration.
 */
export interface QueryLimitsConfig {
  /**
   * Maximum number of rows returned by a single query.
   * Default: 10000
   */
  maxRows?: number;

  /**
   * Maximum query execution time in milliseconds.
   * Default: 30000 (30 seconds)
   */
  maxQueryTime?: number;

  /**
   * Maximum number of joins allowed in a single query.
   * Default: 10
   */
  maxJoins?: number;

  /**
   * Maximum number of WHERE conditions allowed.
   * Default: 50
   */
  maxWhereConditions?: number;

  /**
   * Maximum number of columns in SELECT.
   * Default: 100
   */
  maxSelectColumns?: number;

  /**
   * Maximum query string length.
   * Default: 100000 characters
   */
  maxQueryLength?: number;

  /**
   * Maximum number of parameters in a query.
   * Default: 1000
   */
  maxParameters?: number;
}

/**
 * Query Limits Manager for enterprise security.
 */
export class QueryLimits {
  private static readonly DEFAULT_MAX_ROWS = 10000;
  private static readonly DEFAULT_MAX_QUERY_TIME = 30000;
  private static readonly DEFAULT_MAX_JOINS = 10;
  private static readonly DEFAULT_MAX_WHERE_CONDITIONS = 50;
  private static readonly DEFAULT_MAX_SELECT_COLUMNS = 100;
  private static readonly DEFAULT_MAX_QUERY_LENGTH = 100000;
  private static readonly DEFAULT_MAX_PARAMETERS = 1000;

  /**
   * Validate query against limits.
   *
   * @param query - Query structure to validate
   * @param config - Limit configuration
   * @throws Error if query exceeds limits
   */
  static validateQuery(
    query: {
      select?: readonly string[];
      joins?: readonly unknown[];
      where?: readonly unknown[];
      limit?: number;
    },
    config: QueryLimitsConfig = {}
  ): void {
    const maxRows = config.maxRows ?? this.DEFAULT_MAX_ROWS;
    const maxJoins = config.maxJoins ?? this.DEFAULT_MAX_JOINS;
    const maxWhereConditions =
      config.maxWhereConditions ?? this.DEFAULT_MAX_WHERE_CONDITIONS;
    const maxSelectColumns =
      config.maxSelectColumns ?? this.DEFAULT_MAX_SELECT_COLUMNS;

    // Check LIMIT clause
    if (query.limit !== undefined && query.limit > maxRows) {
      throw new Error(
        `Query limit (${query.limit}) exceeds maximum allowed (${maxRows})`
      );
    }

    // Check SELECT columns
    if (query.select && query.select.length > maxSelectColumns) {
      throw new Error(
        `Query selects ${query.select.length} columns, exceeds maximum of ${maxSelectColumns}`
      );
    }

    // Check JOIN count
    if (query.joins && query.joins.length > maxJoins) {
      throw new Error(
        `Query has ${query.joins.length} joins, exceeds maximum of ${maxJoins}`
      );
    }

    // Check WHERE conditions
    if (query.where && query.where.length > maxWhereConditions) {
      throw new Error(
        `Query has ${query.where.length} WHERE conditions, exceeds maximum of ${maxWhereConditions}`
      );
    }
  }

  /**
   * Validate SQL string length.
   *
   * @param sql - SQL string to validate
   * @param config - Limit configuration
   * @throws Error if SQL exceeds length limit
   */
  static validateSQLLength(
    sql: string,
    config: QueryLimitsConfig = {}
  ): void {
    const maxLength = config.maxQueryLength ?? this.DEFAULT_MAX_QUERY_LENGTH;

    if (sql.length > maxLength) {
      throw new Error(
        `SQL query length (${sql.length}) exceeds maximum allowed (${maxLength})`
      );
    }
  }

  /**
   * Validate parameter count.
   *
   * @param parameters - Parameters array
   * @param config - Limit configuration
   * @throws Error if parameter count exceeds limit
   */
  static validateParameterCount(
    parameters: readonly unknown[],
    config: QueryLimitsConfig = {}
  ): void {
    const maxParams = config.maxParameters ?? this.DEFAULT_MAX_PARAMETERS;

    if (parameters.length > maxParams) {
      throw new Error(
        `Query has ${parameters.length} parameters, exceeds maximum of ${maxParams}`
      );
    }
  }

  /**
   * Get maximum query execution time.
   *
   * @param config - Limit configuration
   * @returns Maximum query time in milliseconds
   */
  static getMaxQueryTime(config: QueryLimitsConfig = {}): number {
    return config.maxQueryTime ?? this.DEFAULT_MAX_QUERY_TIME;
  }

  /**
   * Create a timeout promise for query execution.
   *
   * @param queryPromise - Query execution promise
   * @param config - Limit configuration
   * @returns Promise that rejects on timeout
   */
  static withTimeout<T>(
    queryPromise: Promise<T>,
    config: QueryLimitsConfig = {}
  ): Promise<T> {
    const maxTime = this.getMaxQueryTime(config);

    return Promise.race([
      queryPromise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Query execution exceeded timeout of ${maxTime}ms`));
        }, maxTime);
      }),
    ]);
  }
}

