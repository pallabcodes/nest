/**
 * Neat Framework - Database Entity Decorators
 *
 * This module provides decorators for defining database entities, relationships,
 * and schema metadata. These decorators work with the metadata scanner to
 * automatically generate database schemas and provide type-safe data access.
 *
 * Key TypeScript Excellence Features:
 * - Class and property decorators with proper typing
 * - Relationship decorators with compile-time validation
 * - Generic constraints for type safety
 * - Metadata-driven schema generation
 * - Template literal types for column naming
 *
 * Decorators: @Entity, @Column, @PrimaryKey, @OneToOne, @OneToMany, etc.
 * Integration: Works seamlessly with repositories and query builders
 *
 * Pain Points Addressed: Eliminates manual schema definition,
 * provides compile-time relationship validation, and enables
 * automatic migration generation.
 *
 * Research: Inspired by TypeORM decorators but with stronger typing
 * and better integration with Neat's metadata system.
 */
import 'reflect-metadata';
import { brandTableName, brandColumnName } from './types.js';
// ========================================
// METADATA KEYS
// ========================================
/**
 * Metadata keys for database decorators.
 */
export const DatabaseMetadataKeys = {
    ENTITY: 'neat:entity',
    COLUMN: 'neat:column',
    RELATION: 'neat:relation',
    INDEX: 'neat:index',
    UNIQUE: 'neat:unique',
    PRIMARY_KEY: 'neat:primary_key',
};
// ========================================
// ENTITY DECORATOR
// ========================================
/**
 * Entity decorator - marks a class as a database entity.
 *
 * @param options Configuration options for the entity
 */
export function Entity(options = {}) {
    return function (target) {
        const entityOptions = {
            name: options.name || target.name.toLowerCase(),
            schema: options.schema || 'public',
            synchronize: options.synchronize ?? true,
            ...options
        };
        // Store entity metadata
        Reflect.defineMetadata(DatabaseMetadataKeys.ENTITY, entityOptions, target);
        // Ensure the class extends BaseEntity
        if (!(target.prototype instanceof (require('./types.js').BaseEntity))) {
            // In a real implementation, we might enforce this
            // For now, we'll just log a warning
            console.warn(`Entity ${target.name} should extend BaseEntity for full type safety`);
        }
    };
}
// ========================================
// COLUMN DECORATORS
// ========================================
/**
 * Column decorator - defines a database column.
 *
 * @param options Column configuration options
 */
export function Column(options = {}) {
    return function (target, propertyKey) {
        if (typeof propertyKey === 'symbol') {
            throw new Error('Column decorator does not support symbol properties');
        }
        const columnOptions = {
            name: options.name || propertyKey,
            type: options.type || inferColumnType(target, propertyKey),
            nullable: options.nullable ?? false,
            ...options
        };
        // Store column metadata
        Reflect.defineMetadata(`${DatabaseMetadataKeys.COLUMN}:${propertyKey}`, columnOptions, target.constructor);
        // Mark as primary key if specified
        if (options.primary) {
            Reflect.defineMetadata(DatabaseMetadataKeys.PRIMARY_KEY, propertyKey, target.constructor);
        }
    };
}
/**
 * Primary key column decorator.
 */
export function PrimaryKey(options = {}) {
    return Column({ ...options, primary: true });
}
/**
 * Primary generated column decorator (auto-increment).
 */
export function PrimaryGeneratedColumn(options = {}) {
    return Column({ ...options, primary: true, generated: 'increment' });
}
/**
 * UUID primary key column decorator.
 */
export function PrimaryGeneratedUuidColumn(options = {}) {
    return Column({ ...options, primary: true, generated: 'uuid', type: 'uuid' });
}
/**
 * Create date column decorator.
 */
export function CreateDateColumn(options = {}) {
    return Column({ ...options, type: 'timestamp', default: 'CURRENT_TIMESTAMP' });
}
/**
 * Update date column decorator.
 */
