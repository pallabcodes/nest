/**
 * Entity Generator
 *
 * Generates TypeScript entity classes from database schema information.
 *
 * @module cli/utils/entity-generator
 */

import type { ColumnInfo } from './schema-introspector.js';

/**
 * Entity Generator
 *
 * Creates TypeScript entity classes from schema information.
 */
export class EntityGenerator {
  /**
   * Generate an entity class from table and column information
   */
  generateEntity(tableName: string, columns: ColumnInfo[]): string {
    const className = this.toPascalCase(tableName);
    const properties = this.generateProperties(columns);
    const decorators = this.generateDecorators(columns);

    return `/**
 * Entity: ${className}
 * Table: ${tableName}
 * Generated at: ${new Date().toISOString()}
 */

import { Entity, Column, PrimaryKey, Generated } from '@neat-orm/core';

@Entity('${tableName}')
export class ${className} {
${decorators.map((decorator, i) => `  ${decorator}\n${properties[i]}`).join('\n\n')}
}
`;
  }

  /**
   * Generate TypeScript property declarations
   */
  private generateProperties(columns: ColumnInfo[]): string[] {
    return columns.map(column => {
      const propertyName = this.toCamelCase(column.name);
      const type = this.mapColumnTypeToTypeScript(column);

      return `  ${propertyName}: ${type};`;
    });
  }

  /**
   * Generate decorators for properties
   */
  private generateDecorators(columns: ColumnInfo[]): string[] {
    return columns.map(column => {
      const decorators: string[] = [];

      if (column.primaryKey) {
        if (column.autoIncrement) {
          decorators.push('  @PrimaryGeneratedColumn()');
        } else {
          decorators.push('  @PrimaryKey()');
        }
      }

      // Add column decorator with options
      const columnOptions: string[] = [];

      if (!column.nullable) {
        columnOptions.push('nullable: false');
      }

      if (column.length) {
        columnOptions.push(`length: ${column.length}`);
      }

      if (column.defaultValue) {
        columnOptions.push(`default: '${column.defaultValue}'`);
      }

      if (columnOptions.length > 0) {
        decorators.push(`  @Column({ ${columnOptions.join(', ')} })`);
      } else {
        decorators.push('  @Column()');
      }

      return decorators.join('\n');
    });
  }

  /**
   * Map database column types to TypeScript types
   */
  private mapColumnTypeToTypeScript(column: ColumnInfo): string {
    const type = column.type.toLowerCase();

    // Handle nullable types
    const baseType = this.getBaseType(type);
    return column.nullable ? `${baseType} | null` : baseType;
  }

  /**
   * Get base TypeScript type for database column type
   */
  private getBaseType(dbType: string): string {
    if (dbType.includes('int') || dbType.includes('serial')) {
      return 'number';
    }

    if (dbType.includes('float') || dbType.includes('double') || dbType.includes('decimal')) {
      return 'number';
    }

    if (dbType.includes('bool')) {
      return 'boolean';
    }

    if (dbType.includes('date') || dbType.includes('time')) {
      return 'Date';
    }

    if (dbType.includes('json') || dbType.includes('text')) {
      return 'string';
    }

    // Default to string for varchar, char, etc.
    return 'string';
  }

  /**
   * Convert snake_case to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert snake_case to camelCase
   */
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}
