/**
 * Neat Framework - Built-in Pipes
 *
 * Common pipe implementations for data transformation and validation.
 */

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import type { Pipe, PipeResult, PipeMetadata } from './pipe.interface';
import { Pipe as PipeDecorator } from './pipe.decorators';

/**
 * Validation pipe using class-validator.
 * Transforms plain objects to class instances and validates them.
 */
@PipeDecorator({
  name: 'ValidationPipe',
  priority: 10,
  global: false,
  types: ['body']
})
export class ValidationPipe implements Pipe {
  constructor(private readonly options: {
    transform?: boolean;
    whitelist?: boolean;
    forbidNonWhitelisted?: boolean;
  } = {}) {}

  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult> {
    const { transform = true, whitelist = true, forbidNonWhitelisted = true } = this.options;

    if (!metadata.metatype || typeof value !== 'object') {
      return { success: true, value };
    }

    try {
      // Transform plain object to class instance
      let transformedValue = value;
      if (transform) {
        transformedValue = plainToClass(metadata.metatype, value, {
          excludeExtraneousValues: whitelist
        });
      }

      // Validate the transformed value
      const errors = await validate(transformedValue, {
        whitelist,
        forbidNonWhitelisted,
        skipMissingProperties: false
      });

      if (errors.length > 0) {
        const pipeErrors = errors.map(error => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
          value: error.value,
          constraints: error.constraints
        }));

        return {
          success: false,
          errors: pipeErrors
        };
      }

      return { success: true, value: transformedValue };
    } catch (error) {
      return {
        success: false,
        errors: [{
          field: 'validation',
          message: error instanceof Error ? error.message : 'Validation failed',
          value
        }]
      };
    }
  }
}

/**
 * ParseInt pipe - converts string to number.
 */
@PipeDecorator({
  name: 'ParseIntPipe',
  priority: 5,
  global: false,
  types: ['param', 'query']
})
export class ParseIntPipe implements Pipe<string, number> {
  async transform(value: string, metadata: PipeMetadata): Promise<PipeResult<number>> {
    if (typeof value !== 'string') {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'value',
          message: 'Value must be a string',
          value
        }]
      };
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'value',
          message: 'Invalid number format',
          value
        }]
      };
    }

    return { success: true, value: parsed };
  }
}

/**
 * ParseFloat pipe - converts string to float.
 */
@PipeDecorator({
  name: 'ParseFloatPipe',
  priority: 5,
  global: false,
  types: ['param', 'query']
})
export class ParseFloatPipe implements Pipe<string, number> {
  async transform(value: string, metadata: PipeMetadata): Promise<PipeResult<number>> {
    if (typeof value !== 'string') {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'value',
          message: 'Value must be a string',
          value
        }]
      };
    }

    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'value',
          message: 'Invalid number format',
          value
        }]
      };
    }

    return { success: true, value: parsed };
  }
}

/**
 * ParseBool pipe - converts string to boolean.
 */
@PipeDecorator({
  name: 'ParseBoolPipe',
  priority: 5,
  global: false,
  types: ['param', 'query']
})
export class ParseBoolPipe implements Pipe<string, boolean> {
  async transform(value: string, metadata: PipeMetadata): Promise<PipeResult<boolean>> {
    if (typeof value !== 'string') {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'value',
          message: 'Value must be a string',
          value
        }]
      };
    }

    const lowerValue = value.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
      return { success: true, value: true };
    } else if (['false', '0', 'no', 'off'].includes(lowerValue)) {
      return { success: true, value: false };
    }

    return {
      success: false,
      errors: [{
        field: metadata.field || 'value',
        message: 'Invalid boolean value',
        value
      }]
    };
  }
}

/**
 * UUID validation pipe.
 */
@PipeDecorator({
  name: 'ParseUUIDPipe',
  priority: 5,
  global: false,
  types: ['param', 'query']
})
export class ParseUUIDPipe implements Pipe<string, string> {
  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  async transform(value: string, metadata: PipeMetadata): Promise<PipeResult<string>> {
    if (typeof value !== 'string') {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'value',
          message: 'Value must be a string',
          value
        }]
      };
    }

    if (!this.uuidRegex.test(value)) {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'value',
          message: 'Invalid UUID format',
          value
        }]
      };
    }

    return { success: true, value };
  }
}

/**
 * Email validation pipe.
 */
@PipeDecorator({
  name: 'ParseEmailPipe',
  priority: 5,
  global: false,
  types: ['param', 'query', 'body']
})
export class ParseEmailPipe implements Pipe<string, string> {
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async transform(value: string, metadata: PipeMetadata): Promise<PipeResult<string>> {
    if (typeof value !== 'string') {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'value',
          message: 'Value must be a string',
          value
        }]
      };
    }

    if (!this.emailRegex.test(value)) {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'value',
          message: 'Invalid email format',
          value
        }]
      };
    }

    return { success: true, value };
  }
}

/**
 * Default value pipe - provides default values for undefined/null values.
 */
@PipeDecorator({
  name: 'DefaultValuePipe',
  priority: 1,
  global: false
})
export class DefaultValuePipe implements Pipe {
  constructor(private readonly defaultValue: any) {}

  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult> {
    if (value == null) {
      return { success: true, value: this.defaultValue };
    }
    return { success: true, value };
  }
}

/**
 * Trim string pipe - trims whitespace from strings.
 */
@PipeDecorator({
  name: 'TrimPipe',
  priority: 1,
  global: false,
  types: ['body', 'query', 'param']
})
export class TrimPipe implements Pipe<string, string> {
  async transform(value: string, metadata: PipeMetadata): Promise<PipeResult<string>> {
    if (typeof value !== 'string') {
      return { success: true, value };
    }

    return { success: true, value: value.trim() };
  }
}

/**
 * Uppercase pipe - converts strings to uppercase.
 */
@PipeDecorator({
  name: 'UppercasePipe',
  priority: 2,
  global: false,
  types: ['body', 'query', 'param']
})
export class UppercasePipe implements Pipe<string, string> {
  async transform(value: string, metadata: PipeMetadata): Promise<PipeResult<string>> {
    if (typeof value !== 'string') {
      return { success: true, value };
    }

    return { success: true, value: value.toUpperCase() };
  }
}

/**
 * Lowercase pipe - converts strings to lowercase.
 */
@PipeDecorator({
  name: 'LowercasePipe',
  priority: 2,
  global: false,
  types: ['body', 'query', 'param']
})
export class LowercasePipe implements Pipe<string, string> {
  async transform(value: string, metadata: PipeMetadata): Promise<PipeResult<string>> {
    if (typeof value !== 'string') {
      return { success: true, value };
    }

    return { success: true, value: value.toLowerCase() };
  }
}
