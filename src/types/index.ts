/**
 * Centralized Type Exports
 *
 * This file provides a single entry point for all type definitions
 * used throughout the application, ensuring consistency and ease of import.
 */

// API Response Types
export type {
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
  ErrorResponse,
  SuccessMessageResponse,
  HealthResponse,
  ReadinessResponse,
  ValidationErrorResponse,
  ServiceResponse,
  RepositoryResult,
  ControllerResponse,
  ApiResponseData,
  CreateApiResponse,
  CreateErrorResponse,
} from './api';

// Authentication Types
export type {
  JwtPayload,
  AuthenticatedUser,
  UserPayload,
  OAuthUser,
  TokenPair,
  LoginResponse,
  RegisterResponse,
  RoleName,
} from './auth';

// Configuration Types
export type {
  DatabaseConfig,
  JwtConfig,
  BcryptConfig,
  OtpConfig,
  AppConfig,
  CorsConfig,
  LoggerConfig,
  AppConfiguration,
} from './config';

// Database Types
export type {
  UserWithRoles,
  RoleWithUsers,
  UserRoleWithAssociations,
  CreateUserData,
  UpdateUserData,
  CreateRoleData,
  UpdateRoleData,
  AssignRoleData,
} from './database';

// Service Interface Types
export type {
  BaseService,
  FindAllOptions,
  AuthServiceInterface,
  UserServiceInterface,
  BaseRepository,
  FileUploadServiceInterface,
  UploadOptions,
  FileUploadResult,
  FileInfo,
  LoggerServiceInterface,
  CacheServiceInterface,
  EmailServiceInterface,
  EmailOptions,
} from './services';

// Utility Types
export type {
  ID,
  UUID,
  Timestamp,
  Nullable,
  Optional,
  RequiredFields,
  PartialFields,
  DeepPartial,
  DeepRequired,
  FunctionKeys,
  NonFunctionKeys,
  Constructor,
  AbstractConstructor,
  InstanceType,
  PromiseReturnType,
  ArrayElement,
  ObjectValues,
  ObjectKeys,
  Prettify,
  UnionToIntersection,
  StrictExtract,
  StrictExclude,
  NonNullable,
  Brand,
  Email,
  Password,
  URL,
  FilePath,
  TransactionOptions,
  PaginationParams,
  SortOptions,
  FilterOptions,
  QueryOptions,
  HttpStatusCode,
  Environment,
  LogLevel,
  FileSize,
  Duration,
  Percentage,
} from './utils';

// Validation Types
export type {
  ValidationPipeOptions,
  TransformFunction,
  CustomDecoratorMetadata,
  ValidationResult,
  TransformResult,
  BulkValidationResult,
  SelectiveValidationOptions,
  ValidationContext,
  SanitizationOptions,
  EnhancedValidationError,
  ValidationRule,
  ValidationDecoratorMetadata,
} from './validation';

// Re-export commonly used types with aliases for convenience
