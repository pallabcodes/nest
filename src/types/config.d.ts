/**
 * Configuration Type Definitions
 *
 * Strongly typed configuration interface for the entire application.
 * Ensures type safety when accessing configuration values.
 */

import type { Dialect } from 'sequelize';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  dialect: Dialect;
  pool: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
  retry: {
    max: number;
    delay?: number;
  };
  ssl?: boolean | object;
}

export interface JwtConfig {
  secret: string;
  accessTokenExpiration: string;
  refreshTokenExpiration: string;
}

export interface BcryptConfig {
  rounds: number;
}

export interface OtpConfig {
  expiration: number;
  length: number;
}

export interface AppConfig {
  name: string;
  env: 'development' | 'test' | 'staging' | 'production';
}

export interface CorsConfig {
  origin: string | string[];
  credentials?: boolean;
}

export interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  logDirectory: string;
  maxFiles: string;
  maxSize: string;
  enableScheduledDeletion: boolean;
  deletionSchedule: string;
}

/**
 * Complete application configuration interface
 */
export interface AppConfiguration {
  port: number;
  database: DatabaseConfig;
  jwt: JwtConfig;
  bcrypt: BcryptConfig;
  otp: OtpConfig;
  app: AppConfig;
  cors: CorsConfig;
  logger: LoggerConfig;
}

/**
 * Type-safe ConfigService extension
 * Provides strongly typed access to configuration values
 */
declare module '@nestjs/config' {
  interface ConfigService {
    get<T = any>(propertyPath: keyof AppConfiguration): T;
    get<T = any>(propertyPath: string): T;
    get<T = any>(propertyPath: keyof AppConfiguration, defaultValue: T): T;
    get<T = any>(propertyPath: string, defaultValue: T): T;
  }
}

export {};
