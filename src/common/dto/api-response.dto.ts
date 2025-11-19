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
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export class SuccessResponse<T> implements ApiResponse<T> {
  success = true;
  data?: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };

  constructor(data?: T, message?: string, meta?: { page?: number; limit?: number; total?: number }) {
    this.data = data;
    this.message = message;
    this.meta = meta;
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