export function UpdateDateColumn(options = {}) {
    return Column({ ...options, type: 'timestamp', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' });
}
/**
 * Version column decorator for optimistic locking.
 */
export function VersionColumn(options = {}) {
    return Column({ ...options, type: 'int', default: 1 });
}
// ========================================
// RELATIONSHIP DECORATORS
// ========================================
/**
 * One-to-one relationship decorator.
 */
export function OneToOne(targetEntity, options = {}) {
    return createRelationDecorator('one-to-one', targetEntity, options);
}
/**
 * One-to-many relationship decorator.
 */
export function OneToMany(targetEntity, inverseProperty, options = {}) {
    return createRelationDecorator('one-to-many', targetEntity, {
        ...options,
        inverseProperty: inverseProperty
    });
}
/**
 * Many-to-one relationship decorator.
 */
export function ManyToOne(targetEntity, options = {}) {
    return createRelationDecorator('many-to-one', targetEntity, options);
}
/**
 * Many-to-many relationship decorator.
 */
export function ManyToMany(targetEntity, options = {}) {
    return createRelationDecorator('many-to-many', targetEntity, options);
}
/**
 * Join column decorator for relationships.
 */
export function JoinColumn(options = {}) {
    return function (target, propertyKey) {
        if (typeof propertyKey === 'symbol') {
            throw new Error('JoinColumn decorator does not support symbol properties');
        }
        // This decorator modifies the relationship metadata
        // In a real implementation, it would update the existing relation metadata
        Reflect.defineMetadata(`neat:join_column:${propertyKey}`, options, target.constructor);
    };
}
/**
 * Join table decorator for many-to-many relationships.
 */
export function JoinTable(options = {}) {
    return function (target, propertyKey) {
        if (typeof propertyKey === 'symbol') {
            throw new Error('JoinTable decorator does not support symbol properties');
        }
        // This decorator modifies the relationship metadata
        Reflect.defineMetadata(`neat:join_table:${propertyKey}`, options, target.constructor);
    };
}
/**
 * Create a relationship decorator.
 */
function createRelationDecorator(type, targetEntity, options) {
    return function (target, propertyKey) {
        if (typeof propertyKey === 'symbol') {
            throw new Error('Relationship decorators do not support symbol properties');
        }
        const relationOptions = {
            cascade: options.cascade || [],
            eager: options.eager ?? false,
            ...options
        };
        // Store relation metadata
        Reflect.defineMetadata(`${DatabaseMetadataKeys.RELATION}:${propertyKey}`, {
            type,
            targetEntity,
            ...relationOptions
        }, target.constructor);
    };
}
// ========================================
// INDEX AND CONSTRAINT DECORATORS
// ========================================
/**
 * Index decorator - creates a database index.
 */
export function Index(name, options = {}) {
    return function (target, propertyKey) {
        const propertyKeyStr = propertyKey ? String(propertyKey) : 'compound';
        const indexOptions = {
            name: name || `IDX_${target.constructor?.name || target.name}_${propertyKeyStr}`,
            isUnique: options.isUnique ?? false,
            isSpatial: options.isSpatial ?? false,
            ...options
        };
        // Determine columns based on usage
        let columns = [];
        if (typeof propertyKey === 'string') {
            // Property decorator - single column index
            columns = [propertyKey];
        }
        else if (options.columns) {
            // Class decorator with specified columns
            columns = options.columns;
        }
        const indexMetadata = {
            ...indexOptions,
            columns
        };
        // Store index metadata
        const key = propertyKey
            ? `${DatabaseMetadataKeys.INDEX}:${propertyKeyStr}`
            : DatabaseMetadataKeys.INDEX;
        const existingIndices = Reflect.getMetadata(key, target) || [];
        Reflect.defineMetadata(key, [...existingIndices, indexMetadata], target);
    };
}
/**
 * Unique constraint decorator.
 */
export function Unique(name, columns) {
    return function (target, propertyKey) {
        const propertyKeyStr = propertyKey ? String(propertyKey) : 'compound';
        const uniqueName = name || `UQ_${target.constructor?.name || target.name}_${propertyKeyStr}`;
        // Determine columns based on usage
        let uniqueColumns = [];
        if (typeof propertyKey === 'string') {
            // Property decorator - single column unique
            uniqueColumns = [propertyKey];
        }
        else if (columns) {
            // Class decorator with specified columns
            uniqueColumns = columns;
        }
        const uniqueMetadata = {
            name: uniqueName,
            columns: uniqueColumns
        };
        // Store unique metadata
        const key = propertyKey
            ? `${DatabaseMetadataKeys.UNIQUE}:${propertyKeyStr}`
            : DatabaseMetadataKeys.UNIQUE;
        const existingUniques = Reflect.getMetadata(key, target) || [];
        Reflect.defineMetadata(key, [...existingUniques, uniqueMetadata], target);
    };
}
// ========================================
// UTILITY FUNCTIONS
// ========================================
/**
 * Infer column type from TypeScript property type.
 */
function inferColumnType(target, propertyKey) {
    const designType = Reflect.getMetadata('design:type', target, propertyKey);
    if (!designType)
        return 'string';
    switch (designType.name) {
        case 'String':
            return 'string';
        case 'Number':
            return 'int';
        case 'Boolean':
            return 'boolean';
        case 'Date':
            return 'timestamp';
        case 'Object':
            return 'json';
        default:
            return 'string';
    }
}
// ========================================
// METADATA EXTRACTION
// ========================================
/**
 * Extract entity metadata from decorated class.
 */
export function extractEntityMetadata(target) {
    const entityOptions = Reflect.getMetadata(DatabaseMetadataKeys.ENTITY, target) || {};
    // Get all property keys
    const prototype = target.prototype;
    const propertyKeys = Object.getOwnPropertyNames(prototype).filter(key => key !== 'constructor' && typeof prototype[key] !== 'function');
    // Extract columns
    const columns = new Map();
    for (const propertyKey of propertyKeys) {
        const columnOptions = Reflect.getMetadata(`${DatabaseMetadataKeys.COLUMN}:${propertyKey}`, target);
        if (columnOptions) {
            const columnName = brandColumnName(columnOptions.name || propertyKey);
            columns.set(columnName, {
                propertyName: propertyKey,
                columnName,
                ...columnOptions
            });
        }
    }
    // Extract relations
    const relations = new Map();
    for (const propertyKey of propertyKeys) {
        const relationOptions = Reflect.getMetadata(`${DatabaseMetadataKeys.RELATION}:${propertyKey}`, target);
        if (relationOptions) {
            relations.set(propertyKey, {
                propertyName: propertyKey,
                ...relationOptions
            });
        }
    }
    // Find primary key
    let primaryKey;
    for (const [columnName, columnMeta] of Array.from(columns)) {
        if (columnMeta.primary) {
            primaryKey = columnName;
            break;
        }
    }
    if (!primaryKey) {
        throw new Error(`Entity ${target.name} must have a primary key column`);
    }
    // Extract indices and uniques (simplified)
    const indices = [];
    const uniques = [];
    return {
        tableName: brandTableName(entityOptions.name),
        columns,
        relations,
        primaryKey,
        indices,
        uniques
    };
}
//# sourceMappingURL=decorators.js.map