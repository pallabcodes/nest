import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { SwaggerConfig } from '@common/config/swagger.config';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export class AppBootstrapService {
  private constructor(
    private readonly app: INestApplication,
    private readonly configService: ConfigService,
  ) {}

  static create(app: INestApplication, configService: ConfigService): AppBootstrapService {
    return new AppBootstrapService(app, configService);
  }

  configure(): void {
    this.setGlobalPrefix();
    this.enableCors();
    this.setupViewEngine();
    this.setupGlobalPipes();
    this.setupGlobalFilters();
    this.setupGlobalInterceptors();
    this.setupSwagger();
    this.setupRootEndpoint();
  }

  private setGlobalPrefix(): void {
    this.app.setGlobalPrefix('api');
  }

  private enableCors(): void {
    const corsConfig = this.configService.get('cors');
    const origin = corsConfig?.origin || '*';
    
    // Support both string and array of origins
    const origins = typeof origin === 'string' 
      ? (origin === '*' ? '*' : origin.split(',').map(o => o.trim()))
      : origin;

    this.app.enableCors({
      origin: origins,
      credentials: corsConfig?.credentials ?? true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  }

  private setupViewEngine(): void {
    // Configure EJS view engine for HTML templates
    // Views directory: src/views (relative to project root)
    const expressApp = this.app.getHttpAdapter().getInstance();
    const path = require('path');
    expressApp.set('view engine', 'ejs');
    expressApp.set('views', path.join(process.cwd(), 'src', 'views'));
    
    // Enable cookie parsing for authentication middleware
    const cookieParser = require('cookie-parser');
    expressApp.use(cookieParser());
    
    // Serve static assets (CSS, JS) from views/assets directory
    const expressStatic = require('express').static;
    expressApp.use('/assets', expressStatic(path.join(process.cwd(), 'src', 'views', 'assets')));
    
    // Register HTML template routes directly on Express (bypassing NestJS global prefix)
    // These routes are accessible without /api prefix for direct browser access
    this.setupTemplateRoutes(expressApp);
  }

  private setupTemplateRoutes(expressApp: any): void {
    const path = require('path');
    const viewsPath = path.join(process.cwd(), 'src', 'views');
    
    // Create authentication middleware for protected template routes
    const requireAuth = this.createAuthMiddleware();
    
    // Register page
    expressApp.get('/auth/register', (req: any, res: any) => {
      res.render('auth/register', {
        formData: req.query,
        errors: [],
      });
    });
    
    // Legacy signup route redirect
    expressApp.get('/auth/signup', (req: any, res: any) => {
      res.redirect('/auth/register');
    });

    // Login page
    expressApp.get('/auth/login', (req: any, res: any) => {
      res.render('auth/login', {
        formData: req.query,
        errors: [],
        success: req.query.success || null,
        query: req.query,
      });
    });

    // Forgot password page
    expressApp.get('/auth/forgot-password', (req: any, res: any) => {
      res.render('auth/forgot-password', {
        formData: req.query,
        errors: [],
      });
    });

    // Reset password page
    expressApp.get('/auth/reset-password', (req: any, res: any) => {
      res.render('auth/reset-password', {
        query: req.query,
        errors: [],
      });
    });
    
    // Landing page
    expressApp.get('/landing', (req: any, res: any) => {
      res.render('landing', {});
    });
    
    // Realtime features page
    expressApp.get('/realtime', (req: any, res: any) => {
      res.render('realtime', {});
    });
    
    // Profile page - Protected route
    expressApp.get('/auth/profile', requireAuth, (req: any, res: any) => {
      // User data from JWT token is available in req.user
      // Full profile data will be loaded client-side via API
      res.render('auth/profile', {
        user: req.user || null,
      });
    });
    
    // Health status page
    expressApp.get('/health', (req: any, res: any) => {
      // Check if client wants JSON (API request)
      const acceptHeader = req.headers.accept || '';
      if (acceptHeader.includes('application/json')) {
        // Let NestJS handle it via /api/health
        return res.redirect('/api/health');
      }
      // Render HTML template for browser requests
      res.render('health', {});
    });
    
    // Example CRUD pages (for testing/demo) - Protected routes
    expressApp.get('/examples/students', requireAuth, (req: any, res: any) => {
      res.render('examples/students', {
        user: req.user || null,
      });
    });
    
    expressApp.get('/examples/courses', requireAuth, (req: any, res: any) => {
      res.render('examples/courses', {
        user: req.user || null,
      });
    });
    
    // Dashboard page - Protected route
    expressApp.get('/dashboard', requireAuth, (req: any, res: any) => {
      res.render('dashboard', {
        user: req.user || null,
      });
    });
    
    // Logout route - clears tokens and redirects to landing
    expressApp.get('/auth/logout', (req: any, res: any) => {
      // Clear cookie by setting it to expire in the past
      res.cookie('accessToken', '', { expires: new Date(0), path: '/' });
      res.cookie('refreshToken', '', { expires: new Date(0), path: '/' });
      // Redirect to landing page
      res.redirect('/landing');
    });
    
    // Redirect /auth/realtime to /realtime (common mistake)
    expressApp.get('/auth/realtime', (req: any, res: any) => {
      res.redirect('/realtime');
    });
    
    // Favicon route - return 204 No Content to prevent 404 errors
    expressApp.get('/favicon.ico', (req: any, res: any) => {
      res.status(204).end();
    });
    
    // Chrome DevTools .well-known route - return 204 No Content to prevent 404 errors
    expressApp.get('/.well-known/appspecific/com.chrome.devtools.json', (req: any, res: any) => {
      res.status(204).end();
    });
  }

  private setupGlobalPipes(): void {
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
  }

  private setupGlobalFilters(): void {
    // HttpExceptionFilter is registered via APP_FILTER in AppModule
    // No need to register here to avoid duplication
  }

  private setupGlobalInterceptors(): void {
    // LoggingInterceptor is registered via APP_INTERCEPTOR in AppModule
    // Only register TransformInterceptor here
    this.app.useGlobalInterceptors(new TransformInterceptor());
  }

  private setupSwagger(): void {
    SwaggerConfig.setup(this.app);
  }

  private setupRootEndpoint(): void {
    this.app.getHttpAdapter().get('/', (req, res) => {
      // Check if client wants JSON (API request)
      const acceptHeader = req.headers.accept || '';
      if (acceptHeader.includes('application/json')) {
        // Return JSON for API consumers
        return res.json({
          message: 'Interview Sandbox API',
          version: '1.0.0',
          docs: '/api-docs',
          api: '/api',
          health: '/health',
          ready: '/ready',
        });
      }
      // For browser requests, render a page that checks auth client-side
      // and redirects to dashboard if authenticated, landing if not
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Platform</title>
        </head>
        <body>
          <script>
            const token = localStorage.getItem('accessToken');
            if (token) {
              // Verify token is valid by checking user endpoint
              fetch('/api/users/me', {
                headers: { 'Authorization': 'Bearer ' + token }
              })
                .then(r => r.json())
                .then(data => {
                  if (data.data) {
                    window.location.href = '/dashboard';
                  } else {
                    window.location.href = '/landing';
                  }
                })
                .catch(() => {
                  window.location.href = '/landing';
                });
            } else {
              window.location.href = '/landing';
            }
          </script>
        </body>
        </html>
      `);
    });
  }

  getPort(): number {
    return this.configService.get<number>('port') || 8000;
  }

  logStartupInfo(port: number): void {
    console.log(`🚀 Application is running on: http://localhost:${port}`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/api-docs`);
    console.log(`❤️  Health check: http://localhost:${port}/health`);
  }

  private createAuthMiddleware(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void> {
    const jwt = require('jsonwebtoken');
    const jwtSecret = this.configService.get<string>('jwt.secret');
    
    if (!jwtSecret) {
      throw new Error('JWT secret is not configured');
    }

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Extract token from multiple sources (in order of preference)
        let token: string | null = null;
        
        // 1. Check Authorization header (Bearer token) - for API-like requests
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
        
        // 2. Check cookies (if using cookie-based auth)
        if (!token && req.cookies && req.cookies.accessToken) {
          token = req.cookies.accessToken;
        }
        
        // 3. Check query parameter (fallback for direct navigation with token)
        if (!token && req.query && req.query.token) {
          token = typeof req.query.token === 'string' ? req.query.token : null;
        }
        
        // If no token found, redirect to login
        // Note: Since tokens are stored in localStorage (client-side),
        // they won't be available server-side for direct browser navigation.
        // The client-side JavaScript will handle the redirect in that case.
        // For full server-side protection, consider using cookies instead of localStorage.
        if (!token) {
          // Check if this is an AJAX/API request (has Accept: application/json)
          const acceptHeader = req.headers.accept || '';
          if (acceptHeader.includes('application/json')) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
          }
          // For browser requests, redirect to login
          res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
          return;
        }
        
        // Verify token and attach user to request
        const verified = this.verifyJwtTokenForTemplate(token, jwtSecret, req, res);
        if (!verified) {
          return;
        }
        
        next();
      } catch (error) {
        // For any other error
        const acceptHeader = req.headers.accept || '';
        if (acceptHeader.includes('application/json')) {
          res.status(401).json({ message: 'Authentication error' });
          return;
        }
        res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
        return;
      }
    };
  }

  /**
   * Verifies JWT token for template routes (Express middleware)
   * Attaches user info to request if token is valid
   * Handles errors by redirecting to login (HTML) or returning 401 (JSON)
   * 
   * @param token - JWT token string to verify
   * @param jwtSecret - Secret key for JWT verification
   * @param req - Express request object (will be modified to include user)
   * @param res - Express response object (for error responses)
   * @returns true if token is valid and user attached, false if error occurred
   */
  private verifyJwtTokenForTemplate(
    token: string,
    jwtSecret: string,
    req: AuthenticatedRequest,
    res: Response,
  ): boolean {
    const jwt = require('jsonwebtoken');
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as { sub: number; email: string; role?: string };
      
      // Attach user info to request
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role || 'USER',
      };
      
      return true;
    } catch (jwtError) {
      // Token is invalid or expired
      const acceptHeader = req.headers.accept || '';
      if (acceptHeader.includes('application/json')) {
        res.status(401).json({ message: 'Invalid or expired token' });
        return false;
      }
      res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl) + '&error=session_expired');
      return false;
    }
  }
}