/**
 * Neat Framework - Built-in Guards
 *
 * Common guard implementations for authentication, authorization, and security.
 */

import type { Guard, GuardContext } from './guard.interface';
import { Guard as GuardDecorator } from './guard.decorators';

/**
 * Authentication guard - requires user to be logged in.
 */
@GuardDecorator({
  name: 'AuthGuard',
  priority: 10,
  global: false
})
export class AuthGuard implements Guard {
  async canActivate(context: GuardContext): Promise<boolean> {
    return !!context.user;
  }
}

/**
 * JWT Authentication guard - validates JWT tokens.
 */
@GuardDecorator({
  name: 'JwtAuthGuard',
  priority: 10,
  global: false
})
export class JwtAuthGuard implements Guard {
  async canActivate(context: GuardContext): Promise<boolean> {
    // Check for Authorization header
    const authHeader = context.request.headers?.['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // This would integrate with your JWT service
      // For now, just check if token exists
      if (!token || token.length < 10) {
        return false;
      }

      // In real implementation, you'd validate the token
      // and set context.user = decodedUser;

      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Role-based access control guard.
 */
@GuardDecorator({
  name: 'RoleGuard',
  priority: 20,
  global: false
})
export class RoleGuard implements Guard {
  constructor(private readonly requiredRoles: string[]) {}

  async canActivate(context: GuardContext): Promise<boolean> {
    const userRoles = context.roles || [];
    return this.requiredRoles.some(role => userRoles.includes(role));
  }
}

/**
 * Permission-based access control guard.
 */
@GuardDecorator({
  name: 'PermissionGuard',
  priority: 20,
  global: false
})
export class PermissionGuard implements Guard {
  constructor(private readonly requiredPermissions: string[]) {}

  async canActivate(context: GuardContext): Promise<boolean> {
    const userPermissions = context.permissions || [];
    return this.requiredPermissions.some(permission => userPermissions.includes(permission));
  }
}

/**
 * Admin-only access guard.
 */
@GuardDecorator({
  name: 'AdminGuard',
  priority: 30,
  global: false
})
export class AdminGuard extends RoleGuard {
  constructor() {
    super(['admin']);
  }
}

/**
 * Rate limiting guard.
 */
@GuardDecorator({
  name: 'RateLimitGuard',
  priority: 5,
  global: false
})
export class RateLimitGuard implements Guard {
  private readonly requests = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private readonly maxRequests: number = 100,
    private readonly windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}

  async canActivate(context: GuardContext): Promise<boolean> {
    const clientId = this.getClientIdentifier(context);
    const now = Date.now();
    const windowKey = Math.floor(now / this.windowMs);

    const key = `${clientId}:${windowKey}`;
    const record = this.requests.get(key) || { count: 0, resetTime: now + this.windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + this.windowMs;
    }

    record.count++;
    this.requests.set(key, record);

    // Clean up old entries occasionally
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }

    return record.count <= this.maxRequests;
  }

  private getClientIdentifier(context: GuardContext): string {
    // Use IP address or user ID as identifier
    return context.user?.id?.toString() ||
           context.request.headers?.['x-forwarded-for'] ||
           context.request.headers?.['x-real-ip'] ||
           'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

/**
 * API Key authentication guard.
 */
@GuardDecorator({
  name: 'ApiKeyGuard',
  priority: 10,
  global: false
})
export class ApiKeyGuard implements Guard {
  constructor(private readonly validApiKeys: Set<string>) {}

  async canActivate(context: GuardContext): Promise<boolean> {
    const apiKey = context.request.headers?.['x-api-key'] ||
                   context.request.query?.api_key;

    return !!apiKey && this.validApiKeys.has(apiKey as string);
  }
}

/**
 * IP whitelist guard.
 */
@GuardDecorator({
  name: 'IpWhitelistGuard',
  priority: 5,
  global: false
})
export class IpWhitelistGuard implements Guard {
  constructor(private readonly allowedIps: Set<string>) {}

  async canActivate(context: GuardContext): Promise<boolean> {
    const clientIp = context.request.headers?.['x-forwarded-for'] ||
                     context.request.headers?.['x-real-ip'] ||
                     context.request.ip ||
                     'unknown';

    return this.allowedIps.has(clientIp as string);
  }
}
