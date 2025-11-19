/**
 * Neat Framework - Application Lifecycle Management
 *
 * This module contains the NeatApplication class that manages the entire
 * application lifecycle, from dependency injection setup to HTTP server
 * management and graceful shutdown.
 */

import type { StartupOptions } from './startup.js';

/**
 * Neat application instance that manages the entire application lifecycle.
 */
export class NeatApplication {
  private server: any = null;
  private container: any = null;
  private isShuttingDown = false;

  constructor(private readonly options: StartupOptions) {}

  /**
   * Start the application.
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Neat application...');

      // 1. Discover all decorated classes
      await this.discoverModules();

      // 2. Setup dependency injection container
      await this.setupContainer();

      // 3. Register routes
      await this.registerRoutes();

      // 4. Start HTTP server
      await this.startServer();

      // 5. Setup graceful shutdown
      this.setupGracefulShutdown();

      console.log(`✅ Application started successfully on port ${this.options.port}`);

    } catch (error) {
      console.error('❌ Failed to start application:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Shutdown the application gracefully.
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('🛑 Shutting down application...');

    try {
      // Stop HTTP server
      if (this.server) {
        await this.stopServer();
      }

      // Cleanup container
      if (this.container) {
        await this.cleanupContainer();
      }

      console.log('✅ Application shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Discover all decorated classes in the application.
   */
  private async discoverModules(): Promise<void> {
    console.log('🔍 Discovering modules...');

    // For now, use provided controllers/providers or auto-discover
    // In a full implementation, this would scan the entire module tree
    const controllers = this.options.controllers || [];
    const providers = this.options.providers || [];

    console.log(`📦 Found ${controllers.length} controllers, ${providers.length} providers`);
  }

  /**
   * Setup dependency injection container.
   */
  private async setupContainer(): Promise<void> {
    console.log('🔧 Setting up dependency injection container...');

    // Placeholder - will integrate with actual container implementation
    this.container = {};

    console.log('✅ Container initialized');
  }

  /**
   * Register routes from controllers.
   */
  private async registerRoutes(): Promise<void> {
    console.log('🛣️  Registering routes...');

    // Placeholder - will integrate with HTTP layer
    const routeCount = 0; // Will be calculated from actual routes

    console.log(`✅ Registered ${routeCount} routes`);
  }

  /**
   * Start the HTTP server.
   */
  private async startServer(): Promise<void> {
    console.log(`🌐 Starting ${this.options.httpOptions?.engine || 'fastify'} server...`);

    // Placeholder - will integrate with actual HTTP server
    this.server = {
      port: this.options.port,
      host: this.options.host || '0.0.0.0',
    };

    // Simulate server startup
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`✅ Server listening on ${this.server.host}:${this.server.port}`);
  }

  /**
   * Stop the HTTP server.
   */
  private async stopServer(): Promise<void> {
    console.log('🛑 Stopping HTTP server...');

    // Placeholder - will integrate with actual server shutdown
    await new Promise(resolve => setTimeout(resolve, 50));

    console.log('✅ Server stopped');
  }

  /**
   * Cleanup dependency injection container.
   */
  private async cleanupContainer(): Promise<void> {
    console.log('🧹 Cleaning up container...');

    // Placeholder - will integrate with actual container cleanup
    await new Promise(resolve => setTimeout(resolve, 25));

    console.log('✅ Container cleaned up');
  }

  /**
   * Setup graceful shutdown handlers.
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`📡 Received ${signal}, initiating graceful shutdown...`);
      await this.shutdown();
      process.exit(0);
    };

    // Handle common termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught exception:', error);
      this.shutdown().finally(() => process.exit(1));
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
      this.shutdown().finally(() => process.exit(1));
    });
  }
}
