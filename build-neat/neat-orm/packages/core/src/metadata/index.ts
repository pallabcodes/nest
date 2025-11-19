/**
 * NeatOrm - Metadata System
 *
 * The metadata system provides the infrastructure for storing and retrieving
 * decorator-based configuration. It uses reflect-metadata for storage and
 * provides type-safe access patterns.
 *
 * This module exports:
 * - Metadata keys (symbols for metadata storage)
 * - Metadata types (interfaces for configuration)
 * - Metadata scanner (utilities for extraction and caching)
 * - Helper functions for metadata operations
 */

// Export metadata keys and types
export * from './keys.js';

// Export metadata scanner
export * from './scanner.js';

// Re-export for convenience
export { metadataScanner } from './scanner.js';

