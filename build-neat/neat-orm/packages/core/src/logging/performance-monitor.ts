/**
 * Performance Monitor
 *
 * Monitors query performance, detects issues, and provides insights.
 * Tracks metrics like query count, execution time, and connection pool usage.
 *
 * @module logging/performance-monitor
 */

/**
 * Performance metrics.
 */
export interface PerformanceMetrics {
  /**
   * Queries per second.
   */
  queriesPerSecond: number;

  /**
   * Average query execution time.
   */
  avgQueryTime: number;

  /**
   * P50 (median) query time.
   */
  p50QueryTime: number;

  /**
   * P95 query time.
   */
  p95QueryTime: number;

  /**
   * P99 query time.
   */
  p99QueryTime: number;

  /**
   * Connection pool usage percentage.
   */
  poolUsage: number;

  /**
   * Active connections.
   */
  activeConnections: number;

  /**
   * Idle connections.
   */
  idleConnections: number;

  /**
   * Failed queries percentage.
   */
  failureRate: number;

  /**
   * Cache hit rate percentage.
   */
  cacheHitRate: number;

  /**
   * Slow queries count.
   */
  slowQueriesCount: number;
}

/**
 * Performance alert.
 */
export interface PerformanceAlert {
  /**
   * Alert severity.
   */
  severity: 'info' | 'warning' | 'critical';

  /**
   * Alert message.
   */
  message: string;

  /**
   * Metric that triggered the alert.
   */
  metric: string;

  /**
   * Current value.
   */
  value: number;

  /**
   * Threshold value.
   */
  threshold: number;

  /**
   * Timestamp.
   */
  timestamp: Date;

  /**
   * Suggested action.
   */
  suggestion?: string;
}

/**
 * Performance monitor options.
 */
export interface PerformanceMonitorOptions {
  /**
   * Slow query threshold in milliseconds.
   * Default: 1000
   */
  slowQueryThreshold?: number;

  /**
   * Alert threshold for queries per second.
   * Default: 1000
   */
  qpsThreshold?: number;

  /**
   * Alert threshold for pool usage percentage.
   * Default: 80
   */
  poolUsageThreshold?: number;

  /**
   * Alert threshold for failure rate percentage.
   * Default: 5
   */
  failureRateThreshold?: number;

  /**
   * Alert handler.
   */
  onAlert?: (alert: PerformanceAlert) => void;

  /**
   * Metrics collection interval in milliseconds.
   * Default: 60000 (1 minute)
   */
  metricsInterval?: number;
}

/**
 * Query timing data.
 */
interface QueryTiming {
  executionTime: number;
  timestamp: number;
  success: boolean;
  cached: boolean;
}

/**
 * Performance monitor for tracking database performance.
 */
export class PerformanceMonitor {
  private timings: QueryTiming[] = [];
  private alerts: PerformanceAlert[] = [];
  private options: Required<Omit<PerformanceMonitorOptions, 'onAlert'>> & {
    onAlert?: (alert: PerformanceAlert) => void;
  };
  private metricsIntervalId?: ReturnType<typeof setInterval>;

  constructor(options: PerformanceMonitorOptions = {}) {
    this.options = {
      slowQueryThreshold: options.slowQueryThreshold || 1000,
      qpsThreshold: options.qpsThreshold || 1000,
      poolUsageThreshold: options.poolUsageThreshold || 80,
      failureRateThreshold: options.failureRateThreshold || 5,
      metricsInterval: options.metricsInterval || 60000,
      onAlert: options.onAlert,
    };
  }

  /**
   * Start monitoring.
   */
  start(): void {
    this.metricsIntervalId = setInterval(() => {
      this.checkThresholds();
      this.cleanupOldTimings();
    }, this.options.metricsInterval);
  }

  /**
   * Stop monitoring.
   */
  stop(): void {
    if (this.metricsIntervalId) {
      clearInterval(this.metricsIntervalId);
      this.metricsIntervalId = undefined;
    }
  }

  /**
   * Record a query execution.
   */
  recordQuery(
    executionTime: number,
    success: boolean = true,
    cached: boolean = false
  ): void {
    this.timings.push({
      executionTime,
      timestamp: Date.now(),
      success,
      cached,
    });

    // Check for slow query
    if (executionTime > this.options.slowQueryThreshold) {
      this.createAlert('warning', 'Slow query detected', 'queryTime', executionTime, this.options.slowQueryThreshold, 'Consider optimizing the query or adding indexes');
    }
  }

