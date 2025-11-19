import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize, Transaction } from 'sequelize';

export interface TransactionOptions {
  isolationLevel?: Transaction.ISOLATION_LEVELS;
  operationName?: string; // For logging/metrics
  retryOnDeadlock?: boolean; // Retry on deadlock errors
  maxRetries?: number; // Max retry attempts (default: 3)
}

/**
 * Transaction utility helper with logging, metrics, and error tracking
 * 
 * BENEFITS over inline sequelize.transaction():
 * 1. ✅ Transaction logging (start, commit, rollback with duration)
 * 2. ✅ Metrics tracking (success/failure rates, duration)
 * 3. ✅ Error context (which operation failed)
 * 4. ✅ Deadlock retry logic (optional)
 * 5. ✅ Consistent transaction patterns across modules
 */
@Injectable()
export class TransactionUtil {
  private readonly logger = new Logger(TransactionUtil.name);
  private transactionMetrics = {
    total: 0,
    successful: 0,
    failed: 0,
    totalDuration: 0,
  };

  constructor(
    @InjectConnection()
    private readonly sequelize: Sequelize,
  ) {}

  /**
   * Execute a function within a database transaction with logging and metrics
   * Automatically commits on success or rolls back on error
   *
   * @param callback - Function to execute within transaction
   * @param options - Transaction options (isolation level, operation name, retry logic)
   * @returns Promise resolving to the result of the callback
   *
   * @example
   * ```typescript
   * const result = await transactionUtil.execute(
   *   async (transaction) => {
   *     const user = await User.create({ ... }, { transaction });
   *     await UserRole.create({ userId: user.id, roleId: 1 }, { transaction });
   *     return user;
   *   },
   *   { operationName: 'registerUser', retryOnDeadlock: true }
   * );
   * ```
   */
  async execute<T>(
    callback: (transaction: Transaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const {
      isolationLevel,
      operationName = 'unknown',
      retryOnDeadlock = false,
      maxRetries = 3,
    } = options || {};

    const startTime = Date.now();
    this.transactionMetrics.total++;

    // Retry logic for deadlocks
    if (retryOnDeadlock) {
      return this.executeWithRetry(callback, {
        isolationLevel,
        operationName,
        maxRetries,
        startTime,
      });
    }

    // Standard execution with logging
    return this.executeTransaction(callback, {
      isolationLevel,
      operationName,
      startTime,
    });
  }

  /**
   * Execute transaction with retry logic for deadlocks
   */
  private async executeWithRetry<T>(
    callback: (transaction: Transaction) => Promise<T>,
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
        return await this.executeTransaction(callback, {
          isolationLevel: options.isolationLevel,
          operationName: options.operationName,
          startTime: options.startTime,
          attempt,
        });
      } catch (error: any) {
        lastError = error;

        // Check if it's a deadlock error
        const isDeadlock =
          error?.name === 'SequelizeDatabaseError' &&
          (error?.message?.includes('Deadlock') ||
            error?.message?.includes('deadlock') ||
            error?.original?.code === '40001' ||
            error?.original?.code === '40P01');

        if (!isDeadlock || attempt === options.maxRetries) {
          throw error;
        }

        // Wait before retry (exponential backoff)
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
   * Execute transaction with logging and metrics
   */
  private async executeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>,
    options: {
      isolationLevel?: Transaction.ISOLATION_LEVELS;
      operationName: string;
      startTime: number;
      attempt?: number;
    },
  ): Promise<T> {
    const { isolationLevel, operationName, startTime, attempt } = options;
    const transaction = await this.sequelize.transaction({
      isolationLevel,
    });

    const logPrefix = attempt
      ? `[${operationName}] (attempt ${attempt})`
      : `[${operationName}]`;

    try {
      this.logger.debug(`${logPrefix} Transaction started`);

      const result = await callback(transaction);
      await transaction.commit();

      const duration = Date.now() - startTime;
      this.transactionMetrics.successful++;
      this.transactionMetrics.totalDuration += duration;

      this.logger.log(
        `${logPrefix} Transaction committed successfully (${duration}ms)`,
      );

      return result;
    } catch (error: any) {
      await transaction.rollback();

      const duration = Date.now() - startTime;
      this.transactionMetrics.failed++;
      this.transactionMetrics.totalDuration += duration;

      this.logger.error(
        `${logPrefix} Transaction rolled back after ${duration}ms`,
        {
          error: error?.message,
          stack: error?.stack,
          operation: operationName,
        },
      );

      throw error;
    }
  }

  /**
   * Execute multiple operations sequentially within a transaction
   * Useful when operations depend on each other
   *
   * @param operations - Array of functions to execute sequentially
   * @param options - Transaction options
   * @returns Promise resolving to array of results
   */
  async executeSequential<T>(
    operations: Array<(transaction: Transaction) => Promise<T>>,
    options?: TransactionOptions,
  ): Promise<T[]> {
    return this.execute(
      async (transaction) => {
        const results: T[] = [];
        for (const operation of operations) {
          const result = await operation(transaction);
          results.push(result);
        }
        return results;
      },
      {
        ...options,
        operationName: options?.operationName || 'sequential',
      },
    );
  }

  /**
   * Get a new transaction instance (for manual management)
   * Note: You must manually commit or rollback
   *
   * @returns Promise resolving to a Transaction instance
   */
  async getTransaction(): Promise<Transaction> {
    return this.sequelize.transaction();
  }

  /**
   * Get transaction metrics
   * Useful for monitoring and debugging
   */
  getMetrics() {
    const avgDuration =
      this.transactionMetrics.total > 0
        ? this.transactionMetrics.totalDuration / this.transactionMetrics.total
        : 0;

    return {
      ...this.transactionMetrics,
      averageDuration: Math.round(avgDuration),
      successRate:
        this.transactionMetrics.total > 0
          ? (
              (this.transactionMetrics.successful /
                this.transactionMetrics.total) *
              100
            ).toFixed(2) + '%'
          : '0%',
    };
  }

  /**
   * Reset transaction metrics
   */
  resetMetrics() {
    this.transactionMetrics = {
      total: 0,
      successful: 0,
      failed: 0,
      totalDuration: 0,
    };
  }
}

