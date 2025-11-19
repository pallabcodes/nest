/**
 * NeatOrm - SQL Generator
 *
 * Generates SQL strings from query structures. Provides database-agnostic
 * SQL generation with hooks for database-specific dialects.
 *
 * Key TypeScript Excellence Features:
 * - Type-safe SQL generation
 * - Parameterized query support (SQL injection prevention)
 * - Database-specific dialect support
 * - Readable SQL output for debugging
 *
 * TypeScript Compilation:
 * The SQL generator is a runtime utility. TypeScript ensures type safety
 * for the query structure input, but the output is a plain SQL string.
 *
 * Runtime Behavior:
 * Converts query structures to SQL strings with parameter placeholders.
 * Parameters are returned separately for safe execution by database adapters.
 *
 * Framework Integration:
 * The SQL generator integrates with:
 * - Query builders for SQL generation
 * - Database adapters for dialect-specific SQL
 * - Parameter binding for SQL injection prevention
 * - Query logging for debugging
 *
 * Pain Points Addressed:
 * - Manual SQL string construction errors
 * - SQL injection vulnerabilities
 * - Database-specific SQL differences
 * - Debugging complex queries
 *
 * Research:
 * Follows parameterized query patterns from all major ORMs and database
 * libraries. Uses positional parameters ($1, $2) for PostgreSQL and
 * question marks (?) for MySQL/SQLite.
 */

import type {
  QueryStructure,
  WhereCondition,
  OrderByClause,
  JoinClause,
} from './query-builder-types.js';

/**
 * SQL dialect types.
 */
export type SQLDialect = 'postgresql' | 'mysql' | 'sqlite';

/**
 * Generated SQL with parameters.
 */
export interface GeneratedSQL {
  sql: string;
  parameters: readonly unknown[];
}

/**
 * SQL Generator class.
 */
export class SQLGenerator {
  constructor(private dialect: SQLDialect = 'postgresql') {}

  /**
   * Generate SELECT SQL from query structure.
   *
   * @param query - Query structure
   * @returns Generated SQL with parameters
   */
  generateSelect(query: QueryStructure): GeneratedSQL {
    const parameters: unknown[] = [];
    const parts: string[] = [];

    // SELECT clause
    const selectClause = this.buildSelectClause(query);
    parts.push(selectClause);

    // FROM clause
    if (query.from) {
      parts.push(`FROM ${this.escapeIdentifier(query.from)}`);
    }

    // JOIN clauses
    if (query.joins.length > 0) {
      const joinClauses = this.buildJoinClauses(query.joins);
      parts.push(joinClauses);
    }

    // WHERE clause
    if (query.where.length > 0) {
      const { clause, params } = this.buildWhereClause(
        query.where,
        parameters.length
      );
      parts.push(`WHERE ${clause}`);
      parameters.push(...params);
    }

    // GROUP BY clause
    if (query.groupBy) {
      const groupByClause = query.groupBy.columns
        .map((col) => this.escapeIdentifier(String(col)))
        .join(', ');
      parts.push(`GROUP BY ${groupByClause}`);

      // HAVING clause
      if (query.groupBy.having && query.groupBy.having.length > 0) {
        const { clause, params } = this.buildWhereClause(
          query.groupBy.having,
          parameters.length
        );
        parts.push(`HAVING ${clause}`);
        parameters.push(...params);
      }
    }

    // ORDER BY clause
    if (query.orderBy.length > 0) {
      const orderByClause = this.buildOrderByClause(query.orderBy);
      parts.push(orderByClause);
    }

    // LIMIT and OFFSET
    if (query.limitOffset) {
      if (query.limitOffset.limit !== undefined) {
        parts.push(`LIMIT ${query.limitOffset.limit}`);
      }
      if (query.limitOffset.offset !== undefined) {
        parts.push(`OFFSET ${query.limitOffset.offset}`);
      }
    }

    // FOR UPDATE / FOR SHARE
    if (query.forUpdate) {
      parts.push('FOR UPDATE');
    } else if (query.forShare) {
      parts.push('FOR SHARE');
    }

    return {
      sql: parts.join(' '),
      parameters,
    };
  }

  /**
   * Build SELECT clause.
   */
  private buildSelectClause(query: QueryStructure): string {
    const distinct = query.distinct ? 'DISTINCT ' : '';
    const columns = query.select.length > 0
      ? query.select.map((col) => this.escapeIdentifier(col)).join(', ')
      : '*';
    return `SELECT ${distinct}${columns}`;
  }

