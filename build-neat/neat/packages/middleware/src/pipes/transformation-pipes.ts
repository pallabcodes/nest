/**
 * Neat Framework - Transformation Pipes
 *
 * Specialized pipes for extracting and transforming data from HTTP requests.
 * These pipes handle route parameters, query parameters, headers, and request body.
 */

import type { HttpRequest } from '@neat/core';
import type { Pipe, PipeResult, PipeMetadata } from './pipe.interface';
import { Pipe as PipeDecorator } from './pipe.decorators';

/**
 * Body transformation pipe - extracts and transforms request body.
 */
@PipeDecorator({
  name: 'BodyTransformPipe',
  priority: 1,
  global: false,
  types: ['body']
})
export class BodyTransformPipe implements Pipe<any, any> {
  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult> {
    // Body is already extracted by the time it reaches pipes
    // This pipe just passes through or applies additional transformation
    return { success: true, value };
  }
}

/**
 * Query parameter extraction pipe.
 */
@PipeDecorator({
  name: 'QueryTransformPipe',
  priority: 1,
  global: false,
  types: ['query']
})
export class QueryTransformPipe implements Pipe<any, any> {
  constructor(private readonly request: HttpRequest) {}

  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult> {
    const { param } = metadata;

    if (param) {
      // Extract specific query parameter
      const queryValue = this.request.query?.[param];
      return { success: true, value: queryValue };
    } else {
      // Return all query parameters
      return { success: true, value: this.request.query || {} };
    }
  }
}

/**
 * Route parameter extraction pipe.
 */
@PipeDecorator({
  name: 'ParamTransformPipe',
  priority: 1,
  global: false,
  types: ['param']
})
export class ParamTransformPipe implements Pipe<any, any> {
  constructor(private readonly request: HttpRequest) {}

  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult> {
    const { param } = metadata;

    if (param) {
      // Extract specific route parameter
      const paramValue = this.request.params?.[param];
      return { success: true, value: paramValue };
    } else {
      // Return all route parameters
      return { success: true, value: this.request.params || {} };
    }
  }
}

/**
 * Header extraction pipe.
 */
@PipeDecorator({
  name: 'HeaderTransformPipe',
  priority: 1,
  global: false,
  types: ['header']
})
export class HeaderTransformPipe implements Pipe<any, any> {
  constructor(private readonly request: HttpRequest) {}

  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult> {
    const { data: headerName } = metadata;

    if (headerName) {
      // Extract specific header
      const headerValue = this.request.headers?.[headerName.toLowerCase()];
      return { success: true, value: headerValue };
    } else {
      // Return all headers
      return { success: true, value: this.request.headers || {} };
    }
  }
}

/**
 * File upload pipe - handles multipart form data.
 */
@PipeDecorator({
  name: 'FileTransformPipe',
  priority: 1,
  global: false,
  types: ['body']
})
export class FileTransformPipe implements Pipe<any, any> {
  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult> {
    // Check if value is a file upload
    if (value && typeof value === 'object' && value.buffer) {
      // It's a file buffer
      return { success: true, value };
    }

    // Check for multipart files
    if (value && typeof value === 'object' && value.files) {
      return { success: true, value: value.files };
    }

    return { success: true, value };
  }
}

/**
 * JSON parsing pipe - parses JSON strings.
 */
@PipeDecorator({
  name: 'JsonParsePipe',
  priority: 2,
  global: false,
  types: ['body']
})
export class JsonParsePipe implements Pipe<string, any> {
  async transform(value: string, metadata: PipeMetadata): Promise<PipeResult> {
    if (typeof value !== 'string') {
      return { success: true, value };
    }

    try {
      const parsed = JSON.parse(value);
      return { success: true, value: parsed };
    } catch (error) {
      return {
        success: false,
        errors: [{
          field: 'json',
          message: 'Invalid JSON format',
          value
        }]
      };
    }
  }
}

/**
 * Date parsing pipe - converts date strings to Date objects.
 */
@PipeDecorator({
  name: 'ParseDatePipe',
  priority: 5,
  global: false,
  types: ['param', 'query', 'body']
})
export class ParseDatePipe implements Pipe<string, Date> {
  async transform(value: string, metadata: PipeMetadata): Promise<PipeResult<Date>> {
    if (typeof value !== 'string') {
      return { success: true, value };
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'date',
          message: 'Invalid date format',
          value
        }]
      };
    }

    return { success: true, value: date };
  }
}

/**
 * Array parsing pipe - converts comma-separated strings to arrays.
 */
@PipeDecorator({
  name: 'ParseArrayPipe',
  priority: 5,
  global: false,
  types: ['param', 'query', 'body']
})
export class ParseArrayPipe implements Pipe<string | string[], any[]> {
  constructor(private readonly separator: string = ',') {}

  async transform(value: string | string[], metadata: PipeMetadata): Promise<PipeResult<any[]>> {
    if (Array.isArray(value)) {
      return { success: true, value };
    }

    if (typeof value !== 'string') {
      return { success: true, value: [value] };
    }

    const array = value.split(this.separator).map(item => item.trim());
    return { success: true, value: array };
  }
}

/**
 * Enum validation pipe - validates values against enum.
 */
@PipeDecorator({
  name: 'ParseEnumPipe',
  priority: 10,
  global: false,
  types: ['param', 'query', 'body']
})
export class ParseEnumPipe<T = any> implements Pipe<any, T> {
  constructor(private readonly enumType: any) {}

  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult<T>> {
    const enumValues = Object.values(this.enumType);

    if (!enumValues.includes(value)) {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'enum',
          message: `Value must be one of: ${enumValues.join(', ')}`,
          value
        }]
      };
    }

    return { success: true, value };
  }
}

/**
 * Range validation pipe - validates numeric ranges.
 */
@PipeDecorator({
  name: 'ParseRangePipe',
  priority: 10,
  global: false,
  types: ['param', 'query', 'body']
})
export class ParseRangePipe implements Pipe<number, number> {
  constructor(
    private readonly min?: number,
    private readonly max?: number
  ) {}

  async transform(value: number, metadata: PipeMetadata): Promise<PipeResult<number>> {
    if (typeof value !== 'number' || isNaN(value)) {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'range',
          message: 'Value must be a number',
          value
        }]
      };
    }

    if (this.min !== undefined && value < this.min) {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'range',
          message: `Value must be >= ${this.min}`,
          value
        }]
      };
    }

    if (this.max !== undefined && value > this.max) {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'range',
          message: `Value must be <= ${this.max}`,
          value
        }]
      };
    }

    return { success: true, value };
  }
}
