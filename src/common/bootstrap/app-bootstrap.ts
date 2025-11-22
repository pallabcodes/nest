import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppBootstrapService } from './app-bootstrap.service';
import { AppShutdownHandler } from './app-shutdown.handler';

/**
 * Bootstrap class that encapsulates the entire application startup process
 * Provides a structured, testable way to initialize and start the application
 */
export class Bootstrap {
  private readonly app: INestApplication;
  private readonly configService: ConfigService;
  private readonly bootstrapService: AppBootstrapService;

  constructor(app: INestApplication, configService: ConfigService) {
    this.app = app;
    this.configService = configService;
    this.bootstrapService = AppBootstrapService.create(app, configService);
  }

  /**
   * Configures the application with all necessary middleware, routes, and services
   */
  configure(): this {
    this.bootstrapService.configure();
    return this;
  }

  /**
   * Starts the HTTP server and begins listening on the configured port
   */
  async startServer(): Promise<this> {
    const port = this.bootstrapService.getPort();
    await this.app.listen(port);
    return this;
  }

  /**
   * Logs startup information to the console
   */
  logStartupInfo(): this {
    const port = this.bootstrapService.getPort();
    this.bootstrapService.logStartupInfo(port);
    return this;
  }

  /**
   * Sets up graceful shutdown handlers for the application
   */
  setupShutdownHandlers(): this {
    AppShutdownHandler.handle(this.app);
    return this;
  }

  /**
   * Get the underlying NestJS application instance
   */
  getApp(): INestApplication {
    return this.app;
  }

  /**
   * Get the configuration service
   */
  getConfigService(): ConfigService {
    return this.configService;
  }
}
