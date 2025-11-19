/**
 * NeatOrm - SQL Injection Prevention
 *
 * Comprehensive SQL injection prevention utilities and validators.
 * This module provides the strongest possible protection against SQL injection attacks.
 *
 * Security Features:
 * - Join condition validation
 * - Raw SQL validation
 * - Identifier validation
 * - Parameter validation
 * - SQL pattern detection
 */

import { InputValidator } from './input-validator.js';

/**
 * SQL injection prevention result.
 */
export interface SQLInjectionCheckResult {
  safe: boolean;
  reason?: string;
  sanitized?: string;
}

/**
 * SQL Injection Prevention utilities.
 */
export class SQLInjectionPrevention {
  /**
   * Dangerous SQL patterns that indicate injection attempts.
   */
  private static readonly DANGEROUS_PATTERNS = [
    // SQL keywords used maliciously
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
    
    // Comment injection
    /(--|\/\*|\*\/)/,
    
    // String termination
    /(['";])/,
    
    // Boolean-based injection
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]\w+['"]\s*=\s*['"]\w+['"])/i,
    
    // Time-based injection
    /(\b(SLEEP|WAITFOR|DELAY|BENCHMARK)\b)/i,
    
    // Function injection
    /(\b(LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b)/i,
    
    // Schema manipulation
    /(\b(INFORMATION_SCHEMA|sys\.|pg_catalog\.|mysql\.)/i,
  ];

  /**
   * Safe operators for join conditions.
   */
  private static readonly SAFE_OPERATORS = ['=', '!=', '<>', '>', '<', '>=', '<='];

  /**
   * Validate a join condition string.
   * Join conditions should only contain column references and safe operators.
   *
   * @param condition - Join condition string (e.g., 'u.id = p.user_id')
   * @returns Validation result
   *
   * @example
   * ```typescript
   * const result = SQLInjectionPrevention.validateJoinCondition('u.id = p.user_id');
   * if (!result.safe) {
   *   throw new Error(result.reason);
   * }
   * ```
   */
  static validateJoinCondition(condition: string): SQLInjectionCheckResult {
    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(condition)) {
        return {
          safe: false,
          reason: 'Join condition contains potentially dangerous SQL patterns',
        };
      }
    }

    // Validate structure: should be "column operator column" or "column operator value"
    // Allow qualified names (table.column) and simple operators
    const joinConditionPattern = /^[a-zA-Z_][a-zA-Z0-9_.]*\s+(=|!=|<>|>|<|>=|<=)\s+[a-zA-Z_][a-zA-Z0-9_.]*$/;

    if (!joinConditionPattern.test(condition.trim())) {
      // Allow more complex conditions but validate they don't contain dangerous patterns
      // This allows expressions like "u.id = p.user_id AND p.status = 'active'"
      const parts = condition.split(/\s+(AND|OR)\s+/i);
      
      for (const part of parts) {
        const trimmed = part.trim();
        // Check if it's a simple comparison
        if (!/^[a-zA-Z_][a-zA-Z0-9_.]*\s+(=|!=|<>|>|<|>=|<=)\s+([a-zA-Z_][a-zA-Z0-9_.]*|'[^']*'|"[^"]*"|\d+)$/.test(trimmed)) {
          // If not a simple comparison, check for dangerous patterns
          for (const pattern of this.DANGEROUS_PATTERNS) {
            if (pattern.test(trimmed)) {
              return {
                safe: false,
                reason: 'Join condition contains unsafe SQL patterns',
              };
            }
          }
        }
      }
    }

    return { safe: true, sanitized: condition };
  }

