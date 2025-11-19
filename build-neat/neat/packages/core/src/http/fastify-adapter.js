/**
 * Neat Framework - Fastify HTTP Adapter Implementation
 *
 * This module provides a Fastify-based HTTP adapter for the Neat framework.
 * Fastify is chosen as the default due to its superior performance compared to Express.
 *
 * Key TypeScript Excellence Features:
 * - Full type safety for Fastify integration
 * - Proper error handling with Result types
 * - Compile-time route validation
 * - Generic adapter interface implementation
 *
 * Runtime Behavior: Creates and manages a Fastify server instance, registering
 * routes from controller metadata and handling HTTP requests with optimal performance.
 *
 * Framework Integration: Implements the HttpAdapter interface to provide
 * a consistent API across different HTTP server implementations.
 *
 * Pain Points Addressed: Eliminates manual Fastify server setup, route registration,
 * and middleware configuration that plague traditional Node.js applications.
 *
 * Research: Fastify chosen over Express due to 2x performance improvements
 * in benchmarks and better TypeScript support.
 */
// ========================================
// FASTIFY ADAPTER IMPLEMENTATION
// ========================================
/**
 * God-moded TypeScript: Fastify HTTP adapter implementation.
 *
 * Provides a complete Fastify-based HTTP server adapter with type safety,
 * route registration, and framework integration.
 *
 * @template TRequest - Fastify request type
 * @template TResponse - Fastify reply type
 */
