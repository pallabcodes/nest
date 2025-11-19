/**
 * NeatOrm - Advanced SQL Features Module
 *
 * Provides type-safe builders for advanced SQL features that most ORMs
 * ignore or handle poorly: CTEs, window functions, and views.
 *
 * Exported Components:
 * - CTE Builder: Common Table Expressions (WITH clause)
 * - Window Builder: Window functions (OVER clause)
 * - View Builder: Database views and materialized views
 *
 * Key Features:
 * - Full CTE support (including recursive)
 * - All standard window functions
 * - Views and materialized views
 * - Type-safe builders for all features
 * - Database-agnostic API
 *
 * Pain Points Solved:
 * ✅ No CTE support in most ORMs
 * ✅ No window function support
 * ✅ Poor view management
 * ✅ Complex recursive query syntax
 * ✅ Manual SQL for advanced features
 *
 * Why This Matters:
 * These features are essential for enterprise applications but are poorly
 * supported in most ORMs, forcing developers to write raw SQL. NeatOrm
 * provides type-safe, database-agnostic builders that generate optimal SQL.
 */

// Export CTE Builder
export * from './cte-builder.js';
export {
  CTEBuilder,
  cte,
  generateCTESQL,
  type CTEDefinition,
} from './cte-builder.js';

// Export Window Functions
export * from './window-builder.js';
export {
  WindowBuilder,
  window,
  type WindowFunction,
  type FrameMode,
  type FrameBoundary,
  type FrameSpec,
  type WindowSpec,
} from './window-builder.js';

// Export View Builder
export * from './view-builder.js';
export {
  ViewBuilder,
  view,
  materializedView,
  type ViewType,
  type ViewOptions,
  type MaterializedViewOptions,
  type RefreshOptions,
  type ViewDefinition,
} from './view-builder.js';

