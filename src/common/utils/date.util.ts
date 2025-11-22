/**
 * Date Utility Functions for MySQL 8+ and Sequelize
 *
 * Provides reusable date filtering utilities for repositories.
 * Re-exports from date-calculations.util and date-filters.util for backward compatibility.
 *
 * @example
 * ```ts
 * import { getDateRangeFilter, getThisMonthFilter, getThisQuarterFilter } from '@/common/utils/date.util';
 *
 * // In repository:
 * const where = {
 *   ...getThisMonthFilter('createdAt'),
 *   isActive: true
 * };
 * ```
 */

// Re-export all date calculations
export * from './date-calculations.util';

// Re-export all date filters
export * from './date-filters.util';
