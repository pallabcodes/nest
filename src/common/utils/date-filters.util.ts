import { Op } from 'sequelize';
import {
  parseDate,
  getStartOfDay,
  getEndOfDay,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfYear,
  getEndOfYear,
  getLastNMonths,
  getThisQuarter,
} from './date-calculations.util';

/**
 * Date Filters Utility
 *
 * Sequelize-specific date filter functions.
 * Uses date calculations from date-calculations.util.
 */

/**
 * Get date range filter for Sequelize
 */
export function getDateRangeFilter(
  fieldName: string,
  startDate: Date | string,
  endDate: Date | string,
): Record<string, any> {
  return {
    [fieldName]: {
      [Op.between]: [parseDate(startDate), parseDate(endDate)],
    },
  };
}

/**
 * Get today's date range filter
 */
export function getTodayFilter(fieldName: string): Record<string, any> {
  const start = getStartOfDay();
  const end = getEndOfDay();
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get this month's date range filter
 */
export function getThisMonthFilter(fieldName: string): Record<string, any> {
  const start = getStartOfMonth();
  const end = getEndOfMonth();
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get last N months date range filter
 */
export function getLastNMonthsFilter(fieldName: string, months: number): Record<string, any> {
  const { start, end } = getLastNMonths(months);
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get this quarter's date range filter
 */
export function getThisQuarterFilter(fieldName: string): Record<string, any> {
  const { start, end } = getThisQuarter();
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get this year's date range filter
 */
export function getThisYearFilter(fieldName: string): Record<string, any> {
  const start = getStartOfYear();
  const end = getEndOfYear();
  return getDateRangeFilter(fieldName, start, end);
}
