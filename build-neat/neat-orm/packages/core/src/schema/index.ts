/**
 * Schema Module
 *
 * Provides utilities for database schema generation and management.
 *
 * @module schema
 */

export * from './index-generator.js';
export {
  IndexGenerator,
  generateIndexSQL,
} from './index-generator.js';
export type {
  DatabaseType,
  IndexGeneratorOptions,
  GeneratedIndexSQL,
} from './index-generator.js';

