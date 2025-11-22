/**
 * @deprecated Use types from '../../types/api' instead
 * This file is kept for backward compatibility
 */

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
}

export class SuccessResponse<T> implements ApiResponse<T> {
  success = true;
  data?: T;
  message?: string;

  constructor(data?: T, message?: string) {
    this.data = data;
    this.message = message;
  }
}

export class ErrorResponse implements ApiResponse {
  success = false;
  message?: string;
  errors?: ValidationError[];

  constructor(message?: string, errors?: ValidationError[]) {
    this.message = message;
    this.errors = errors;
  }
}
