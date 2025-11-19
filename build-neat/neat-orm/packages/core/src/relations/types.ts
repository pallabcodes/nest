/**
 * NeatOrm - Relationship Types
 *
 * Type definitions for the relationship system. These types power the
 * relationship registry and enable compile-time validation of entity
 * relationships without circular dependencies.
 *
 * Key TypeScript Excellence Features:
 * - Type-safe relationship configuration
 * - Generic type parameters for entity references
 * - Branded types for relationship keys
 * - Discriminated unions for relationship types
 *
 * TypeScript Compilation:
 * Relationship types are used at compile time for type checking and at
 * runtime for relationship resolution. The types ensure that relationships
 * are configured correctly without requiring circular imports.
 *
 * Runtime Behavior:
 * Relationship metadata is stored in the central registry and resolved
 * lazily when needed. This prevents circular dependency issues while
 * maintaining type safety.
 *
 * Framework Integration:
 * Relationship types integrate with:
 * - Relationship registry for entity linking
 * - Query builder for JOIN operations
 * - Eager/lazy loading system
 * - N+1 prevention system
 *
 * Pain Points Addressed:
 * - Circular dependencies from importing entities
 * - Inconsistent relationship configuration
 * - Runtime errors from missing relationships
 * - Complex bidirectional relationship setup
 *
 * Research:
 * Inspired by Ecto's schema associations and Django's string-based ForeignKey.
 * Uses lazy resolution and string-based entity references to eliminate
 * circular dependencies completely.
 */

/**
 * Relationship type discriminator.
 */
export type RelationType = 'referencedBy' | 'references' | 'hasOne' | 'manyToMany';

/**
 * Base interface for all relationship configurations.
 */
export interface BaseRelationConfig {
  /**
   * Foreign key column name.
   * For hasMany/hasOne: foreign key in the related table
   * For belongsTo: foreign key in this table
   * For manyToMany: foreign key in the junction table
   */
  foreignKey: string;

  /**
   * Local key column name (usually the primary key).
   * Default: 'id'
   */
  localKey?: string;

  /**
   * Property name on the related entity for the inverse relationship.
   * Used for bidirectional relationships.
   */
  inverse?: string;

  /**
   * Whether to load this relationship eagerly by default.
   * Default: false (lazy loading)
   */
  eager?: boolean;

  /**
   * Cascade delete behavior.
   * When true, deleting the parent deletes related entities.
   */
  cascade?: boolean;

  /**
   * On delete action (for database-level foreign keys).
   */
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

/**
 * ReferencedBy relationship configuration.
 * The "parent" side - this table is referenced by foreign keys in other tables.
 *
 * SQL Concept: The table with the PRIMARY KEY that other tables reference.
 * Example: User isReferencedBy Posts (posts.userId references users.id)
 */
export interface ReferencedByConfig extends BaseRelationConfig {
  type: 'referencedBy';
  /**
   * Target entity constructor or entity name.
   */
  target: Function | string;
}

/**
 * References relationship configuration.
 * The "child" side - this table contains the foreign key referencing another table.
 *
 * SQL Concept: The table with the FOREIGN KEY column.
 * Example: Post references User (posts.userId is foreign key to users.id)
 */
export interface ReferencesConfig extends BaseRelationConfig {
  type: 'references';
  /**
   * Target entity constructor or entity name.
   */
  target: Function | string;
}

/**
 * HasOne relationship configuration.
 * Entity has one related entity.
 *
 * Example: User hasOne Profile
 */
export interface HasOneConfig extends BaseRelationConfig {
  type: 'hasOne';
  /**
   * Target entity constructor or entity name.
   */
  target: Function | string;
}

/**
 * ManyToMany relationship configuration.
 * Many-to-many relationship through a junction table.
 *
 * Example: Student manyToMany Courses
 */
export interface ManyToManyConfig extends BaseRelationConfig {
  type: 'manyToMany';
  /**
   * Target entity constructor or entity name.
   */
  target: Function | string;
  /**
   * Junction table name.
   * Required for many-to-many relationships.
   */
  throughTable: string;
  /**
   * Foreign key in junction table pointing to this entity.
   */
  thisForeignKey?: string;
  /**
   * Foreign key in junction table pointing to related entity.
   */
  otherForeignKey?: string;
}

/**
 * Union type of all relationship configurations.
 */
export type RelationConfig =
  | ReferencedByConfig
  | ReferencesConfig
  | HasOneConfig
  | ManyToManyConfig;

/**
 * Entity relationship map.
 * Maps property names to relationship configurations.
 */
export interface EntityRelations {
  [propertyKey: string]: RelationConfig;
}

/**
 * Registry of all entity relationships.
 * Maps entity names/constructors to their relationship definitions.
 */
export interface RelationshipRegistry {
  [entityName: string]: EntityRelations;
}

/**
 * Resolved relationship with entity constructor.
 * Used after lazy resolution of string-based entity references.
 */
export interface ResolvedRelation {
  type: RelationType;
  targetEntity: Function;
  foreignKey: string;
  localKey: string;
  inverse?: string;
  eager: boolean;
  cascade: boolean;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  throughTable?: string;
  thisForeignKey?: string;
  otherForeignKey?: string;
}

/**
 * Relationship resolution result.
 * Contains both the configuration and metadata for query building.
 */
export interface RelationshipResolution {
  config: ResolvedRelation;
  sourceEntity: Function;
  targetEntity: Function;
  propertyKey: string;
}

