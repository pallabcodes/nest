/**
 * BEFORE vs AFTER Examples
 * 
 * Real code examples showing time savings in interview scenarios
 */

// ============================================================================
// EXAMPLE 1: Simple "This Month" Filter
// ============================================================================

// ❌ BEFORE: Manual calculation (5-7 minutes)
export class ProductRepository_BEFORE {
  async findAddedThisMonth() {
    // Think: "How do I get start of month?"
    // Research: "setDate(1) sets to first day"
    // Think: "What about time? Should be 00:00:00"
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    // Think: "Is Op.gte correct? Should I use between?"
    // Think: "What about end of month? Do I need it?"
    return this.productModel.findAll({
      where: {
        createdAt: {
          [Op.gte]: thisMonthStart,
        },
      },
    });
  }
}

// ✅ AFTER: One line (30 seconds)
import { getThisMonthFilter } from '@/common/utils/date.util';

export class ProductRepository_AFTER {
  async findAddedThisMonth() {
    return this.productModel.findAll({
      where: {
        ...getThisMonthFilter('createdAt'),
      },
    });
  }
}

// ============================================================================
// EXAMPLE 2: Quarter Filter
// ============================================================================

// ❌ BEFORE: Complex quarter calculation (8-10 minutes)
export class ProductRepository_BEFORE_Q2 {
  async findAddedInQ2_2024() {
    // Think: "Q2 is April, May, June"
    // Think: "Month is 0-indexed, so April is 3"
    // Think: "Wait, is that right? Let me double check..."
    const startDate = new Date(2024, 3, 1); // April 1
    startDate.setHours(0, 0, 0, 0);
    
    // Think: "End is June 30, but month 6 is July..."
    // Think: "I need last day of June, so month 6, day 0"
    // Think: "Actually, new Date(2024, 6, 0) gives last day of May"
    // Think: "Wait, let me recalculate..."
    const endDate = new Date(2024, 6, 0); // Last day of June
    endDate.setHours(23, 59, 59, 999);
    
    // Debug: "Why isn't this working? Oh, I had the month wrong"
    return this.productModel.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
    });
  }
}

// ✅ AFTER: Simple and clear (30 seconds)
import { getQuarterFilter } from '@/common/utils/date.util';

export class ProductRepository_AFTER_Q2 {
  async findAddedInQ2_2024() {
    return this.productModel.findAll({
      where: {
        ...getQuarterFilter('createdAt', 2024, 2), // Year, Quarter - clear!
      },
    });
  }
}

// ============================================================================
// EXAMPLE 3: Complex Query with Multiple Date Filters
// ============================================================================

// ❌ BEFORE: 20-25 minutes of date logic
export class AnalyticsService_BEFORE {
  async getDashboardStats() {
    const stats: any = {};
    
    // Today (3 min)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    stats.today = await this.orderModel.count({
      where: {
        createdAt: {
          [Op.between]: [todayStart, todayEnd],
        },
      },
    });
    
    // This Week (5 min)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    stats.thisWeek = await this.orderModel.count({
      where: {
        createdAt: {
          [Op.between]: [monday, sunday],
        },
      },
    });
    
    // This Month (3 min)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date();
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23, 59, 59, 999);
    stats.thisMonth = await this.orderModel.count({
      where: {
        createdAt: {
          [Op.between]: [monthStart, monthEnd],
        },
      },
    });
    
    // This Quarter (5 min)
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const quarterStartMonth = (quarter - 1) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
    quarterStart.setHours(0, 0, 0, 0);
    const quarterEndMonth = quarter * 3;
    const quarterEnd = new Date(now.getFullYear(), quarterEndMonth, 0);
    quarterEnd.setHours(23, 59, 59, 999);
    stats.thisQuarter = await this.orderModel.count({
      where: {
        createdAt: {
          [Op.between]: [quarterStart, quarterEnd],
        },
      },
    });
    
    // Last 7 Days (2 min)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    stats.last7Days = await this.orderModel.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo,
        },
      },
    });
    
    // Test and debug (5-7 min)
    return stats;
  }
}

// ✅ AFTER: 3-5 minutes total
import {
  getTodayFilter,
  getThisWeekFilter,
  getThisMonthFilter,
  getThisQuarterFilter,
  getLastNDaysFilter,
} from '@/common/utils/date.util';

export class AnalyticsService_AFTER {
  async getDashboardStats() {
    const [today, thisWeek, thisMonth, thisQuarter, last7Days] = await Promise.all([
      this.orderModel.count({ where: getTodayFilter('createdAt') }),
      this.orderModel.count({ where: getThisWeekFilter('createdAt') }),
      this.orderModel.count({ where: getThisMonthFilter('createdAt') }),
      this.orderModel.count({ where: getThisQuarterFilter('createdAt') }),
      this.orderModel.count({ where: getLastNDaysFilter('createdAt', 7) }),
    ]);
    
    return {
      today,
      thisWeek,
      thisMonth,
      thisQuarter,
      last7Days,
    };
  }
}

// ============================================================================
// EXAMPLE 4: Query Parameter Handling
// ============================================================================

// ❌ BEFORE: 15-20 minutes of parsing and validation
export class ProductController_BEFORE {
  async findAll(@Query() query: any) {
    const where: any = {};
    
    // Handle date range (7-10 min)
    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      
      // Validate (2 min)
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid date format');
      }
      