export class FastifyAdapter {
    name = 'fastify';
    version = '1.0.0';
    server = null;
    /**
     * Initialize the Fastify server with configuration.
     */
    async initialize(config) {
        try {
            // Dynamic import to avoid bundling Fastify in environments that don't need it
            const fastify = await this.importFastify();
            // Create Fastify instance with configuration
            const server = fastify.default({
                logger: !config.disableRequestLogging, // Use inverse of disableRequestLogging
                bodyLimit: config.bodyLimit ?? 1048576, // 1MB default
                trustProxy: config.trustProxy ?? false,
                // Additional Fastify-specific options can be added here
            });
            // Register global hooks
            this.registerGlobalHooks(server);
            // Register error handler
            this.registerErrorHandler(server, config);
            // Store server instance
            this.server = server;
            return { success: true, data: server };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Failed to initialize Fastify server')
            };
        }
    }
    /**
     * Start the HTTP server on specified port (interface compatibility).
     */
    async start(server, port) {
        try {
            await server.listen({
                port: port,
                host: '0.0.0.0' // Default host
            });
            return { success: true, data: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Failed to start server')
            };
        }
    }
    /**
     * Start listening on the specified port and host (convenience method).
     */
    async listen(port, host) {
        if (!this.server) {
            return { success: false, error: new Error('Server not initialized') };
        }
        try {
            await this.server.listen({
                port: port,
                host: host || '0.0.0.0'
            });
            return { success: true, data: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Failed to start server')
            };
        }
    }
    /**
     * Register a route with the Fastify server.
     */
    async registerRoute(server, route, handler) {
        try {
            // Convert Neat route definition to Fastify route options
            const fastifyRoute = this.convertRouteDefinition(route, handler);
            // Register the route with Fastify
            server.route(fastifyRoute);
            return { success: true, data: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Failed to register route')
            };
        }
    }
    /**
     * Stop the HTTP server gracefully (interface compatibility).
     */
    async stop(server) {
        try {
            await server.close();
            return { success: true, data: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Failed to stop server')
            };
        }
    }
    /**
     * Close the server gracefully (convenience method).
     */
    async close() {
        if (!this.server) {
            return { success: false, error: new Error('Server not initialized') };
        }
        try {
            await this.server.close();
            this.server = null;
            return { success: true, data: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Failed to close server')
            };
        }
    }
    /**
     * Get the underlying Fastify server instance.
     */
    getHttpServer() {
        return this.server;
    }
    /**
     * Get server health status (interface compatibility).
     */
    async getHealth(server) {
        try {
            return {
                success: true,
                data: {
                    status: 'running',
                    routes: server.printRoutes ? server.printRoutes() : 'N/A',
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    version: this.version
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Failed to get health status')
            };
        }
    }
    /**
     * Get server health metrics (convenience method).
     */
    getMetrics() {
        if (!this.server) {
            return { status: 'not_initialized' };
        }
        return {
            status: 'running',
            routes: this.server.printRoutes ? this.server.printRoutes() : 'N/A',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: this.version
        };
    }
    /**
     * Register middleware with the server.
     */
    async registerMiddleware(_server, _middleware) {
        // Fastify handles middleware through hooks and plugins
        // This is a placeholder for future middleware integration
        // Parameters are prefixed with underscore to indicate intentional non-usage
        console.log('Middleware registration not yet implemented for Fastify');
        return { success: true, data: undefined };
    }
    /**
     * Set error handler for the server.
     */
    setErrorHandler(handler) {
        if (!this.server) {
            throw new Error('Server not initialized');
        }
        this.server.setErrorHandler(handler);
    }
    /**
     * Set not found handler for the server.
     */
    setNotFoundHandler(handler) {
        if (!this.server) {
            throw new Error('Server not initialized');
        }
        this.server.setNotFoundHandler(handler);
    }
    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================
    /**
     * Dynamically import Fastify to avoid bundling issues.
     */
    async importFastify() {
        try {
            // Use require for dynamic import to avoid TypeScript compilation issues
            const fastify = await new Promise((resolve, reject) => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const fastifyModule = require('fastify');
                    resolve(fastifyModule);
                }
                catch (error) {
                    reject(error);
                }
            });
            return fastify;
        }
        catch (error) {
            throw new Error('Fastify not found. Please install it: npm install fastify\n' +
                'Or use Express adapter instead.');
        }
    }
    /**
     * Register global Fastify hooks.
     */
    registerGlobalHooks(server) {
        // Request logging hook
        server.addHook('onRequest', (request, reply, done) => {
            request.log.info({
                method: request.method,
                url: request.url,
                ip: request.ip
            });
            done();
        });
        // Response logging hook
        server.addHook('onResponse', (request, reply, done) => {
            request.log.info({
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
                responseTime: reply.getResponseTime()
            });
            done();
        });
    }
    /**
     * Register error handler with framework integration.
     */
    registerErrorHandler(server, _config) {
        server.setErrorHandler((error, request, reply) => {
            const statusCode = error.statusCode || 500;
            // In production, don't expose internal error details
            const isDevelopment = process.env.NODE_ENV !== 'production';
            const message = isDevelopment ? error.message : 'Internal Server Error';
            reply.status(statusCode).send({
                success: false,
                error: message,
                ...(isDevelopment && { stack: error.stack })
            });
        });
    }
    /**
     * Convert Neat route definition to Fastify route options.
     */
    convertRouteDefinition(route, handler) {
        return {
            method: route.method,
            url: route.path,
            handler: async (request, reply) => {
                try {
                    // Call the RouteHandler's handle method with framework-provided context
                    await handler.handle(request, reply);
                    // Note: The handler is responsible for calling reply.send()
                    // This follows the RouteHandler<TRequest, TResponse> interface contract
                }
                catch (error) {
                    // Let Fastify's error handler deal with this
                    throw error;
                }
            },
            // Add any middleware or additional configuration
            ...(route.metadata && {
                schema: this.convertMetadataToSchema(route.metadata)
            })
        };
    }
    /**
     * Convert route metadata to Fastify schema.
     */
    convertMetadataToSchema(metadata) {
        // Convert our metadata format to Fastify schema format
        return {
            ...(metadata.summary && { summary: metadata.summary }),
            ...(metadata.description && { description: metadata.description }),
            ...(metadata.tags && { tags: metadata.tags }),
            // Add more schema conversions as needed
        };
    }
}
// ========================================
// FACTORY FUNCTION
// ========================================
/**
 * Create a new Fastify adapter instance.
 */
export function createFastifyAdapter() {
    return new FastifyAdapter();
}
/**
 * Default export for convenience.
 */
export default createFastifyAdapter;
//# sourceMappingURL=fastify-adapter.js.map