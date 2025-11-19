#!/usr/bin/env tsx

/**
 * HTTP MIDDLEWARE NEAT - HTTP Server with Middleware
 *
 * Demonstrates Neat framework's HTTP handling, middleware pipeline,
 * request/response interceptors, and routing capabilities.
 */

import 'reflect-metadata';

// =============================================================================
// HTTP TYPES AND INTERFACES
// =============================================================================

interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body?: any;
  send(data: any): void;
  json(data: any): void;
  status(code: number): HttpResponse;
}

interface HttpContext {
  request: HttpRequest;
  response: HttpResponse;
  next(): Promise<void>;
}

// =============================================================================
// MIDDLEWARE SYSTEM
// =============================================================================

interface Middleware {
  use(context: HttpContext): Promise<void>;
}

class MiddlewarePipeline {
  private middlewares: Middleware[] = [];

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  async execute(context: HttpContext): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware.use(context);
      }
    };

    await next();
  }
}

// =============================================================================
// DECORATORS
// =============================================================================

const CONTROLLER_METADATA = new Map<string, any>();
const ROUTES_METADATA = new Map<string, any[]>();

function Injectable(): ClassDecorator {
  return (target: any) => {
    // Mark as injectable
    (global as any)[`${target.name}_injectable`] = true;
  };
}

function Controller(prefix = ''): ClassDecorator {
  return (target: any) => {
    CONTROLLER_METADATA.set(target.name, { prefix });
    (global as any)[`${target.name}_controller`] = { prefix };
  };
}

function Get(path = ''): MethodDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const controllerName = target.constructor.name;
    const routes = ROUTES_METADATA.get(controllerName) || [];
    routes.push({
      method: 'GET',
      path,
      propertyKey: propertyKey.toString(),
      handler: target[propertyKey]
    });
    ROUTES_METADATA.set(controllerName, routes);

    // Also store in global for access
    (global as any)[`${controllerName}_routes`] = routes;
  };
}

function Post(path = ''): MethodDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const controllerName = target.constructor.name;
    const routes = ROUTES_METADATA.get(controllerName) || [];
    routes.push({
      method: 'POST',
      path,
      propertyKey: propertyKey.toString(),
      handler: target[propertyKey]
    });
    ROUTES_METADATA.set(controllerName, routes);

    // Also store in global for access
    (global as any)[`${controllerName}_routes`] = routes;
  };
}

function Middleware(): ClassDecorator {
  return (target: any) => {
    (global as any)[`${target.name}_middleware`] = true;
  };
}

// =============================================================================
// MIDDLEWARE IMPLEMENTATIONS
// =============================================================================

@Injectable()
@Middleware()
class LoggingMiddleware implements Middleware {
  async use(context: HttpContext): Promise<void> {
    const start = Date.now();
    console.log(`📨 ${context.request.method} ${context.request.url}`);

    await context.next();

    const duration = Date.now() - start;
    console.log(`✅ ${context.request.method} ${context.request.url} - ${context.response.statusCode} (${duration}ms)`);
  }
}

@Injectable()
@Middleware()
class CorsMiddleware implements Middleware {
  async use(context: HttpContext): Promise<void> {
    context.response.headers['Access-Control-Allow-Origin'] = '*';
    context.response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    context.response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';

    if (context.request.method === 'OPTIONS') {
      context.response.statusCode = 200;
      return;
    }

    await context.next();
  }
}

@Injectable()
@Middleware()
class AuthMiddleware implements Middleware {
  private validTokens = new Set(['token123', 'admin456']);

