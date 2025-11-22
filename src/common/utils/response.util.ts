/**
 * Response Utility Functions
 *
 * Provides strongly typed response helper functions for consistent API responses
 * across all controllers and services.
 *
 * This file re-exports from response-builder.util.ts and response-extensions.util.ts
 * to maintain backward compatibility.
 */

// Import extensions to register them on Response prototype
import './response-extensions.util';

// Re-export ResponseBuilder as ResponseUtil for backward compatibility
export { ResponseBuilder as ResponseUtil } from './response-builder.util';
export { ResponseBuilder } from './response-builder.util';

// Default export for convenience
export { ResponseBuilder as default } from './response-builder.util';
