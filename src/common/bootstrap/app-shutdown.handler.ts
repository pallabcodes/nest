import { INestApplication, Logger } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

export class AppShutdownHandler {
  private readonly logger = new Logger(AppShutdownHandler.name);
  private readonly shutdownTimeout = 30000; // 30 seconds
  private static isShuttingDown = false;
  private static handlersRegistered = false;

  private constructor(private readonly app: INestApplication) {
    this.setupSignalHandlers();
    this.setupErrorHandlers();
  }

  static handle(app: INestApplication): AppShutdownHandler {
    return new AppShutdownHandler(app);
  }


  private setupSignalHandlers(): void {
    // Prevent duplicate handler registration
    if (AppShutdownHandler.handlersRegistered) {
      return;
    }
    AppShutdownHandler.handlersRegistered = true;

    // In development, SIGTERM is usually from watch mode - exit immediately
    // In production, SIGTERM should do graceful shutdown
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      process.once('SIGTERM', () => this.shutdown('SIGTERM'));
    } else {
      // Development mode: SIGTERM = watch mode restart, exit immediately
      process.once('SIGTERM', () => {
        process.exit(0);
      });
    }

    // Handle SIGINT (Ctrl+C) - always do graceful shutdown
    process.on('SIGINT', () => {
      if (AppShutdownHandler.isShuttingDown) {
        // Second Ctrl+C - force exit immediately
        console.log('\nForce exit...');
        process.exit(1);
      } else {
        this.shutdown('SIGINT');
      }
    });
  }

  private setupErrorHandlers(): void {
    process.on('uncaughtException', (error: Error) => {
      this.logger.error('Uncaught Exception:', error.stack);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  private async shutdown(signal: string): Promise<void> {
    // Prevent multiple shutdown attempts
    if (AppShutdownHandler.isShuttingDown) {
      return;
    }
    AppShutdownHandler.isShuttingDown = true;

    // Graceful shutdown for SIGINT (user-initiated)
    console.log(`\n${signal} received. Shutting down gracefully...`);

    const shutdownTimer = setTimeout(() => {
      console.error('\nForced shutdown after timeout');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Close database and HTTP server in parallel for faster shutdown
      await Promise.all([
        this.closeDatabaseConnections(),
        this.closeHttpServer(),
      ]);

      clearTimeout(shutdownTimer);
      this.logger.log('Application shut down successfully');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }

  private async closeHttpServer(): Promise<void> {
    try {
      await this.app.close();
    } catch (error: any) {
      this.logger.warn('Error closing HTTP server:', error?.message || error);
    }
  }

  private async closeDatabaseConnections(): Promise<void> {
    try {
      // For Sequelize-based applications, try to get and close the database connection
      const connectionToken = getConnectionToken();

      try {
        // Try to get the Sequelize instance from the DI container
      const sequelize = this.app.get<Sequelize>(connectionToken, { strict: false });

      if (sequelize && typeof sequelize.close === 'function') {
        await sequelize.close();
          this.logger.debug('Sequelize database connections closed successfully');
          return;
        }
      } catch (error: any) {
        // Sequelize connection not found in DI container
        if (error?.message?.includes('does not exist') || error?.name === 'UnknownElementException') {
          this.logger.debug('No Sequelize connection found in DI container');
          return;
        }
        throw error; // Re-throw unexpected errors
      }

      this.logger.debug('Sequelize connection not available or already closed');
    } catch (error: any) {
      // Handle any unexpected errors during database closure
      this.logger.warn('Error closing database connections:', error?.message || error);
    }
  }
}
