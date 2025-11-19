/**
 * Neat Auth - Main Authentication Module
 *
 * Zero-configuration authentication module that integrates
 * seamlessly with Neat Framework's auto-discovery
 */

import { Injectable } from '@neat/core';
import {
  AuthConfig,
  OAuthConfigs,
  IAuthService,
  IOAuthService,
  IRoleService,
  IPermissionService
} from './interfaces/auth.interfaces.js';
import { AuthService, BaseAuthService } from './services/auth.service.js';
import { OAuthService } from './services/oauth.service.js';
import { RoleService } from './services/role.service.js';
import { PermissionService } from './services/permission.service.js';
import { AuthGuard, JwtAuthGuard, AdminGuard, ModeratorGuard } from './guards/auth.guard.js';

// ========================================
// AUTH MODULE CONFIGURATION
// ========================================

export interface NeatAuthModuleConfig {
  auth?: {
    service?: new (...args: any[]) => IAuthService;
    config?: AuthConfig;
  };
  oauth?: {
    service?: new (...args: any[]) => IOAuthService;
    configs?: OAuthConfigs;
  };
  roles?: {
    service?: new (...args: any[]) => IRoleService;
  };
  permissions?: {
    service?: new (...args: any[]) => IPermissionService;
  };
  guards?: {
    enableDefault?: boolean;
    customGuards?: Array<{ name: string; guard: any }>;
  };
}

// ========================================
// NEAT AUTH MODULE
// ========================================

@Injectable()
export class NeatAuthModule {
  private static instance: NeatAuthModule;
  private config: NeatAuthModuleConfig;

  // Services
  public authService: IAuthService;
  public oauthService?: IOAuthService;
  public roleService: IRoleService;
  public permissionService: IPermissionService;

  // Guards
  public guards: Map<string, any> = new Map();

  constructor(config: NeatAuthModuleConfig = {}) {
    this.config = config;

    // Initialize services
    this.authService = this.createAuthService();
    this.oauthService = this.createOAuthService();
    this.roleService = this.createRoleService();
    this.permissionService = this.createPermissionService();

    // Initialize guards
    this.initializeGuards();

    NeatAuthModule.instance = this;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): NeatAuthModule {
    if (!NeatAuthModule.instance) {
      NeatAuthModule.instance = new NeatAuthModule();
    }
    return NeatAuthModule.instance;
  }

  /**
   * Configure the auth module
   */
  static forRoot(config: NeatAuthModuleConfig = {}): NeatAuthModule {
    return new NeatAuthModule(config);
  }

  // ========================================
  // SERVICE FACTORY METHODS
  // ========================================

  private createAuthService(): IAuthService {
    const ServiceClass = this.config.auth?.service || AuthService;
    const serviceConfig = this.config.auth?.config;

    if (ServiceClass === AuthService) {
      return new AuthService(serviceConfig);
    } else {
      // Custom service class
      return new ServiceClass(serviceConfig);
    }
  }

  private createOAuthService(): IOAuthService | undefined {
    const ServiceClass = this.config.oauth?.service || OAuthService;
    const oauthConfigs = this.config.oauth?.configs;

    // Only create OAuth service if configs are provided or env vars exist
    const hasConfigs = oauthConfigs && Object.keys(oauthConfigs).length > 0;
    const hasEnvVars = this.checkOAuthEnvVars();

    if (!hasConfigs && !hasEnvVars) {
      return undefined;
    }

    return new ServiceClass(this.authService, oauthConfigs);
  }

  private createRoleService(): IRoleService {
    const ServiceClass = this.config.roles?.service || RoleService;
    return new ServiceClass();
  }

  private createPermissionService(): IPermissionService {
    const ServiceClass = this.config.permissions?.service || PermissionService;
    return new ServiceClass();
  }

  // ========================================
  // GUARD MANAGEMENT
  // ========================================

  private initializeGuards(): void {
    const enableDefault = this.config.guards?.enableDefault !== false;

    if (enableDefault) {
      // Register default guards
      this.guards.set('auth', AuthGuard);
      this.guards.set('jwt', JwtAuthGuard);
      this.guards.set('admin', AdminGuard);
      this.guards.set('moderator', ModeratorGuard);
    }

    // Register custom guards
    if (this.config.guards?.customGuards) {
      for (const { name, guard } of this.config.guards.customGuards) {
        this.guards.set(name, guard);
      }
    }
  }

  /**
   * Get a guard by name
   */
  getGuard(name: string): any {
    return this.guards.get(name);
  }