  async use(context: HttpContext): Promise<void> {
    const authHeader = context.request.headers['authorization'];
    if (!authHeader) {
      context.response.statusCode = 401;
      context.response.json({ error: 'No authorization header' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    if (!this.validTokens.has(token)) {
      context.response.statusCode = 401;
      context.response.json({ error: 'Invalid token' });
      return;
    }

    // Add user info to request
    (context.request as any).user = { id: 1, role: token === 'admin456' ? 'admin' : 'user' };

    await context.next();
  }
}

// =============================================================================
// CONTROLLERS
// =============================================================================

@Injectable()
@Controller('/api')
class UserController {
  private users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ];

  @Get('/users')
  async getUsers(context: HttpContext): Promise<void> {
    context.response.json({
      success: true,
      data: this.users
    });
  }

  @Get('/users/:id')
  async getUser(context: HttpContext): Promise<void> {
    const id = parseInt(context.request.params?.id || '0');
    const user = this.users.find(u => u.id === id);

    if (!user) {
      context.response.statusCode = 404;
      context.response.json({ error: 'User not found' });
      return;
    }

    context.response.json({
      success: true,
      data: user
    });
  }

  @Post('/users')
  async createUser(context: HttpContext): Promise<void> {
    const { name, email } = context.request.body || {};

    if (!name || !email) {
      context.response.statusCode = 400;
      context.response.json({ error: 'Name and email are required' });
      return;
    }

    const newUser = {
      id: this.users.length + 1,
      name,
      email
    };

    this.users.push(newUser);

    context.response.statusCode = 201;
    context.response.json({
      success: true,
      data: newUser
    });
  }
}

@Injectable()
@Controller('/api/admin')
class AdminController {
  @Get('/stats')
  async getStats(context: HttpContext): Promise<void> {
    // This would require auth middleware
    const user = (context.request as any).user;

    if (user?.role !== 'admin') {
      context.response.statusCode = 403;
      context.response.json({ error: 'Admin access required' });
      return;
    }

    context.response.json({
      success: true,
      data: {
        totalUsers: 42,
        activeSessions: 15,
        serverUptime: '2 days, 4 hours'
      }
    });
  }
}

// =============================================================================
// HTTP SERVER IMPLEMENTATION
// =============================================================================

class SimpleHttpResponse implements HttpResponse {
  statusCode = 200;
  headers: Record<string, string> = {};
  body?: any;

  send(data: any): void {
    this.body = data;
  }

  json(data: any): void {
    this.headers['Content-Type'] = 'application/json';
    this.body = JSON.stringify(data);
  }

  status(code: number): HttpResponse {
    this.statusCode = code;
    return this;
  }
}

class SimpleHttpServer {
  private middleware = new MiddlewarePipeline();
  private routes = new Map<string, { method: string; handler: Function; controller: any }>();

  use(middleware: Middleware): void {
    this.middleware.use(middleware);
  }

  registerController(controller: any): void {
    const controllerName = controller.constructor.name;
    const controllerMeta = (global as any)[`${controllerName}_controller`];
    const routes = (global as any)[`${controllerName}_routes`] || [];

    for (const route of routes) {
      const fullPath = `${controllerMeta?.prefix || ''}${route.path}`;
      this.routes.set(`${route.method} ${fullPath}`, {
        method: route.method,
        handler: route.handler.bind(controller),
        controller
      });
    }
  }

  async handleRequest(method: string, url: string, headers: Record<string, string> = {}, body?: any): Promise<HttpResponse> {
    const response = new SimpleHttpResponse();

    // Parse URL and extract params
    const urlParts = url.split('/');
    const routeKey = `${method} ${url}`;

    // Create context
    const context: HttpContext = {
      request: {
        method,
        url,
        headers,
        body,
        params: {},
        query: {}
      },
      response,
      next: async () => {
        // Find route handler
        const route = this.routes.get(routeKey);
        if (route) {
          await route.handler(context);
        } else {
          response.statusCode = 404;
          response.json({ error: 'Route not found' });
        }
      }
    };

    try {
      // Execute middleware pipeline
      await this.middleware.execute(context);
    } catch (error) {
      response.statusCode = 500;
      response.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return response;
  }
}

// =============================================================================
// DEPENDENCY INJECTION CONTAINER
// =============================================================================

class SimpleContainer {
  private services = new Map<string, any>();

  register(token: string, instance: any): void {
    this.services.set(token, instance);
  }

  resolve<T>(token: string): T {
    const service = this.services.get(token);
    if (!service) {
      throw new Error(`Service not found: ${token}`);
    }
    return service;
  }
}

// =============================================================================
// APPLICATION BOOTSTRAP
// =============================================================================

async function main(): Promise<void> {
  console.log('🌐 Neat Framework HTTP Middleware Example\n');

  try {
    // Create dependency injection container
    const container = new SimpleContainer();

    // Register services
    container.register('LoggingMiddleware', new LoggingMiddleware());
    container.register('CorsMiddleware', new CorsMiddleware());
    container.register('AuthMiddleware', new AuthMiddleware());
    container.register('UserController', new UserController());
    container.register('AdminController', new AdminController());

    console.log('✅ Services registered');

    // Create HTTP server
    const server = new SimpleHttpServer();

    // Register middleware
    server.use(container.resolve('LoggingMiddleware'));
    server.use(container.resolve('CorsMiddleware'));

    // Register controllers
    server.registerController(container.resolve('UserController'));
    server.registerController(container.resolve('AdminController'));

    console.log('✅ HTTP server configured');

    // ========================================
    // DEMO REQUESTS
    // ========================================

    console.log('\n📨 Demonstrating HTTP requests...\n');

    // Test 1: GET /api/users (no auth required)
    console.log('🧪 Test 1: GET /api/users');
    const response1 = await server.handleRequest('GET', '/api/users');
    console.log(`   Status: ${response1.statusCode}`);
    console.log(`   Response: ${response1.body}`);
    console.log();

    // Test 2: GET /api/users/1 (no auth required)
    console.log('🧪 Test 2: GET /api/users/1');
    const response2 = await server.handleRequest('GET', '/api/users/1');
    console.log(`   Status: ${response2.statusCode}`);
    console.log(`   Response: ${response2.body}`);
    console.log();

    // Test 3: POST /api/users (no auth required)
    console.log('🧪 Test 3: POST /api/users');
    const response3 = await server.handleRequest('POST', '/api/users', {}, {
      name: 'Charlie Brown',
      email: 'charlie@example.com'
    });
    console.log(`   Status: ${response3.statusCode}`);
    console.log(`   Response: ${response3.body}`);
    console.log();

    // Test 4: GET /api/admin/stats without auth (should fail)
    console.log('🧪 Test 4: GET /api/admin/stats (no auth)');
    const response4 = await server.handleRequest('GET', '/api/admin/stats');
    console.log(`   Status: ${response4.statusCode}`);
    console.log(`   Response: ${response4.body}`);
    console.log();

    // Now add auth middleware for admin routes
    server.use(container.resolve('AuthMiddleware'));

    // Test 5: GET /api/admin/stats with invalid token
    console.log('🧪 Test 5: GET /api/admin/stats (invalid token)');
    const response5 = await server.handleRequest('GET', '/api/admin/stats', {
      'authorization': 'Bearer invalid-token'
    });
    console.log(`   Status: ${response5.statusCode}`);
    console.log(`   Response: ${response5.body}`);
    console.log();

    // Test 6: GET /api/admin/stats with valid user token
    console.log('🧪 Test 6: GET /api/admin/stats (user token)');
    const response6 = await server.handleRequest('GET', '/api/admin/stats', {
      'authorization': 'Bearer token123'
    });
    console.log(`   Status: ${response6.statusCode}`);
    console.log(`   Response: ${response6.body}`);
    console.log();

    // Test 7: GET /api/admin/stats with admin token
    console.log('🧪 Test 7: GET /api/admin/stats (admin token)');
    const response7 = await server.handleRequest('GET', '/api/admin/stats', {
      'authorization': 'Bearer admin456'
    });
    console.log(`   Status: ${response7.statusCode}`);
    console.log(`   Response: ${response7.body}`);
    console.log();

    // Test 8: OPTIONS request (CORS)
    console.log('🧪 Test 8: OPTIONS /api/users (CORS)');
    const response8 = await server.handleRequest('OPTIONS', '/api/users');
    console.log(`   Status: ${response8.statusCode}`);
    console.log(`   CORS Headers: ${Object.keys(response8.headers).filter(k => k.startsWith('Access-Control')).join(', ')}`);
    console.log();

    console.log('🎉 HTTP Middleware example completed successfully!');
    console.log('✅ Demonstrated: HTTP request/response handling');
    console.log('✅ Demonstrated: Middleware pipeline');
    console.log('✅ Demonstrated: CORS handling');
    console.log('✅ Demonstrated: Authentication middleware');
    console.log('✅ Demonstrated: Route registration and handling');
    console.log('✅ Demonstrated: Controller pattern');
    console.log('✅ Demonstrated: Dependency injection');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// =============================================================================
// RUN THE EXAMPLE
// =============================================================================

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
