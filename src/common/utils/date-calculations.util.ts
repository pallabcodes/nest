/**
 * Date Calculations Utility
 *
 * Core date calculation functions (start/end of periods).
 * Separated from date filters for better organization.
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
  const d = new Date(year ?? now.getFullYear(), month ?? now.getMonth(), 1, 0, 0, 0, 0);
  return d;
}

/**
 * Get end of month (last day, 23:59:59.999)
 */
export function getEndOfMonth(year?: number, month?: number): Date {
  const now = new Date();
  const d = new Date(year ?? now.getFullYear(), (month ?? now.getMonth()) + 1, 0, 23, 59, 59, 999);
  return d;
}

/**
 * Get start of year (first day, 00:00:00.000)
 */
export function getStartOfYear(year?: number): Date {
  const now = new Date();
  const d = new Date(year ?? now.getFullYear(), 0, 1, 0, 0, 0, 0);
  return d;
}

/**
 * Get end of year (last day, 23:59:59.999)
 */
export function getEndOfYear(year?: number): Date {
  const now = new Date();
  const d = new Date(year ?? now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return d;
}

/**
 * Parse date from string with multiple format support
 */
export function parseDate(dateInput: Date | string | number): Date {
  if (dateInput instanceof Date) {
    return new Date(dateInput);
  }

  if (typeof dateInput === 'number') {
    return new Date(dateInput);
  }

  if (typeof dateInput === 'string') {
    if (dateInput.includes('T') || dateInput.includes('Z')) {
      return new Date(dateInput);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return new Date(`${dateInput}T00:00:00.000Z`);
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput)) {
      return new Date(dateInput);
    }

    const parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  throw new Error(`Invalid date format: ${dateInput}`);
}

/**
 * Get last N months date range
 */
export function getLastNMonths(months: number): DateRange {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);

  return { start, end };
}

/**
 * Get this quarter date range
 */
export function getThisQuarter(): DateRange {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const startMonth = quarter * 3;
  const endMonth = startMonth + 3;

  const start = getStartOfMonth(now.getFullYear(), startMonth);
  const end = getEndOfMonth(now.getFullYear(), endMonth - 1);

  return { start, end };
}

/**
 * Get last quarter date range
 */
export function getLastQuarter(): DateRange {
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
  const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const startMonth = lastQuarter * 3;
  const endMonth = startMonth + 3;

  const start = getStartOfMonth(year, startMonth);
  const end = getEndOfMonth(year, endMonth - 1);

  return { start, end };
}
