import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Log Cleanup Service
 *
 * Handles scheduled deletion of old log files.
 * Separated from LoggerService for better single responsibility.
 */
@Injectable()
export class LogCleanupService {
  private readonly logger = new Logger(LogCleanupService.name);
  private deletionInterval: NodeJS.Timeout | null = null;

  /**
   * Setup scheduled deletion
   */
  setupScheduledDeletion(logDirectory: string, deletionSchedule: string, winstonLogger: any): void {
    const scheduleMs = this.parseDeletionSchedule(deletionSchedule);
    if (!scheduleMs) {
      winstonLogger.warn(
        `Invalid deletion schedule: ${deletionSchedule}. Skipping scheduled deletion.`,
      );
      return;
    }

    this.deleteOldLogs(logDirectory, deletionSchedule, winstonLogger);
    this.deletionInterval = setInterval(() => {
      this.deleteOldLogs(logDirectory, deletionSchedule, winstonLogger);
    }, scheduleMs);

    winstonLogger.info(`Scheduled log deletion enabled: ${deletionSchedule}`);
  }

  /**
   * Parse deletion schedule string (e.g., "1w", "2d", "3m")
   */
  private parseDeletionSchedule(schedule: string): number | null {
    const match = schedule.match(/^(\d+)([dwmy])$/);
    if (!match) {
      return null;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      d: 24 * 60 * 60 * 1000, // days
      w: 7 * 24 * 60 * 60 * 1000, // weeks
      m: 30 * 24 * 60 * 60 * 1000, // months (approximate)
      y: 365 * 24 * 60 * 60 * 1000, // years
    };

    return value * (multipliers[unit] || 0);
  }

  /**
   * Delete old log files
   */
  private deleteOldLogs(logDirectory: string, deletionSchedule: string, winstonLogger: any): void {
    try {
      const files = fs.readdirSync(logDirectory);
      const now = Date.now();
      const scheduleMs = this.parseDeletionSchedule(deletionSchedule);

      if (!scheduleMs) {
        return;
      }

      files.forEach((file) => {
        const filePath = path.join(logDirectory, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > scheduleMs) {
          fs.unlinkSync(filePath);
          winstonLogger.debug(`Deleted old log file: ${file}`);
        }
      });
    } catch (error) {
      winstonLogger.error('Error deleting old logs:', error);
    }
  }

  /**
   * Cleanup interval on module destroy
   */
  onModuleDestroy(): void {
    if (this.deletionInterval) {
      clearInterval(this.deletionInterval);
    }
  }
}
