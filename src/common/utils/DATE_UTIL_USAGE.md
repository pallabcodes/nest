# Date Utility Usage Guide

Quick reference for using date filtering utilities in repositories during interviews.

## Import

```typescript
import {
  getDateRangeFilter,
  getMonthFilter,
  getQuarterFilter,
  getYearFilter,
  getLastNDaysFilter,
  getLastNMonthsFilter,
  getLastNQuartersFilter,
  getLastNYearsFilter,
  getTodayFilter,
  getThisMonthFilter,
  getThisQuarterFilter,
  getThisYearFilter,
  getDateGteFilter,
  getDateLteFilter,
} from '@/common/utils/date.util';
```

## Basic Usage in Repository

### Example 1: Filter by Date Range

```typescript
async findInDateRange(startDate: Date | string, endDate: Date | string) {
  return this.model.findAll({
    where: {
      ...getDateRangeFilter('createdAt', startDate, endDate),
      isActive: true,
    },
  });
}
```

### Example 2: Filter by Current Month

```typescript
async findThisMonth() {
  return this.model.findAll({
    where: {
      ...getThisMonthFilter('createdAt'),
      isActive: true,
    },
  });
}

// Or specific month/year
async findInMonth(year: number, month: number) {
  return this.model.findAll({
    where: {
      ...getMonthFilter('createdAt', year, month),
    },
  });
}
```

### Example 3: Filter by Quarter

```typescript
async findThisQuarter() {
  return this.model.findAll({
    where: {
      ...getThisQuarterFilter('createdAt'),
    },
  });
}

// Specific quarter
async findInQuarter(year: number, quarter: number) {
  return this.model.findAll({
    where: {
      ...getQuarterFilter('createdAt', year, quarter),
    },
  });
}
```

### Example 4: Filter by Year

```typescript
async findThisYear() {
  return this.model.findAll({
    where: {
      ...getThisYearFilter('createdAt'),
    },
  });
}

// Specific year
async findInYear(year: number) {
  return this.model.findAll({
    where: {
      ...getYearFilter('createdAt', year),
    },
  });
}
```

### Example 5: Last N Periods

```typescript
// Last 7 days
async findLast7Days() {
  return this.model.findAll({
    where: {
      ...getLastNDaysFilter('createdAt', 7),
    },
  });
}

// Last 3 months
async findLast3Months() {
  return this.model.findAll({
    where: {
      ...getLastNMonthsFilter('createdAt', 3),
    },
  });
}

// Last 2 quarters
async findLast2Quarters() {
  return this.model.findAll({
    where: {
      ...getLastNQuartersFilter('createdAt', 2),
    },
  });
}

// Last 2 years
async findLast2Years() {
  return this.model.findAll({
    where: {
      ...getLastNYearsFilter('createdAt', 2),
    },
  });
}
```

### Example 6: Combining with Other Filters

```typescript
async findAll(query?: any) {
  const where: any = {
    isActive: true,
  };

  // Add date filter if provided
  if (query.startDate && query.endDate) {
    Object.assign(where, getDateRangeFilter('createdAt', query.startDate, query.endDate));
  } else if (query.month) {
    Object.assign(where, getMonthFilter('createdAt', query.year, query.month));
  } else if (query.quarter) {
    Object.assign(where, getQuarterFilter('createdAt', query.year, query.quarter));
  } else if (query.year) {
    Object.assign(where, getYearFilter('createdAt', query.year));
  }

  // Add other filters
  if (query.name) {
    where.name = { [Op.like]: `%${query.name}%` };
  }

  return this.model.findAll({ where });
}
```

### Example 7: Greater Than / Less Than

```typescript
// Find records created after a date
async findAfterDate(date: Date | string) {
  return this.model.findAll({
    where: {
      ...getDateGteFilter('createdAt', date),
    },
  });
}

// Find records created before a date
async findBeforeDate(date: Date | string) {
  return this.model.findAll({
    where: {
      ...getDateLteFilter('createdAt', date),
    },
  });
}
```

### Example 8: Today / Yesterday

```typescript
async findToday() {
  return this.model.findAll({
    where: {
      ...getTodayFilter('createdAt'),
    },
  });
}

async findYesterday() {
  return this.model.findAll({
    where: {
      ...getYesterdayFilter('createdAt'),
    },
  });
}
```

## Real World Example: Product Repository

```typescript
import { getDateRangeFilter, getThisMonthFilter, getLastNMonthsFilter } from '@/common/utils/date.util';

@Injectable()
export class ProductRepository {
  // Before: Manual date calculation
  async findAddedThisMonth() {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    return this.productModel.findAll({
      where: {
        createdAt: { [Op.gte]: thisMonthStart },
      },
    });
  }

  // After: Using utility
  async findAddedThisMonth() {
    return this.productModel.findAll({
      where: {
        ...getThisMonthFilter('createdAt'),
      },
    });
  }

  // Date range query
  async findAddedInDateRange(startDate: Date | string, endDate: Date | string) {
    return this.productModel.findAll({
      where: {
        ...getDateRangeFilter('createdAt', startDate, endDate),
      },
    });
  }

  // Last 3 months
  async findAddedLast3Months() {
    return this.productModel.findAll({
      where: {
        ...getLastNMonthsFilter('createdAt', 3),
      },
    });
  }
}
```

## Available Functions

### Date Range Functions
- `getDateRangeFilter(fieldName, startDate, endDate)` - Custom date range
- `getTodayFilter(fieldName)` - Today only
- `getYesterdayFilter(fieldName)` - Yesterday only
- `getThisWeekFilter(fieldName)` - This week (Mon-Sun)

### Period Functions
- `getThisMonthFilter(fieldName)` - Current month
- `getThisQuarterFilter(fieldName)` - Current quarter
- `getThisYearFilter(fieldName)` - Current year

### Specific Period Functions
- `getMonthFilter(fieldName, year?, month?)` - Specific month
- `getQuarterFilter(fieldName, year?, quarter?)` - Specific quarter (1-4)
- `getYearFilter(fieldName, year?)` - Specific year

### Last N Periods Functions
- `getLastNDaysFilter(fieldName, days)` - Last N days
- `getLastNMonthsFilter(fieldName, months)` - Last N months
- `getLastNQuartersFilter(fieldName, quarters)` - Last N quarters
- `getLastNYearsFilter(fieldName, years)` - Last N years

### Comparison Functions
- `getDateGteFilter(fieldName, date)` - Greater than or equal
- `getDateLteFilter(fieldName, date)` - Less than or equal
- `getDateGtFilter(fieldName, date)` - Greater than
- `getDateLtFilter(fieldName, date)` - Less than

## Tips for Interviews

1. **Quick Setup**: Import and use immediately - no configuration needed
2. **Composable**: Works with spread operator to combine filters
3. **Type Safe**: Accepts both Date objects and date strings
4. **MySQL Compatible**: Works perfectly with MySQL 8+ and Sequelize
5. **Zero Dependencies**: Pure TypeScript functions

## Common Patterns

```typescript
// Pattern 1: Simple filter
const where = {
  ...getThisMonthFilter('createdAt'),
  isActive: true,
};

// Pattern 2: Conditional filter
const where: any = { isActive: true };
if (query.startDate && query.endDate) {
  Object.assign(where, getDateRangeFilter('createdAt', query.startDate, query.endDate));
}

// Pattern 3: Multiple date conditions (use AND logic)
const where = {
  ...getDateGteFilter('createdAt', startDate),
  ...getDateLteFilter('createdAt', endDate),
};
```

