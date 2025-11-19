/**
 * NeatOrm - Relationship System
 *
 * Revolutionary relationship system that eliminates circular dependencies
 * completely. Instead of importing entity classes in relationship definitions,
 * relationships are registered in a central registry.
 *
 * This module exports:
 * - Relationship types and configurations
 * - Relationship registry for storing and resolving relationships
 * - Helper classes (ReferencedBy, References, HasOne, ManyToMany)
 * - defineRelationships() function for registration
 *
 * The key innovation: relationships use string-based entity names or
 * constructor references but are registered separately from entity
 * definitions, preventing circular imports entirely.
 */

// Export types
export * from './types.js';

// Export registry
export * from './registry.js';

// Re-export commonly used exports
export {
  RelationRegistry,
  relationRegistry,
  ReferencedBy,
  References,
  HasOne,
  ManyToMany,
  defineRelationships,
  referencedBy,
  references,
} from './registry.js';

export type {
  RelationType,
  RelationConfig,
  ReferencedByConfig,
  ReferencesConfig,
  HasOneConfig,
  ManyToManyConfig,
  EntityRelations,
  RelationshipRegistry,
  ResolvedRelation,
  RelationshipResolution,
} from './types.js';

