/**
 * Neat Framework - Startup Application Decorator
 *
 * The @StartupApplication decorator enables zero-configuration application startup.
 * This is the crown jewel of the Neat framework - it automatically discovers,
 * configures, and starts your entire application with minimal boilerplate.
 *
 * Key TypeScript Excellence Features:
 * - Zero-configuration application bootstrap
 * - Automatic dependency injection setup
 * - Type-safe configuration with branded types
 * - Compile-time module discovery
 * - Runtime application orchestration
 *
 * Runtime Behavior: Orchestrates the entire application lifecycle from
 * dependency injection to HTTP server startup and graceful shutdown.
 *
 * Framework Integration: The primary entry point for Neat applications,
 * replacing traditional main.ts files with declarative configuration.
 *
 * Pain Points Addressed: Eliminates complex application setup, manual
 * service registration, route configuration, and server initialization.
 *
 * Research: Inspired by Spring Boot's auto-configuration but with stronger
 * typing and zero runtime overhead for type checking.
 */
import { MetadataScanner, METADATA_KEYS } from '../metadata/index.js';
import { NeatApplication } from './application.js';
/**
 * God-moded TypeScript: StartupApplication decorator factory.
 *
 * The crown jewel of Neat framework - enables zero-configuration application startup.
 * Automatically discovers controllers, providers, sets up DI, registers routes,
 * starts HTTP server, and handles graceful shutdown.
 *
 * @param options - Application configuration options
 * @returns A class decorator that transforms the class into a runnable application
 *
 * @example
 * ```typescript
 * @StartupApplication({
 *   port: 3000 as any, // Branded Port type
 *   // controllers and providers auto-discovered if not specified
 * })
 * export class Application {
 *   // Zero configuration - everything handled automatically!
 * }
 *
 * // Run with: node dist/main.js
 * ```
 */
export function StartupApplication(options) {
    return (target) => {
        // Mark as application entry point
        const scanner = new MetadataScanner();
        scanner.setMetadata(METADATA_KEYS.MODULE, {
            type: 'application',
            options,
            startupTime: Date.now(),
        }, target);
        // Create application instance factory
        const createApplication = () => new NeatApplication(options);
        // Auto-run application when this module is executed directly
        if (typeof require !== 'undefined' && require.main === module) {
            const app = createApplication();
            app.start().catch(console.error);
        }
        // For ES modules, provide a default export
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { createApplication };
        }
    };
}
/**
 * Utility function to check if a class is an application entry point.
 */
export function isApplicationEntryPoint(target) {
    const scanner = new MetadataScanner();
    const metadata = scanner.getMetadata(METADATA_KEYS.MODULE, target);
    return metadata?.type === 'application';
}
/**
 * Get application configuration from a decorated class.
 */
export function getApplicationConfig(target) {
    const scanner = new MetadataScanner();
    const metadata = scanner.getMetadata(METADATA_KEYS.MODULE, target);
    return metadata?.type === 'application' ? metadata.options : undefined;
}
/**
 * Create and start an application instance.
 */
export async function createApplication(options) {
    const app = new NeatApplication(options);
    await app.start();
    return app;
}
//# sourceMappingURL=startup.js.map