  /**
   * Validate a raw SQL string (for CTEs, views, etc.).
   * This is stricter validation since raw SQL is more dangerous.
   *
   * @param sql - Raw SQL string
   * @param allowSelect - Whether to allow SELECT statements
   * @returns Validation result
   *
   * @example
   * ```typescript
   * const result = SQLInjectionPrevention.validateRawSQL(userSQL, true);
   * if (!result.safe) {
   *   throw new Error('Unsafe SQL detected');
   * }
   * ```
   */
  static validateRawSQL(
    sql: string,
    allowSelect: boolean = true
  ): SQLInjectionCheckResult {
    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(sql)) {
        return {
          safe: false,
          reason: 'SQL contains potentially dangerous patterns',
        };
      }
    }

    // Check for disallowed statements
    const disallowedStatements = [
      'DROP',
      'DELETE',
      'TRUNCATE',
      'ALTER',
      'CREATE',
      'EXEC',
      'EXECUTE',
      'INSERT',
      'UPDATE',
    ];

    if (!allowSelect) {
      disallowedStatements.push('SELECT');
    }

    for (const statement of disallowedStatements) {
      const regex = new RegExp(`\\b${statement}\\b`, 'i');
      if (regex.test(sql)) {
        return {
          safe: false,
          reason: `SQL contains disallowed statement: ${statement}`,
        };
      }
    }

    // Check for parameterized queries (good practice)
    // Raw SQL should ideally use parameters, but we don't enforce it here
    // as it's the developer's responsibility

    return { safe: true, sanitized: sql };
  }

  /**
   * Validate that a value is safe for IS NULL / IS NOT NULL operations.
   * These operations don't use parameters, so we need to ensure the value is safe.
   *
   * @param value - Value to check
   * @returns Validation result
   */
  static validateNullCheck(value: unknown): SQLInjectionCheckResult {
    // IS NULL / IS NOT NULL should only use NULL literal
    if (value === null || value === 'NULL' || value === 'null') {
      return { safe: true, sanitized: 'NULL' };
    }

    // Allow boolean false for IS NOT NULL checks
    if (value === false || value === 'false') {
      return { safe: true, sanitized: 'NULL' };
    }

    return {
      safe: false,
      reason: 'IS NULL / IS NOT NULL operations must use NULL literal',
    };
  }

  /**
   * Sanitize a column/table identifier.
   * Ensures identifiers are safe and don't contain injection patterns.
   *
   * @param identifier - Identifier to sanitize
   * @returns Validation result with sanitized identifier
   */
  static sanitizeIdentifier(identifier: string): SQLInjectionCheckResult {
    // Use InputValidator for basic validation
    const validation = InputValidator.validateIdentifier(identifier);

    if (!validation.valid) {
      return {
        safe: false,
        reason: validation.error,
      };
    }

    // Additional check for SQL injection patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(identifier)) {
        return {
          safe: false,
          reason: 'Identifier contains potentially dangerous SQL patterns',
        };
      }
    }

    return {
      safe: true,
      sanitized: validation.sanitized as string,
    };
  }

  /**
   * Validate parameter values to ensure they don't contain SQL injection attempts.
   * Even though parameters are bound separately, we validate for defense in depth.
   *
   * @param value - Parameter value to validate
   * @returns Validation result
   */
  static validateParameter(value: unknown): SQLInjectionCheckResult {
    if (value === null || value === undefined) {
      return { safe: true, sanitized: null };
    }

    if (typeof value === 'string') {
      // Check for SQL injection patterns in string values
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(value)) {
          return {
            safe: false,
            reason: 'Parameter value contains potentially dangerous SQL patterns',
          };
        }
      }

      // Validate string length (prevent DoS)
      if (value.length > 100000) {
        return {
          safe: false,
          reason: 'Parameter value exceeds maximum length',
        };
      }
    }

    if (Array.isArray(value)) {
      // Validate array length
      if (value.length > 1000) {
        return {
          safe: false,
          reason: 'Parameter array exceeds maximum length',
        };
      }

      // Validate each element
      for (const item of value) {
        const itemCheck = this.validateParameter(item);
        if (!itemCheck.safe) {
          return itemCheck;
        }
      }
    }

    return { safe: true, sanitized: value };
  }

  /**
   * Comprehensive SQL injection check.
   * Validates all aspects of a query for SQL injection vulnerabilities.
   *
   * @param query - Query structure to validate
   * @returns Validation result
   */
  static validateQuery(query: {
    table?: string;
    columns?: readonly string[];
    joins?: Array<{ condition?: string }>;
    where?: Array<{ column: string; value: unknown }>;
  }): SQLInjectionCheckResult {
    // Validate table name
    if (query.table) {
      const tableCheck = this.sanitizeIdentifier(query.table);
      if (!tableCheck.safe) {
        return tableCheck;
      }
    }

    // Validate column names
    if (query.columns) {
      for (const column of query.columns) {
        const columnCheck = this.sanitizeIdentifier(column);
        if (!columnCheck.safe) {
          return columnCheck;
        }
      }
    }

    // Validate join conditions
    if (query.joins) {
      for (const join of query.joins) {
        if (join.condition) {
          const joinCheck = this.validateJoinCondition(join.condition);
          if (!joinCheck.safe) {
            return joinCheck;
          }
        }
      }
    }

    // Validate WHERE clause values
    if (query.where) {
      for (const condition of query.where) {
        const paramCheck = this.validateParameter(condition.value);
        if (!paramCheck.safe) {
          return paramCheck;
        }
      }
    }

    return { safe: true };
  }
}

