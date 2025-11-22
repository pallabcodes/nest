import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Bootstrap } from '@common/bootstrap/app-bootstrap';

/**
 * Application Bootstrap Class
 * Encapsulates the complete startup process in a structured, testable way
 */
class BootStrap {
  /**
   * Main application bootstrap method
   * Orchestrates the entire application startup process with proper error handling
   */
  static async start(): Promise<void> {
    try {
      // Create the NestJS application instance
      const app = await NestFactory.create(AppModule);
      const configService = app.get(ConfigService);

      // Initialize the bootstrap class with dependency injection
      const bootstrap = new Bootstrap(app, configService);

      // Configure the application (middleware, routes, services)
      bootstrap.configure();

      // Start the HTTP server
      await bootstrap.startServer();

      // Log startup information
      bootstrap.logStartupInfo();

      // Setup graceful shutdown handlers
      bootstrap.setupShutdownHandlers();
    } catch (error) {
      console.error('❌ Application startup failed:', error);
      process.exit(1);
    }
  }
}

// Start the application
void BootStrap.start();
