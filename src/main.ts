import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from './app.module';
import { Bootstrap } from '@common/bootstrap/app-bootstrap';

function registerStripeWebhookRawBody(app: NestExpressApplication): void {
  // Stripe requires the exact raw request body for webhook signature verification.
  // We attach Express' raw body parser only to the webhook route so that:
  // 1) /payments/webhook sees req.body as a Buffer
  // 2) all other routes keep using the standard JSON body parser.
  app.use(
    '/payments/webhook',
    express.raw({ type: 'application/json' }),
  );
}

class StartupApplication {
  static async start(): Promise<void> {
    try {
      // Create the NestJS application instance using the default Express adapter
      const app = await NestFactory.create<NestExpressApplication>(AppModule);

      // Register raw body parser only for Stripe webhook route
      registerStripeWebhookRawBody(app);
      
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
