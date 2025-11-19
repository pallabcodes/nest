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
export interface ApiResponse<T = any> {
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
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
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
  details?: any;
}

/**
 * Success message response
 * Used for operations that don't return data (e.g., delete, update)
 */
export interface SuccessMessageResponse extends ApiResponse<null> {
  /** Success message */
  message: string;
}

