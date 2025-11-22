/**
 * Validation Type Definitions
 *
 * Strongly typed validation interfaces and utilities for DTOs and validation pipes.
 */

import { ValidationError } from 'class-validator';
import { TransformFnParams } from 'class-transformer';

/**
 * Custom validation constraint interface
 */
export interface ValidationConstraint {
  targetName: string;
  property: string;
  constraints: Record<string, any>;
}

/**
 * Validation pipe options interface
 */
export interface ValidationPipeOptions {
  transform?: boolean;
  disableErrorMessages?: boolean;
  dismissDefaultMessages?: boolean;
  errorHttpStatusCode?: number;
  exceptionFactory?: (errors: ValidationError[]) => any;
  validateCustomDecorators?: boolean;
  transformOptions?: {
    enableImplicitConversion?: boolean;
    excludeExtraneousValues?: boolean;
    exposeDefaultValues?: boolean;
    exposeUnsetFields?: boolean;
  };
}

/**
 * Transform function type for class-transformer
 */
export type TransformFunction = (params: TransformFnParams) => any;

/**
 * Custom decorator metadata interface
 */
export interface CustomDecoratorMetadata {
  target: Function;
  propertyName: string;
  descriptor?: PropertyDescriptor;
}

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: ValidationError[];
    };

/**
 * DTO transformation result
 */
export type TransformResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Bulk validation result for arrays
 */
export type BulkValidationResult<T> =
  | {
      success: true;
      data: T[];
      validCount: number;
      invalidCount: number;
    }
  | {
      success: false;
      errors: Array<{
        index: number;
        item: T;
        errors: ValidationError[];
      }>;
    };

/**
 * Selective validation options
 */
export interface SelectiveValidationOptions {
  skipValidation?: boolean;
  skipTransformation?: boolean;
  skipMissingProperties?: boolean;
  skipNullProperties?: boolean;
  skipUndefinedProperties?: boolean;
}

/**
 * Validation context interface
 */
export interface ValidationContext {
  operation: 'create' | 'update' | 'delete' | 'query';
  user?: import('./auth').AuthenticatedUser;
  isPublic?: boolean;
  skipValidation?: boolean;
}

/**
 * Sanitization options for input data
 */
export interface SanitizationOptions {
  trimStrings?: boolean;
  removeHtml?: boolean;
  normalizeEmail?: boolean;
  removeNullValues?: boolean;
  removeUndefinedValues?: boolean;
}

/**
 * Enhanced validation error interface
 */
export interface EnhancedValidationError extends ValidationError {
  field: string;
  message: string;
  value?: any;
  constraints?: Record<string, string>;
  children?: EnhancedValidationError[];
}

/**
 * Validation rule interface for custom validators
 */
export interface ValidationRule<T = any> {
  name: string;
  validate: (value: T, context?: ValidationContext) => boolean | Promise<boolean>;
  message: (value: T) => string;
  code?: string;
}

/**
 * Custom validation decorator metadata
 */
export interface ValidationDecoratorMetadata {
  propertyName: string;
  target: Function;
  constraints: ValidationRule[];
  options?: {
    each?: boolean;
    groups?: string[];
    always?: boolean;
    context?: ValidationContext;
  };
}

export {};