  /**
   * Build JOIN clauses.
   */
  private buildJoinClauses(joins: readonly JoinClause[]): string {
    return joins
      .map((join) => {
        const operator = join.operator || '=';
        return (
          `${join.type} JOIN ${this.escapeIdentifier(join.table)} ` +
          `ON ${this.escapeIdentifier(join.leftColumn)} ${operator} ${this.escapeIdentifier(join.rightColumn)}`
        );
      })
      .join(' ');
  }

  /**
   * Build WHERE clause with parameter placeholders.
   */
  private buildWhereClause(
    conditions: readonly WhereCondition[],
    startParamIndex: number
  ): { clause: string; params: unknown[] } {
    const params: unknown[] = [];
    let paramIndex = startParamIndex;

    const clause = conditions
      .map((condition, index) => {
        const logical = index > 0 ? ` ${condition.logicalOperator || 'AND'} ` : '';
        const column = this.escapeIdentifier(condition.column);
        const operator = condition.operator;

        // Handle special operators
        if (operator === 'IN' || operator === 'NOT IN') {
          const values = Array.isArray(condition.value) ? condition.value : [condition.value];
          const placeholders = values.map(() => {
            paramIndex++;
            return this.getParameterPlaceholder(paramIndex);
          });
          params.push(...values);
          return `${logical}${column} ${operator} (${placeholders.join(', ')})`;
        } else if (operator === 'IS' || operator === 'IS NOT') {
          // IS NULL / IS NOT NULL don't use parameters
          // Validate that value is safe (should be NULL literal)
          const nullValue = condition.value === null || condition.value === 'NULL' || condition.value === 'null'
            ? 'NULL'
            : String(condition.value);
          // Additional safety: only allow NULL literal
          if (nullValue !== 'NULL' && nullValue.toUpperCase() !== 'NULL') {
            throw new Error('IS NULL / IS NOT NULL operations must use NULL literal');
          }
          return `${logical}${column} ${operator} NULL`;
        } else if (operator === 'BETWEEN' || operator === 'NOT BETWEEN') {
          const [start, end] = Array.isArray(condition.value)
            ? condition.value
            : [condition.value, condition.value];
          paramIndex += 2;
          params.push(start, end);
          return `${logical}${column} ${operator} ${this.getParameterPlaceholder(paramIndex - 1)} AND ${this.getParameterPlaceholder(paramIndex)}`;
        } else {
          // Regular comparison
          paramIndex++;
          params.push(condition.value);
          return `${logical}${column} ${operator} ${this.getParameterPlaceholder(paramIndex)}`;
        }
      })
      .join('');

    return { clause, params };
  }

  /**
   * Build ORDER BY clause.
   */
  private buildOrderByClause(orderBy: readonly OrderByClause[]): string {
    const clauses = orderBy
      .map((order) => `${this.escapeIdentifier(order.column)} ${order.direction}`)
      .join(', ');
    return `ORDER BY ${clauses}`;
  }

  /**
   * Escape identifier (table/column name) for safe SQL.
   */
  private escapeIdentifier(identifier: string): string {
    // Handle qualified names (table.column)
    if (identifier.includes('.')) {
      const parts = identifier.split('.');
      return parts.map((part) => this.escapeIdentifier(part)).join('.');
    }

    // Handle aliases (column AS alias)
    if (identifier.toUpperCase().includes(' AS ')) {
      const [col, alias] = identifier.split(/\s+AS\s+/i);
      return `${this.escapeIdentifier(col)} AS ${this.escapeIdentifier(alias)}`;
    }

    // Database-specific escaping
    switch (this.dialect) {
      case 'postgresql':
        return `"${identifier.replace(/"/g, '""')}"`;
      case 'mysql':
        return `\`${identifier.replace(/`/g, '``')}\``;
      case 'sqlite':
        return `"${identifier.replace(/"/g, '""')}"`;
      default:
        return identifier;
    }
  }

  /**
   * Get parameter placeholder for the current dialect.
   */
  private getParameterPlaceholder(index: number): string {
    switch (this.dialect) {
      case 'postgresql':
        return `$${index}`;
      case 'mysql':
      case 'sqlite':
        return '?';
      default:
        return '?';
    }
  }
}