      // Set times (2 min)
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      // Validate range (1 min)
      if (startDate > endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
      
      where.createdAt = {
        [Op.between]: [startDate, endDate],
      };
    }
    
    // Handle month (4-5 min)
    if (query.month) {
      const year = query.year || new Date().getFullYear();
      const month = parseInt(query.month);
      
      if (month < 1 || month > 12) {
        throw new BadRequestException('Invalid month');
      }
      
      const start = new Date(year, month - 1, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(year, month, 0);
      end.setHours(23, 59, 59, 999);
      
      where.createdAt = {
        [Op.between]: [start, end],
      };
    }
    
    // Handle quarter (4-5 min)
    if (query.quarter) {
      const year = query.year || new Date().getFullYear();
      const quarter = parseInt(query.quarter);
      
      if (quarter < 1 || quarter > 4) {
        throw new BadRequestException('Invalid quarter');
      }
      
      const monthStart = (quarter - 1) * 3;
      const start = new Date(year, monthStart, 1);
      start.setHours(0, 0, 0, 0);
      const monthEnd = quarter * 3;
      const end = new Date(year, monthEnd, 0);
      end.setHours(23, 59, 59, 999);
      
      where.createdAt = {
        [Op.between]: [start, end],
      };
    }
    
    return this.productService.findAll({ where });
  }
}

// ✅ AFTER: 2-3 minutes
import {
  getDateRangeFilter,
  getMonthFilter,
  getQuarterFilter,
} from '@/common/utils/date.util';

export class ProductController_AFTER {
  async findAll(@Query() query: any) {
    const where: any = {};
    
    if (query.startDate && query.endDate) {
      Object.assign(where, getDateRangeFilter('createdAt', query.startDate, query.endDate));
    } else if (query.month) {
      Object.assign(where, getMonthFilter('createdAt', query.year, query.month));
    } else if (query.quarter) {
      Object.assign(where, getQuarterFilter('createdAt', query.year, query.quarter));
    }
    
    return this.productService.findAll({ where });
  }
}

// ============================================================================
// EXAMPLE 5: Real Interview Task
// ============================================================================

/**
 * TASK: "Build an analytics endpoint that returns:
 * - Products added today
 * - Products added this week  
 * - Products added this month
 * - Products added this quarter
 * - Products added in a custom date range (from query params)
 * - Products added in last N days (from query params)"
 */

// ❌ WITHOUT UTILITY: 45-60 minutes
export class ProductAnalyticsController_BEFORE {
  async getAnalytics(@Query() query: any) {
    const result: any = {};
    
    // Today (3 min)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    result.today = await this.productModel.count({
      where: { createdAt: { [Op.between]: [todayStart, todayEnd] } },
    });
    
    // This Week (5 min) - complex calculation
    // ... (see Example 3)
    
    // This Month (3 min)
    // ... (see Example 1)
    
    // This Quarter (5 min)
    // ... (see Example 2)
    
    // Custom Date Range (7 min)
    if (query.startDate && query.endDate) {
      // ... validation and parsing
    }
    
    // Last N Days (3 min)
    if (query.days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(query.days));
      daysAgo.setHours(0, 0, 0, 0);
      result.lastNDays = await this.productModel.count({
        where: { createdAt: { [Op.gte]: daysAgo } },
      });
    }
    
    // Testing and debugging: 10-15 min
    return result;
  }
}

// ✅ WITH UTILITY: 8-12 minutes
import {
  getTodayFilter,
  getThisWeekFilter,
  getThisMonthFilter,
  getThisQuarterFilter,
  getDateRangeFilter,
  getLastNDaysFilter,
} from '@/common/utils/date.util';

export class ProductAnalyticsController_AFTER {
  async getAnalytics(@Query() query: any) {
    const [today, thisWeek, thisMonth, thisQuarter] = await Promise.all([
      this.productModel.count({ where: getTodayFilter('createdAt') }),
      this.productModel.count({ where: getThisWeekFilter('createdAt') }),
      this.productModel.count({ where: getThisMonthFilter('createdAt') }),
      this.productModel.count({ where: getThisQuarterFilter('createdAt') }),
    ]);
    
    const result: any = {
      today,
      thisWeek,
      thisMonth,
      thisQuarter,
    };
    
    // Custom date range - one line
    if (query.startDate && query.endDate) {
      result.customRange = await this.productModel.count({
        where: getDateRangeFilter('createdAt', query.startDate, query.endDate),
      });
    }
    
    // Last N days - one line
    if (query.days) {
      result.lastNDays = await this.productModel.count({
        where: getLastNDaysFilter('createdAt', parseInt(query.days)),
      });
    }
    
    return result;
  }
}

// ============================================================================
// TIME COMPARISON SUMMARY
// ============================================================================

/**
 * Example 1 (This Month):     5-7 min  →  30 sec   (Saved: ~5 min)
 * Example 2 (Quarter):        8-10 min →  30 sec   (Saved: ~8 min)
 * Example 3 (Dashboard):      20-25 min → 3-5 min  (Saved: ~20 min)
 * Example 4 (Query Params):   15-20 min → 2-3 min  (Saved: ~15 min)
 * Example 5 (Full Task):      45-60 min → 8-12 min (Saved: ~40 min)
 * 
 * TOTAL TIME SAVED: ~88 minutes
 * 
 * In a 2-hour interview, that's almost HALF THE TIME saved!
 */

