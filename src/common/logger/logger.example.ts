/**
 * Logger Usage Examples
 *
 * This file demonstrates how to use the LoggerService throughout the application.
 * The logger properly handles Error objects, extracting both message and stack trace.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Injectable()
export class ExampleService {
  constructor(private readonly logger: LoggerService) {}

  exampleBasicLogging() {
    // Basic logging
    this.logger.log('User logged in successfully');
    this.logger.warn('Rate limit approaching');
    this.logger.debug('Processing request data');
    this.logger.verbose('Detailed trace information');
  }

  exampleErrorLogging() {
    try {
      // Some operation that might fail
      throw new Error('Database connection failed');
    } catch (error) {
      // Method 1: Using logError (RECOMMENDED - shows both message and stack)
      // This is what you want for debugging - shows error.message AND error.stack
      this.logger.logError(error, 'Failed to connect to database', {
        userId: 123,
        operation: 'database-connection',
      });

      // Method 2: Using error() with Error object
      // Also shows stack trace properly
      if (error instanceof Error) {
        this.logger.error('Database error occurred', error, 'ExampleService');
      }

      // Method 3: Using error() with string (no stack trace)
      this.logger.error('Something went wrong', 'error-trace-string', 'ExampleService');
    }
  }

  exampleWithContext() {
    // Logging with custom context
    this.logger.logWithContext('info', 'Payment processed', {
      paymentId: 'pay_123',
      amount: 99.99,
      currency: 'USD',
      userId: 456,
    });

    // Error with context
    const error = new Error('Payment gateway timeout');
    this.logger.logError(error, 'Payment processing failed', {
      paymentId: 'pay_123',
      retryCount: 3,
      gateway: 'stripe',
    });
  }

  exampleRealWorldScenario() {
    try {
      // Simulate an API call
      const response = { data: 'some data' };
      this.logger.log('API call successful', 'ExampleService');
      return response;
    } catch (error) {
      // This will show:
      // - Error message: "API call failed"
      // - Stack trace: Full stack trace from error.stack
      // - Context: { endpoint: '/api/users', method: 'GET' }
      this.logger.logError(
        error instanceof Error ? error : new Error(String(error)),
        'API call failed',
        {
          endpoint: '/api/users',
          method: 'GET',
        },
      );
      throw error;
    }
  }
}

/**
 * Key Points:
 *
 * 1. Always use logError() for Error objects - it shows BOTH message and stack
 * 2. Pass Error objects directly - logger extracts message and stack automatically
 * 3. Add context as third parameter for better debugging
 * 4. No need to manually extract error.stack - logger does it for you
 *
 * Example Output in error.log:
 * {
 *   "message": "Database connection failed",
 *   "stack": "Error: Database connection failed\n    at ExampleService.exampleErrorLogging...",
 *   "context": {
 *     "userId": 123,
 *     "operation": "database-connection"
 *   },
 *   "timestamp": "2025-11-14 20:30:45"
 * }
 */
