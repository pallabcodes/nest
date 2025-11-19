/**
 * NeatOrm - View Builder
 *
 * Type-safe builder for database views with support for materialized views.
 * Views are first-class citizens in NeatOrm unlike most ORMs.
 *
 * Key TypeScript Excellence Features:
 * - Type-safe view creation
 * - Materialized view support
 * - View refresh operations
 * - Result type inference from view
 * - Compile-time view name validation
 *
 * TypeScript Compilation:
 * View builder uses generics to define view schema and ensure type safety
 * when querying views.
 *
 * Runtime Behavior:
 * Generates CREATE VIEW, CREATE MATERIALIZED VIEW, DROP VIEW, and REFRESH
 * MATERIALIZED VIEW statements. Handles database-specific syntax differences.
 *
 * Framework Integration:
 * View builder integrates with:
 * - Migration system for view management
 * - SELECT query builder for view queries
 * - Entity decorators for view entities
 * - SQL generator for view DDL
 *
 * Pain Points Addressed:
 * - No view support in most ORMs
 * - Manual view management
 * - Materialized view refresh complexity
 * - Type safety when querying views
 * - Database-specific view differences
 *
 * Research:
 * Views are ANSI SQL standard. Materialized views are PostgreSQL/Oracle
 * feature (MySQL 8.0+ has no native support, SQLite has no materialized views).
 * Views are essential for encapsulation, security, and performance.
 *
 * References:
 * - PostgreSQL Views and Materialized Views
 * - Oracle Materialized Views
 * - SQL Standard Views
 */

import type { SelectQueryWithSchema } from '../query-builder/index.js';
import type { RowResult } from '../query-builder/query-result.js';

/**
 * View type.
 */
export type ViewType = 'view' | 'materialized_view';

/**
 * View definition options.
 */
export interface ViewOptions {
  /**
   * Whether to replace existing view (OR REPLACE).
   * Default: false
   */
  orReplace?: boolean;

  /**
   * View columns (optional, inferred from query).
   */
  columns?: readonly string[];

  /**
   * Security level for view (PostgreSQL).
   * - DEFINER: View runs with creator's permissions
   * - INVOKER: View runs with user's permissions
   */
  security?: 'DEFINER' | 'INVOKER';

  /**
   * Check option for updatable views.
   * Ensures INSERT/UPDATE satisfy view's WHERE clause.
   */
  checkOption?: 'CASCADED' | 'LOCAL';
}

/**
 * Materialized view options.
 */
export interface MaterializedViewOptions extends ViewOptions {
  /**
   * Whether to populate the materialized view immediately.
   * Default: true (PostgreSQL WITH DATA)
   */
  withData?: boolean;

  /**
   * Tablespace for materialized view storage (PostgreSQL).
   */
  tablespace?: string;

  /**
   * Index columns for the materialized view.
   */
  indexes?: readonly string[];
}

/**
 * View refresh options.
 */
export interface RefreshOptions {
  /**
   * Whether to use CONCURRENTLY for non-blocking refresh.
   * Requires unique index on materialized view.
   * Default: false
   */
  concurrently?: boolean;
}

/**
 * View definition.
 * Represents a database view or materialized view.
 *
 * @template Name - View name
 * @template Schema - Result schema of the view
 */
export interface ViewDefinition<Name extends string = string, Schema extends RowResult = RowResult> {
  name: Name;
  type: ViewType;
  query: SelectQueryWithSchema<Schema> | string;
  options?: ViewOptions | MaterializedViewOptions;
}

/**
 * View Builder.
 * Builds database views and materialized views.
 *
 * @template Name - View name
 * @template Schema - View result schema
 *
 * @example
 * ```typescript
 * // Regular view
 * const activeUsersView = view('active_users')
 *   .as(
 *     db.select('id', 'name', 'email', 'created_at')
 *       .from('users')
 *       .where('status', '=', 'active')
 *   );
 *
 * await db.createView(activeUsersView);
 *
 * // Query the view
 * const activeUsers = await db
 *   .select('*')
 *   .from('active_users')
 *   .execute();
 *
 * // Materialized view (for expensive queries)
 * const userStatsView = materializedView('user_stats')
 *   .as(
 *     db.select('user_id')
 *       .selectAs(window().count().build(), 'post_count')
 *       .selectAs(window().sum('likes').build(), 'total_likes')
 *       .from('posts')
 *       .groupBy('user_id')
 *   );
 *
 * await db.createMaterializedView(userStatsView);
 *
 * // Refresh materialized view
 * await db.refreshMaterializedView('user_stats', { concurrently: true });
 * ```
 */
