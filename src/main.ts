import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Bootstrap } from '@common/bootstrap/app-bootstrap';

class StartupApplication {
  static async start(): Promise<void> {
    try {
      // Create the NestJS application instance using Fastify http adapter
      const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
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
void StartupApplication.start();