  /**
   * Register a custom guard
   */
  registerGuard(name: string, guardClass: any): void {
    this.guards.set(name, guardClass);
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private checkOAuthEnvVars(): boolean {
    const providers = ['GOOGLE', 'GITHUB', 'FACEBOOK', 'TWITTER', 'LINKEDIN'];
    return providers.some(provider =>
      process.env[`${provider}_CLIENT_ID`] &&
      process.env[`${provider}_CLIENT_SECRET`] &&
      process.env[`${provider}_CALLBACK_URL`]
    );
  }

  /**
   * Get auth configuration
   */
  getConfig(): AuthConfig | undefined {
    return this.config.auth?.config;
  }

  /**
   * Check if OAuth is configured
   */
  hasOAuth(): boolean {
    return this.oauthService !== undefined;
  }

  /**
   * Get available OAuth providers
   */
  getOAuthProviders(): string[] {
    if (!this.oauthService) return [];

    // This would need to be implemented in the OAuth service
    return [];
  }
}

// ========================================
// AUTO-DISCOVERY INTEGRATION
// ========================================

/**
 * Auto-discover and register auth-related components
 * This integrates with Neat's metadata scanner
 */
export function registerAuthComponents(module: NeatAuthModule) {
  // Register services for dependency injection
  const services = [
    { token: 'AuthService', implementation: module.authService },
    { token: 'RoleService', implementation: module.roleService },
    { token: 'PermissionService', implementation: module.permissionService }
  ];

  if (module.oauthService) {
    services.push({ token: 'OAuthService', implementation: module.oauthService });
  }

  // Register guards
  for (const [name, guardClass] of module.guards) {
    services.push({ token: `${name}Guard`, implementation: guardClass });
  }

  return services;
}

// ========================================
// PRESET CONFIGURATIONS
// ========================================

/**
 * Basic authentication setup (JWT only)
 */
export function createBasicAuthConfig(config?: Partial<AuthConfig>): NeatAuthModuleConfig {
  return {
    auth: {
      config: {
        jwt: {
          secret: process.env.JWT_SECRET || 'your-secret-key',
          expiresIn: process.env.JWT_EXPIRES_IN || '15m',
          refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
        },
        bcrypt: {
          rounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
        }
      }
    }
  };
}

/**
 * Full authentication setup (JWT + OAuth)
 */
export function createFullAuthConfig(config?: {
  jwt?: Partial<AuthConfig['jwt']>;
  oauth?: OAuthConfigs;
}): NeatAuthModuleConfig {
  const jwtConfig = {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    ...config?.jwt
  };

  return {
    auth: {
      config: {
        jwt: jwtConfig,
        bcrypt: {
          rounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
        },
        oauth: config?.oauth
      }
    },
    oauth: {
      configs: config?.oauth
    }
  };
}

/**
 * Enterprise authentication setup (advanced features)
 */
export function createEnterpriseAuthConfig(config?: {
  jwt?: Partial<AuthConfig['jwt']>;
  oauth?: OAuthConfigs;
  customServices?: {
    auth?: new (...args: any[]) => IAuthService;
    oauth?: new (...args: any[]) => IOAuthService;
    roles?: new (...args: any[]) => IRoleService;
    permissions?: new (...args: any[]) => IPermissionService;
  };
}): NeatAuthModuleConfig {
  const baseConfig = createFullAuthConfig(config);

  if (config?.customServices) {
    if (config.customServices.auth) {
      baseConfig.auth!.service = config.customServices.auth;
    }
    if (config.customServices.oauth) {
      baseConfig.oauth!.service = config.customServices.oauth;
    }
    if (config.customServices.roles) {
      baseConfig.roles!.service = config.customServices.roles;
    }
    if (config.customServices.permissions) {
      baseConfig.permissions!.service = config.customServices.permissions;
    }
  }

  return baseConfig;
}

// ========================================
// DECORATOR RE-EXPORTS
// ========================================

export {
  // Authentication decorators
  AuthRequired,
  RolesRequired,
  PermissionsRequired,

  // Route decorators
  Auth,
  Roles,
  Permissions,
  Public,
  UseAuthStrategies,

  // Parameter decorators
  CurrentUser,
  UserRoles,
  UserPermissions,

  // Utility decorators
  AdminOnly,
  ModeratorOnly,
  OwnerOnly
} from './decorators/auth.decorators.js';

// ========================================
// SERVICE RE-EXPORTS
// ========================================

export {
  AuthService,
  BaseAuthService,
  OAuthService,
  RoleService,
  PermissionService,
  DEFAULT_ROLES,
  COMMON_PERMISSIONS
} from './services/auth.service.js';

export {
  RoleService as RoleServiceClass,
  DEFAULT_ROLES as ROLE_CONSTANTS,
  isUserAdmin,
  isUserModerator
} from './services/role.service.js';

export {
  PermissionService as PermissionServiceClass,
  COMMON_PERMISSIONS as PERMISSION_CONSTANTS,
  hasAdminPermissions,
  canManageResource
} from './services/permission.service.js';

// ========================================
// GUARD RE-EXPORTS
// ========================================

export {
  AuthGuard,
  JwtAuthGuard,
  AdminGuard,
  ModeratorGuard,
  OwnerGuard,
  registerGuard,
  getGuard,
  getAllGuards
} from './guards/auth.guard.js';

// ========================================
// TYPE RE-EXPORTS
// ========================================

export type {
  User,
  AuthUser,
  LoginCredentials,
  RegisterData,
  AuthTokens,
  JwtPayload,
  OAuthProfile,
  OAuthProvider,
  AuthConfig,
  AuthMetadata,
  RouteAuthMetadata
} from './interfaces/auth.interfaces.js';
