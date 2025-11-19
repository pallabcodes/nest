/**
 * Neat Framework - Exception Filter System
 *
 * Exception filters catch and handle errors, transforming them into appropriate
 * HTTP responses. They provide centralized error handling and formatting.
 *
 * Key Features:
 * - Error type detection and handling
 * - HTTP status code mapping
 * - Error response formatting
 * - Auto-discovery integration
 * - Custom error classes support
 *
 * Usage: Exception filters are applied via decorators and auto-discovered by the framework.
 */

import type { HttpRequest, HttpResponse } from '@neat/core';

/**
 * Exception filter result.
 * Contains the formatted HTTP response for the exception.
 */
export interface ExceptionFilterResult {
  readonly statusCode: number;
  readonly response: any;
  readonly headers?: Record<string, string>;
}

/**
 * Exception filter interface.
 * Filters can handle specific exception types and format responses.
 */
export interface ExceptionFilter<TError = Error> {
  catch(exception: TError, context: ExceptionFilterContext): ExceptionFilterResult;
}

/**
 * Exception filter function signature.
 */
export type ExceptionFilterFunction<TError = Error> = (
  exception: TError,
  context: ExceptionFilterContext
) => ExceptionFilterResult;

/**
 * Exception filter context.
 */
export interface ExceptionFilterContext {
  readonly request: HttpRequest;
  readonly response: HttpResponse;
  readonly route?: {
    readonly method: string;
    readonly path: string;
    readonly controller: string;
    readonly handler: string;
  };
  readonly user?: any;
  readonly timestamp: Date;
}

/**
 * Exception filter metadata for auto-discovery.
 */
export interface ExceptionFilterMetadata {
  readonly name: string;
  readonly priority: number;
  readonly global: boolean;
  readonly exceptionTypes?: string[];
}

/**
 * Base exception class for framework exceptions.
 */
export abstract class BaseException extends Error {
  abstract readonly statusCode: number;
  readonly errorCode?: string;

  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = this.constructor.name;
  }

  /**
   * Convert to HTTP response.
   */
  toHttpResponse(): ExceptionFilterResult {
    return {
      statusCode: this.statusCode,
      response: {
        success: false,
        error: {
          message: this.message,
          code: this.errorCode,
          type: this.name,
          timestamp: new Date().toISOString(),
          ...(this.details && { details: this.details })
        }
      }
    };
  }
}