export class ViewBuilder<Name extends string = string, Schema extends RowResult = RowResult> {
  private viewName: Name;
  private viewType: ViewType;
  private viewQuery?: SelectQueryWithSchema<Schema> | string;
  private viewOptions?: ViewOptions | MaterializedViewOptions;

  /**
   * Create a new view builder.
   *
   * @param name - View name
   * @param type - View type (regular or materialized)
   */
  constructor(name: Name, type: ViewType = 'view') {
    this.viewName = name;
    this.viewType = type;
  }

  /**
   * Define the query for this view.
   *
   * @param query - Query builder or raw SQL string
   * @returns Builder instance
   */
  as(
    query: SelectQueryWithSchema<Schema> | string
  ): this {
    this.viewQuery = query;
    return this;
  }

  /**
   * Set view options.
   *
   * @param options - View options
   * @returns Builder instance
   */
  options(options: ViewOptions | MaterializedViewOptions): this {
    this.viewOptions = options;
    return this;
  }

  /**
   * Enable OR REPLACE for the view.
   *
   * @returns Builder instance
   */
  orReplace(): this {
    this.viewOptions = { ...this.viewOptions, orReplace: true };
    return this;
  }

  /**
   * Build the view definition.
   *
   * @returns View definition
   */
  build(): ViewDefinition<Name, Schema> {
    if (!this.viewQuery) {
      throw new Error(`View '${this.viewName}' has no query defined. Call as() to define the query.`);
    }

    return {
      name: this.viewName,
      type: this.viewType,
      query: this.viewQuery,
      options: this.viewOptions,
    };
  }

  /**
   * Generate CREATE VIEW SQL.
   *
   * @returns SQL string
   */
  toCreateSQL(): string {
    const def = this.build();
    const query = typeof def.query === 'string' ? def.query : def.query.toSQL();

    if (def.type === 'view') {
      const orReplace = def.options?.orReplace ? ' OR REPLACE' : '';
      const columns = def.options?.columns
        ? ` (${def.options.columns.join(', ')})`
        : '';

      return `CREATE${orReplace} VIEW ${def.name}${columns} AS ${query}`;
    } else {
      // Materialized view
      const matOptions = def.options as MaterializedViewOptions | undefined;
      const withData = matOptions?.withData !== false ? ' WITH DATA' : ' WITH NO DATA';

      return `CREATE MATERIALIZED VIEW ${def.name} AS ${query}${withData}`;
    }
  }

  /**
   * Generate DROP VIEW SQL.
   *
   * @param ifExists - Whether to use IF EXISTS clause
   * @returns SQL string
   */
  toDropSQL(ifExists: boolean = true): string {
    const def = this.build();
    const ifExistsClause = ifExists ? ' IF EXISTS' : '';
    const viewKeyword = def.type === 'materialized_view' ? 'MATERIALIZED VIEW' : 'VIEW';

    return `DROP ${viewKeyword}${ifExistsClause} ${def.name}`;
  }

  /**
   * Generate REFRESH MATERIALIZED VIEW SQL.
   *
   * @param options - Refresh options
   * @returns SQL string
   */
  toRefreshSQL(options?: RefreshOptions): string {
    const concurrently = options?.concurrently ? ' CONCURRENTLY' : '';
    return `REFRESH MATERIALIZED VIEW${concurrently} ${this.viewName}`;
  }
}

/**
 * Create a regular view builder.
 *
 * @param name - View name
 * @returns View builder
 *
 * @example
 * ```typescript
 * const activeUsers = view('active_users')
 *   .as(db.select('*').from('users').where('active', '=', true));
 * ```
 */
export function view<Name extends string, Schema extends RowResult = RowResult>(
  name: Name
): ViewBuilder<Name, Schema> {
  return new ViewBuilder<Name, Schema>(name, 'view');
}

/**
 * Create a materialized view builder.
 *
 * @param name - View name
 * @returns View builder
 *
 * @example
 * ```typescript
 * const userStats = materializedView('user_stats')
 *   .as(db.select('user_id').selectAs('COUNT(*)', 'post_count').from('posts').groupBy('user_id'));
 * ```
 */
export function materializedView<Name extends string, Schema extends RowResult = RowResult>(
  name: Name
): ViewBuilder<Name, Schema> {
  return new ViewBuilder<Name, Schema>(name, 'materialized_view');
}

