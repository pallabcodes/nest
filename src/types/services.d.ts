/**
 * Service Type Definitions
 *
 * Strongly typed interfaces for all service classes to ensure consistent
 * method signatures and return types across the application.
 */

import type { AuthenticatedUser, LoginResponse, RegisterResponse, TokenPair } from './auth';
import type { ServiceResponse, RepositoryResult } from './api';
import type { CreateUserData, UpdateUserData } from './database';

// Auth DTOs - Import types from auth module
// These are class types, so we use InstanceType pattern or define interfaces
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface VerifyOtpDto {
  email: string;
  code: string;
}

export interface ResendOtpDto {
  email: string;
  type: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

/**
 * Base service interface with common CRUD operations
 */
export interface BaseService<T, CreateDto, UpdateDto> {
  create(data: CreateDto, user?: AuthenticatedUser): Promise<ServiceResponse<T>>;
  findAll(options?: FindAllOptions): Promise<ServiceResponse<T[]>>;
  findOne(id: number | string, user?: AuthenticatedUser): Promise<ServiceResponse<T>>;
  update(
    id: number | string,
    data: UpdateDto,
    user?: AuthenticatedUser,
  ): Promise<ServiceResponse<T>>;
  delete(id: number | string, user?: AuthenticatedUser): Promise<ServiceResponse<boolean>>;
  exists(id: number | string): Promise<boolean>;
}

/**
 * Pagination options for findAll operations
 */
export interface FindAllOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, string | number | boolean | null | undefined>;
  include?: string[];
  search?: string;
  user?: AuthenticatedUser;
}

/**
 * Authentication service interface
 */
export interface AuthServiceInterface {
  register(registerDto: RegisterDto): Promise<ServiceResponse<RegisterResponse>>;
  login(loginDto: LoginDto): Promise<ServiceResponse<LoginResponse>>;
  refreshToken(refreshTokenDto: RefreshTokenDto): Promise<ServiceResponse<TokenPair>>;
  verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<ServiceResponse<{ message: string }>>;
  forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ServiceResponse<{ message: string }>>;
  resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ServiceResponse<{ message: string }>>;
  resendOtp(resendOtpDto: ResendOtpDto): Promise<ServiceResponse<{ message: string }>>;
  logout(user: AuthenticatedUser): Promise<ServiceResponse<{ message: string }>>;
  validateToken(token: string): Promise<ServiceResponse<AuthenticatedUser>>;
}

/**
 * User service interface
 * T represents the User domain model type
 */
export interface UserServiceInterface<T = CreateUserData>
  extends BaseService<T, CreateUserData, UpdateUserData> {
  findByEmail(email: string): Promise<ServiceResponse<T>>;
  updateProfile(
    userId: number | string,
    data: Partial<UpdateUserData>,
    user?: AuthenticatedUser,
  ): Promise<ServiceResponse<T>>;
  changePassword(
    userId: number | string,
    oldPassword: string,
    newPassword: string,
  ): Promise<ServiceResponse<{ message: string }>>;
  assignRole(
    userId: number | string,
    roleId: number,
    assigner?: AuthenticatedUser,
  ): Promise<ServiceResponse<T>>;
  removeRole(
    userId: number | string,
    roleId: number,
    assigner?: AuthenticatedUser,
  ): Promise<ServiceResponse<T>>;
  getUserWithRoles(userId: number | string): Promise<ServiceResponse<T>>;
}

/**
 * Repository base interface
 */
export interface BaseRepository<T> {
  create(data: Partial<T>): Promise<RepositoryResult<T>>;
  findAll(options?: FindAllOptions): Promise<RepositoryResult<T[]>>;
  findById(id: number | string): Promise<RepositoryResult<T>>;
  findOne(
    options?: Partial<T> | { where?: Partial<T>; include?: string[] },
  ): Promise<RepositoryResult<T>>;
  update(id: number | string, data: Partial<T>): Promise<RepositoryResult<T>>;
  delete(id: number | string): Promise<RepositoryResult<boolean>>;
  exists(id: number | string): Promise<boolean>;
  count(options?: { where?: Partial<T> }): Promise<number>;
}

/**
 * File upload service interface
 */
export interface FileUploadServiceInterface {
  uploadFile(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<ServiceResponse<FileUploadResult>>;
  uploadMultipleFiles(
    files: Express.Multer.File[],
    options?: UploadOptions,
  ): Promise<ServiceResponse<FileUploadResult[]>>;
  deleteFile(
    fileId: string,
    user?: AuthenticatedUser,
  ): Promise<ServiceResponse<{ message: string }>>;
  getFileUrl(fileId: string, expiresIn?: number): Promise<ServiceResponse<{ url: string }>>;
  getFileInfo(fileId: string): Promise<ServiceResponse<FileInfo>>;
}

/**
 * Upload options interface
 */
export interface UploadOptions {
  folder?: string;
  allowedTypes?: string[];
  maxSize?: number;
  public?: boolean;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * File upload result interface
 */
export interface FileUploadResult {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
  uploadedBy?: number;
}

/**
 * File information interface
 */
export interface FileInfo extends FileUploadResult {
  metadata?: Record<string, string | number | boolean | null | undefined>;
  public: boolean;
  folder?: string;
}

/**
 * Logger service interface
 */
export interface LoggerServiceInterface {
  error(message: string, meta?: Record<string, unknown>, error?: Error): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  log(level: string, message: string, meta?: Record<string, unknown>): void;
  createChildLogger(context: string): LoggerServiceInterface;
}

/**
 * Cache service interface
 */
export interface CacheServiceInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  deleteByPattern(pattern: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
  keys(pattern?: string): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * Email service interface
 */
export interface EmailServiceInterface {
  sendEmail(options: EmailOptions): Promise<ServiceResponse<{ messageId: string }>>;
  sendTemplateEmail(
    template: string,
    data: Record<string, string | number | boolean | null | undefined>,
    options: EmailOptions,
  ): Promise<ServiceResponse<{ messageId: string }>>;
  sendBulkEmails(
    emails: EmailOptions[],
  ): Promise<ServiceResponse<{ successCount: number; failureCount: number }>>;
}

/**
 * Email options interface
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  templateData?: Record<string, string | number | boolean | null | undefined>;
}

export {};
