import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize, Transaction } from 'sequelize';
import { TransactionRetryHandler } from './transaction-retry.handler';

export interface TransactionOptions {
  isolationLevel?: Transaction.ISOLATION_LEVELS;
  operationName?: string;
  retryOnDeadlock?: boolean;
  maxRetries?: number;
}

/**
 * Transaction utility helper with logging, metrics, and error tracking
 */
@Injectable()
export class TransactionUtil {
  private readonly logger = new Logger(TransactionUtil.name);
  private readonly retryHandler: TransactionRetryHandler;
  private transactionMetrics = {
    total: 0,
    successful: 0,
    failed: 0,
    totalDuration: 0,
  };

  constructor(
    @InjectConnection()
    private readonly sequelize: Sequelize,
  ) {
    this.retryHandler = new TransactionRetryHandler();
  }

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

    if (retryOnDeadlock) {
      return this.retryHandler.executeWithRetry(
        (attempt) =>
          this.executeTransaction(callback, {
            isolationLevel,
            operationName,
            startTime,
            attempt,
          }),
        {
          isolationLevel,
          operationName,
          maxRetries,
          startTime,
        },
      );
    }

    return this.executeTransaction(callback, {
      isolationLevel,
      operationName,
      startTime,
    });
  }

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

    const logPrefix = attempt ? `[${operationName}] (attempt ${attempt})` : `[${operationName}]`;

    try {
      this.logger.debug(`${logPrefix} Transaction started`);

      const result = await callback(transaction);
      await transaction.commit();

      const duration = Date.now() - startTime;
      this.transactionMetrics.successful++;
      this.transactionMetrics.totalDuration += duration;

      this.logger.log(`${logPrefix} Transaction committed successfully (${duration}ms)`);

      return result;
    } catch (error: any) {
      await transaction.rollback();

      const duration = Date.now() - startTime;
      this.transactionMetrics.failed++;
      this.transactionMetrics.totalDuration += duration;

      this.logger.error(`${logPrefix} Transaction rolled back after ${duration}ms`, {
        error: error?.message,
        stack: error?.stack,
        operation: operationName,
      });

      throw error;
    }
  }

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

  async getTransaction(): Promise<Transaction> {
    return this.sequelize.transaction();
  }

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
          ? `${((this.transactionMetrics.successful / this.transactionMetrics.total) * 100).toFixed(
              2,
            )}%`
          : '0%',
    };
  }

  resetMetrics() {
    this.transactionMetrics = {
      total: 0,
      successful: 0,
      failed: 0,
      totalDuration: 0,
    };
  }
}
