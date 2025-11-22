import { Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import type { TransactionOptions } from './transaction.util';

/**
 * Transaction Retry Handler
 *
 * Handles retry logic for deadlock scenarios.
 * Separated from TransactionUtil for better single responsibility.
 */
export class TransactionRetryHandler {
  private readonly logger = new Logger(TransactionRetryHandler.name);

  /**
   * Execute transaction with retry logic for deadlocks
   */
  async executeWithRetry<T>(
    executeTransaction: (attempt: number) => Promise<T>,
    options: {
      isolationLevel?: Transaction.ISOLATION_LEVELS;
      operationName: string;
      maxRetries: number;
      startTime: number;
    },
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      try {
        return await executeTransaction(attempt);
      } catch (error: any) {
        lastError = error;

        const isDeadlock =
          error?.name === 'SequelizeDatabaseError' &&
          (error?.message?.includes('Deadlock') ||
            error?.message?.includes('deadlock') ||
            error?.original?.code === '40001' ||
            error?.original?.code === '40P01');

        if (!isDeadlock || attempt === options.maxRetries) {
          throw error;
        }

        const waitTime = Math.min(100 * Math.pow(2, attempt - 1), 1000);
        this.logger.warn(
          `Transaction deadlock detected for "${options.operationName}". Retrying (${attempt}/${options.maxRetries}) after ${waitTime}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    throw lastError || new Error('Transaction failed after retries');
  }

  /**
   * Check if error is a deadlock
   */
  isDeadlockError(error: any): boolean {
    return (
      error?.name === 'SequelizeDatabaseError' &&
      (error?.message?.includes('Deadlock') ||
        error?.message?.includes('deadlock') ||
        error?.original?.code === '40001' ||
        error?.original?.code === '40P01')
    );
  }
}
