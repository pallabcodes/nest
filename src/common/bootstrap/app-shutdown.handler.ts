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

    process.once('SIGTERM', () => this.shutdown('SIGTERM'));
    
    // Handle SIGINT - if already shutting down, force exit immediately
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

    // In development watch mode, NestJS sends SIGTERM to restart - this is normal
    const isWatchMode = process.env.NODE_ENV !== 'production' && process.argv.includes('--watch');
    
    // Log immediately (synchronous) so user sees feedback right away
    if (!isWatchMode) {
      console.log(`\n${signal} received. Shutting down...`);
    }

    const shutdownTimer = setTimeout(() => {
      console.error('\nForced shutdown after timeout');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Close database and HTTP server in parallel for faster shutdown
      await Promise.all([
        this.closeDatabaseConnections(),
        this.closeHttpServer()
      ]);

      clearTimeout(shutdownTimer);
      process.exit(0);
    } catch (error) {
      console.error('\nError during shutdown:', error);
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }

  private async closeHttpServer(): Promise<void> {
    await this.app.close();
    // Don't log here - we'll log a combined message after everything closes
  }

  private async closeDatabaseConnections(): Promise<void> {
    try {
      // Use getConnectionToken() to get the correct Sequelize connection token
      const connectionToken = getConnectionToken();
      const sequelize = this.app.get<Sequelize>(connectionToken, { strict: false });
      
      if (sequelize && typeof sequelize.close === 'function') {
        await sequelize.close();
        // Don't log here - we'll log a combined message after everything closes
      } else {
        this.logger.debug('Sequelize connection not available or already closed');
      }
    } catch (error: any) {
      // Silently handle if Sequelize is not available or already closed
      // This is expected if database module is not configured or connection doesn't exist
      if (error?.name === 'UnknownElementException' || error?.message?.includes('does not exist')) {
        this.logger.debug('Database connection not registered, skipping closure');
      } else {
        this.logger.warn('Error closing database connections:', error?.message || error);
      }
    }
  }
}