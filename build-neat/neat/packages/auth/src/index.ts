/**
 * Neat Auth - Zero-Configuration Authentication
 *
 * Complete authentication and authorization solution
 * that works seamlessly with Neat Framework's auto-discovery
 */

// Main exports
export {
  NeatAuthModule,
  createBasicAuthConfig,
  createFullAuthConfig,
  createEnterpriseAuthConfig,
  registerAuthComponents
} from './auth.module.js';

// Decorators
export {
  AuthRequired,
  RolesRequired,
  PermissionsRequired,
  Auth,
  Roles,
  Permissions,
  Public,
  UseAuthStrategies,
  CurrentUser,
  UserRoles,
  UserPermissions,
  AdminOnly,
  ModeratorOnly,
  OwnerOnly
} from './decorators/auth.decorators.js';

// Services
export {
  AuthService,
  BaseAuthService,
  OAuthService,
  RoleService,
  PermissionService,
  DEFAULT_ROLES,
  COMMON_PERMISSIONS
} from './services/auth.service.js';

// Guards
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

// Types and interfaces
export type {
  User,
  AuthUser,
  LoginCredentials,
  RegisterData,
  AuthTokens,
  JwtPayload,
  JwtRefreshPayload,
  OAuthProfile,
  OAuthProvider,
  AuthConfig,
  OAuthConfigs,
  OAuthConfig,
  AuthGuardContext,
  AuthGuardResult,
  RolesConfig,
  PermissionsConfig,
  AuthMetadata,
  RouteAuthMetadata,
  IAuthService,
  IOAuthService,
  IRoleService,
  IPermissionService,
  PasswordHash,
  PasswordValidationResult,
  TokenValidationResult
} from './interfaces/auth.interfaces.js';

// Error classes
export {
  AuthError,
  UnauthorizedError,
  ForbiddenError,
  TokenExpiredError,
  InvalidTokenError
} from './interfaces/auth.interfaces.js';

// Utility functions
export {
  extractUserFromToken,
  isTokenExpired,
  generateSecureToken,
  generateOAuthState,
  validateOAuthState,
  createCallbackUrl,
  getAvailableProviders,
  isProviderConfigured,
  isUserAdmin,
  isUserModerator,
  getRolePermissions,
  getUserPermissionsFromRoles,
  hasAdminPermissions,
  canManageResource,
  filterPermissionsByResource,
  getPermissionScope,
  createScopedPermission
} from './services/auth.service.js';

// Role utilities
export {
  DEFAULT_ROLES as ROLE_CONSTANTS,
  ADMIN_ROLES,
  MODERATOR_ROLES,
  ROLE_PERMISSIONS,
  isUserAdmin as checkUserAdmin,
  isUserModerator as checkUserModerator
} from './services/role.service.js';

// Permission utilities
export {
  COMMON_PERMISSIONS as PERMISSION_CONSTANTS,
  hasAdminPermissions as checkAdminPermissions,
  canManageResource as checkResourceManagement,
  filterPermissionsByResource as filterPermissions,
  getPermissionScope as getScope,
  createScopedPermission as createPermission
} from './services/permission.service.js';
