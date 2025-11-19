/**
 * Neat Framework - Decorators Barrel Export
 *
 * This module provides a unified interface to all framework decorators.
 * Includes dependency injection, HTTP routing, and application startup decorators.
 */

// Dependency injection decorators
export * from './injectable.js';

// HTTP decorators
export * from './controller.js';
export * from './methods.js';

// Application startup decorators
export * from './startup.js';

// Strategy pattern decorators
export * from './strategy.js';
export * from './factory.js';

// Application lifecycle management
export { NeatApplication } from './application.js';

// Re-export commonly used decorators for convenience
export {
  Injectable,
  InjectableSingleton,
  InjectableTransient,
  InjectableRequest,
  InjectableGlobal,
} from './injectable.js';

export { Controller } from './controller.js';

export {
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Options,
  Head,
} from './methods.js';

export { StartupApplication } from './startup.js';

export { Strategy } from './strategy.js';
export { FactoryPattern } from './factory.js';
