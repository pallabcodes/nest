/**
 * API Response Type Definitions
 *
 * Standardized response structures for consistent API responses
 * across all endpoints.
 */

/**
 * Standard API response wrapper
 * All API responses follow this structure for consistency
 */
export interface ApiResponse<T = unknown> {
  /** Indicates if the request was successful */
  success: boolean;
  /** Response data (type varies by endpoint) */
  data: T;
  /** Optional message for additional context */
  message?: string;
}

/**
 * Paginated response metadata
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

/**
 * Paginated API response
 * Used for list endpoints with pagination
 */
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  /** Pagination metadata */
  pagination: PaginationMeta;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  /** Indicates the request failed */
  success: false;
  /** Error message */
  message: string;
  /** Optional error code */
  errorCode?: string;
  /** Optional additional error details */
  details?: Record<string, unknown>;
}

/**
 * Success message response
 * Used for operations that don't return data (e.g., delete, update)
 */
export interface SuccessMessageResponse extends ApiResponse<null> {
  /** Success message */
  message: string;
}

/**
 * Health check response structure
 */
export interface HealthResponse
  extends ApiResponse<{
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
    version?: string;
  }> {}

/**
 * Readiness check response structure
 */
export interface ReadinessResponse
  extends ApiResponse<{
    status: 'ready' | 'not ready';
    database: 'connected' | 'disconnected' | 'unknown';
    timestamp: string;
  }> {}

/**
 * Validation error response structure
 */
export interface ValidationErrorResponse extends ErrorResponse {
  errors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

/**
 * Generic service response type
 * Use this for service methods that return data
 */
export type ServiceResponse<T> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

/**
 * Repository operation result type
 * Provides consistent typing for database operations
 */
export type RepositoryResult<T> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

/**
 * Controller method return type utility
 * Ensures controllers return properly typed responses
 */
export type ControllerResponse<T> =
  | ApiResponse<T>
  | PaginatedResponse<T>
  | ErrorResponse
  | SuccessMessageResponse;

/**
 * Utility type for extracting data from ApiResponse
 */
export type ApiResponseData<T extends ApiResponse<unknown>> = T['data'];

/**
 * Utility type for creating strongly typed API responses
 */
export type CreateApiResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

/**
 * Utility type for creating strongly typed error responses
 */
export type CreateErrorResponse = {
  success: false;
  message: string;
  errorCode?: string;
  details?: Record<string, unknown>;
};