  /**
   * Get current performance metrics.
   */
  getMetrics(windowMs: number = 60000): PerformanceMetrics {
    const now = Date.now();
    const recentTimings = this.timings.filter(t => now - t.timestamp < windowMs);

    if (recentTimings.length === 0) {
      return {
        queriesPerSecond: 0,
        avgQueryTime: 0,
        p50QueryTime: 0,
        p95QueryTime: 0,
        p99QueryTime: 0,
        poolUsage: 0,
        activeConnections: 0,
        idleConnections: 0,
        failureRate: 0,
        cacheHitRate: 0,
        slowQueriesCount: 0,
      };
    }

    const executionTimes = recentTimings.map(t => t.executionTime).sort((a, b) => a - b);
    const totalTime = executionTimes.reduce((sum, time) => sum + time, 0);
    const failedCount = recentTimings.filter(t => !t.success).length;
    const cachedCount = recentTimings.filter(t => t.cached).length;
    const slowCount = recentTimings.filter(t => t.executionTime > this.options.slowQueryThreshold).length;

    return {
      queriesPerSecond: recentTimings.length / (windowMs / 1000),
      avgQueryTime: totalTime / recentTimings.length,
      p50QueryTime: this.percentile(executionTimes, 50),
      p95QueryTime: this.percentile(executionTimes, 95),
      p99QueryTime: this.percentile(executionTimes, 99),
      poolUsage: 0, // Would be populated from connection pool stats
      activeConnections: 0, // Would be populated from connection pool
      idleConnections: 0, // Would be populated from connection pool
      failureRate: (failedCount / recentTimings.length) * 100,
      cacheHitRate: (cachedCount / recentTimings.length) * 100,
      slowQueriesCount: slowCount,
    };
  }

  /**
   * Get performance alerts.
   */
  getAlerts(severity?: 'info' | 'warning' | 'critical'): PerformanceAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return [...this.alerts];
  }

  /**
   * Clear alerts.
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get performance report.
   */
  getReport(windowMs: number = 60000): {
    metrics: PerformanceMetrics;
    alerts: PerformanceAlert[];
    summary: string;
  } {
    const metrics = this.getMetrics(windowMs);
    const alerts = this.getAlerts();

    const summary = this.generateSummary(metrics, alerts);

    return {
      metrics,
      alerts,
      summary,
    };
  }

  /**
   * Check thresholds and create alerts.
   *
   * @private
   */
  private checkThresholds(): void {
    const metrics = this.getMetrics();

    // Check QPS
    if (metrics.queriesPerSecond > this.options.qpsThreshold) {
      this.createAlert(
        'warning',
        'High queries per second',
        'qps',
        metrics.queriesPerSecond,
        this.options.qpsThreshold,
        'Consider scaling database or optimizing queries'
      );
    }

    // Check pool usage
    if (metrics.poolUsage > this.options.poolUsageThreshold) {
      this.createAlert(
        'warning',
        'High connection pool usage',
        'poolUsage',
        metrics.poolUsage,
        this.options.poolUsageThreshold,
        'Consider increasing pool size or optimizing connection usage'
      );
    }

    // Check failure rate
    if (metrics.failureRate > this.options.failureRateThreshold) {
      this.createAlert(
        'critical',
        'High query failure rate',
        'failureRate',
        metrics.failureRate,
        this.options.failureRateThreshold,
        'Investigate database connectivity or query errors'
      );
    }
  }

  /**
   * Create an alert.
   *
   * @private
   */
  private createAlert(
    severity: 'info' | 'warning' | 'critical',
    message: string,
    metric: string,
    value: number,
    threshold: number,
    suggestion?: string
  ): void {
    const alert: PerformanceAlert = {
      severity,
      message,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      suggestion,
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    if (this.options.onAlert) {
      this.options.onAlert(alert);
    }
  }

  /**
   * Clean up old timing data.
   *
   * @private
   */
  private cleanupOldTimings(): void {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const cutoff = Date.now() - maxAge;
    this.timings = this.timings.filter(t => t.timestamp > cutoff);
  }

  /**
   * Calculate percentile.
   *
   * @private
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Generate performance summary.
   *
   * @private
   */
  private generateSummary(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): string {
    const parts: string[] = [];

    parts.push(`Performance Summary:`);
    parts.push(`- QPS: ${metrics.queriesPerSecond.toFixed(2)}`);
    parts.push(`- Avg Query Time: ${metrics.avgQueryTime.toFixed(2)}ms`);
    parts.push(`- P95 Query Time: ${metrics.p95QueryTime.toFixed(2)}ms`);
    parts.push(`- Failure Rate: ${metrics.failureRate.toFixed(2)}%`);
    parts.push(`- Cache Hit Rate: ${metrics.cacheHitRate.toFixed(2)}%`);
    parts.push(`- Slow Queries: ${metrics.slowQueriesCount}`);

    if (alerts.length > 0) {
      parts.push(`\nAlerts:`);
      const criticalCount = alerts.filter(a => a.severity === 'critical').length;
      const warningCount = alerts.filter(a => a.severity === 'warning').length;
      parts.push(`- Critical: ${criticalCount}`);
      parts.push(`- Warning: ${warningCount}`);
    }

    return parts.join('\n');
  }
}

