/**
 * Neat Framework - Container Module Barrel Export
 *
 * This module provides a unified interface to the dependency injection container
 * and all related functionality.
 */

// Main container class and functions
export { Container, createContainer, globalContainer } from './container.js';

// Type definitions and interfaces
export type {
  Constructor,
  ServiceOptions,
  ServiceInstance,
  ResolutionContext,
  Result,
} from './interfaces.js';
