import { Op } from 'sequelize';

/**
 * Date Utility Functions for MySQL 8+ and Sequelize
 * 
 * Provides reusable date filtering utilities for repositories.
 * Perfect for interview assignments where you need quick date filtering.
 * 
 * @example
 * ```ts
 * import { getDateRangeFilter, getMonthFilter, getQuarterFilter } from '@/common/utils/date.util';
 * 
 * // In repository:
 * const where = {
 *   ...getMonthFilter('createdAt'),
 *   isActive: true
 * };
 * ```
 */

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Get start of day (00:00:00.000)
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day (23:59:59.999)
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get start of month (first day, 00:00:00.000)
 */
export function getStartOfMonth(year?: number, month?: number): Date {
  const now = new Date();
  const d = new Date(year ?? now.getFullYear(), month !== undefined ? month - 1 : now.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of month (last day, 23:59:59.999)
 */
export function getEndOfMonth(year?: number, month?: number): Date {
  const now = new Date();
  const d = new Date(year ?? now.getFullYear(), month !== undefined ? month : now.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get start of quarter (first day of quarter, 00:00:00.000)
 * Quarters: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
 */
export function getStartOfQuarter(year?: number, quarter?: number): Date {
  const now = new Date();
  const currentYear = year ?? now.getFullYear();
  const currentQuarter = quarter ?? Math.floor(now.getMonth() / 3) + 1;
  const month = (currentQuarter - 1) * 3;
  const d = new Date(currentYear, month, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of quarter (last day of quarter, 23:59:59.999)
 */
export function getEndOfQuarter(year?: number, quarter?: number): Date {
  const now = new Date();
  const currentYear = year ?? now.getFullYear();
  const currentQuarter = quarter ?? Math.floor(now.getMonth() / 3) + 1;
  const month = currentQuarter * 3;
  const d = new Date(currentYear, month, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get start of year (Jan 1, 00:00:00.000)
 */
export function getStartOfYear(year?: number): Date {
  const d = new Date(year ?? new Date().getFullYear(), 0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of year (Dec 31, 23:59:59.999)
 */
export function getEndOfYear(year?: number): Date {
  const d = new Date(year ?? new Date().getFullYear(), 11, 31);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get date range for last N days
 */
export function getLastNDays(days: number): DateRange {
  const end = getEndOfDay();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Get date range for last N months
 */
export function getLastNMonths(months: number): DateRange {
  const end = getEndOfDay();
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Get date range for last N quarters
 */
export function getLastNQuarters(quarters: number): DateRange {
  const end = getEndOfDay();
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const start = getStartOfQuarter(now.getFullYear(), currentQuarter - quarters + 1);
  return { start, end };
}

/**
 * Get date range for last N years
 */
export function getLastNYears(years: number): DateRange {
  const end = getEndOfDay();
  const start = getStartOfYear(new Date().getFullYear() - years + 1);
  return { start, end };
}

/**
 * Parse date string or Date object to Date
 */
export function parseDate(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

/**
 * Get Sequelize where clause for date range filter
 * 
 * @param fieldName - Database field name (e.g., 'createdAt', 'updatedAt')
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Sequelize where clause object
 * 
 * @example
 * ```ts
 * const where = {
 *   ...getDateRangeFilter('createdAt', '2024-01-01', '2024-12-31'),
 *   isActive: true
 * };
 * ```
 */
export function getDateRangeFilter(
  fieldName: string,
  startDate: Date | string,
  endDate: Date | string
): Record<string, any> {
  return {
    [fieldName]: {
      [Op.between]: [parseDate(startDate), parseDate(endDate)],
    },
  };
}

/**
 * Get Sequelize where clause for current month filter
 * 
 * @param fieldName - Database field name
 * @returns Sequelize where clause object
 * 
 * @example
 * ```ts
 * const where = {
 *   ...getMonthFilter('createdAt'),
 *   isActive: true
 * };
 * ```
 */
export function getMonthFilter(fieldName: string, year?: number, month?: number): Record<string, any> {
  const start = getStartOfMonth(year, month);
  const end = getEndOfMonth(year, month);
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get Sequelize where clause for current quarter filter
 * 
 * @param fieldName - Database field name
 * @param year - Optional year (defaults to current year)
 * @param quarter - Optional quarter 1-4 (defaults to current quarter)
 * @returns Sequelize where clause object
 * 
 * @example
 * ```ts
 * const where = {
 *   ...getQuarterFilter('createdAt'),
 *   isActive: true
 * };
 * 
 * // Specific quarter
 * const whereQ2 = {
 *   ...getQuarterFilter('createdAt', 2024, 2),
 * };
 * ```
 */
export function getQuarterFilter(fieldName: string, year?: number, quarter?: number): Record<string, any> {
  const start = getStartOfQuarter(year, quarter);
  const end = getEndOfQuarter(year, quarter);
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get Sequelize where clause for current year filter
 * 
 * @param fieldName - Database field name
 * @param year - Optional year (defaults to current year)
 * @returns Sequelize where clause object
 * 
 * @example
 * ```ts
 * const where = {
 *   ...getYearFilter('createdAt'),
 *   isActive: true
 * };
 * 
 * // Specific year
 * const where2023 = {
 *   ...getYearFilter('createdAt', 2023),
 * };
 * ```
 */
export function getYearFilter(fieldName: string, year?: number): Record<string, any> {
  const start = getStartOfYear(year);
  const end = getEndOfYear(year);
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get Sequelize where clause for last N days filter
 * 
 * @param fieldName - Database field name
 * @param days - Number of days to look back
 * @returns Sequelize where clause object
 * 
 * @example
 * ```ts
 * const where = {
 *   ...getLastNDaysFilter('createdAt', 7), // Last 7 days
 * };
 * ```
 */
export function getLastNDaysFilter(fieldName: string, days: number): Record<string, any> {
  const { start, end } = getLastNDays(days);
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get Sequelize where clause for last N months filter
 * 
 * @param fieldName - Database field name
 * @param months - Number of months to look back
 * @returns Sequelize where clause object
 * 
 * @example
 * ```ts
 * const where = {
 *   ...getLastNMonthsFilter('createdAt', 3), // Last 3 months
 * };
 * ```
 */
export function getLastNMonthsFilter(fieldName: string, months: number): Record<string, any> {
  const { start, end } = getLastNMonths(months);
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get Sequelize where clause for last N quarters filter
 * 
 * @param fieldName - Database field name
 * @param quarters - Number of quarters to look back
 * @returns Sequelize where clause object
 * 
 * @example
 * ```ts
 * const where = {
 *   ...getLastNQuartersFilter('createdAt', 2), // Last 2 quarters
 * };
 * ```
 */
export function getLastNQuartersFilter(fieldName: string, quarters: number): Record<string, any> {
  const { start, end } = getLastNQuarters(quarters);
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get Sequelize where clause for last N years filter
 * 
 * @param fieldName - Database field name
 * @param years - Number of years to look back
 * @returns Sequelize where clause object
 * 
 * @example
 * ```ts
 * const where = {
 *   ...getLastNYearsFilter('createdAt', 2), // Last 2 years
 * };
 * ```
 */
export function getLastNYearsFilter(fieldName: string, years: number): Record<string, any> {
  const { start, end } = getLastNYears(years);
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get Sequelize where clause for date greater than or equal to
 * 
 * @param fieldName - Database field name
 * @param date - Date to compare against
 * @returns Sequelize where clause object
 */
export function getDateGteFilter(fieldName: string, date: Date | string): Record<string, any> {
  return {
    [fieldName]: {
      [Op.gte]: parseDate(date),
    },
  };
}

/**
 * Get Sequelize where clause for date less than or equal to
 * 
 * @param fieldName - Database field name
 * @param date - Date to compare against
 * @returns Sequelize where clause object
 */
export function getDateLteFilter(fieldName: string, date: Date | string): Record<string, any> {
  return {
    [fieldName]: {
      [Op.lte]: parseDate(date),
    },
  };
}

/**
 * Get Sequelize where clause for date greater than
 * 
 * @param fieldName - Database field name
 * @param date - Date to compare against
 * @returns Sequelize where clause object
 */
export function getDateGtFilter(fieldName: string, date: Date | string): Record<string, any> {
  return {
    [fieldName]: {
      [Op.gt]: parseDate(date),
    },
  };
}

/**
 * Get Sequelize where clause for date less than
 * 
 * @param fieldName - Database field name
 * @param date - Date to compare against
 * @returns Sequelize where clause object
 */
export function getDateLtFilter(fieldName: string, date: Date | string): Record<string, any> {
  return {
    [fieldName]: {
      [Op.lt]: parseDate(date),
    },
  };
}

/**
 * Get today's date range filter
 * 
 * @param fieldName - Database field name
 * @returns Sequelize where clause object
 */
export function getTodayFilter(fieldName: string): Record<string, any> {
  const start = getStartOfDay();
  const end = getEndOfDay();
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get yesterday's date range filter
 * 
 * @param fieldName - Database field name
 * @returns Sequelize where clause object
 */
export function getYesterdayFilter(fieldName: string): Record<string, any> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const start = getStartOfDay(yesterday);
  const end = getEndOfDay(yesterday);
  return getDateRangeFilter(fieldName, start, end);
}

/**
 * Get this week's date range filter (Monday to Sunday)
 * 
 * @param fieldName - Database field name
 * @returns Sequelize where clause object
 */
export function getThisWeekFilter(fieldName: string): Record<string, any> {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return getDateRangeFilter(fieldName, monday, sunday);
}

/**
 * Get this year's date range filter
 * 
 * @param fieldName - Database field name
 * @returns Sequelize where clause object
 */
export function getThisYearFilter(fieldName: string): Record<string, any> {
  return getYearFilter(fieldName);
}

/**
 * Get this month's date range filter
 * 
 * @param fieldName - Database field name
 * @returns Sequelize where clause object
 */
export function getThisMonthFilter(fieldName: string): Record<string, any> {
  return getMonthFilter(fieldName);
}

/**
 * Get this quarter's date range filter
 * 
 * @param fieldName - Database field name
 * @returns Sequelize where clause object
 */
export function getThisQuarterFilter(fieldName: string): Record<string, any> {
  return getQuarterFilter(fieldName);
}

/**
 * Get last week's date range filter (previous week, Monday to Sunday)
 * 
 * @param fieldName - Database field name
 * @returns Sequelize where clause object
 */
export function getLastWeekFilter(fieldName: string): Record<string, any> {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // This Monday
  const lastMonday = new Date(now.setDate(diff - 7)); // Previous Monday
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);
  return getDateRangeFilter(fieldName, lastMonday, lastSunday);
}

/**
 * Get last month's date range filter (previous month)
 * 
 * @param fieldName - Database field name
 * @returns Sequelize where clause object
 */
export function getLastMonthFilter(fieldName: string): Record<string, any> {
  const now = new Date();
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return getMonthFilter(fieldName, lastMonthYear, lastMonth + 1);
}

/**
 * Get last quarter's date range filter (previous quarter)
 * 
 * @param fieldName - Database field name
 * @returns Sequelize where clause object
 */
export function getLastQuarterFilter(fieldName: string): Record<string, any> {
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const lastQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
  const lastQuarterYear = currentQuarter === 1 ? now.getFullYear() - 1 : now.getFullYear();
  return getQuarterFilter(fieldName, lastQuarterYear, lastQuarter);
}

/**
 * Get last year's date range filter (previous year)
 * 
 * @param fieldName - Database field name
 * @returns Sequelize where clause object
 */
export function getLastYearFilter(fieldName: string): Record<string, any> {
  const lastYear = new Date().getFullYear() - 1;
  return getYearFilter(fieldName, lastYear);
}

