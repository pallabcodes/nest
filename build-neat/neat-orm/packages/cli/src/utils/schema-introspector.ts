/**
 * Schema Introspector
 *
 * Introspects database schemas and extracts table/column information.
 *
 * @module cli/utils/schema-introspector
 */

import type { DatabaseAdapter } from '@neat-orm/core';

export interface SchemaInfo {
  tables: TableInfo[];
}

export interface TableInfo {
  name: string;
  schema?: string;
  type: 'table' | 'view';
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  defaultValue?: string;
  length?: number;
}

/**
 * Schema Introspector
 *
 * Extracts database schema information.
 */
export class SchemaIntrospector {
  constructor(private adapter: DatabaseAdapter) {}

  /**
   * Get all tables in the database
   */
  async getTables(): Promise<TableInfo[]> {
    try {
      // Try SQLite first
      const result = await this.adapter.execute(
        "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'"
      );

      return result.rows.map(row => ({
        name: row.name,
        type: row.type as 'table' | 'view',
      }));
    } catch {
      // Try PostgreSQL/MySQL information schema
      try {
        const result = await this.adapter.execute(`
          SELECT table_name as name, table_type as type
          FROM information_schema.tables
          WHERE table_schema = 'public'
        `);

        return result.rows.map(row => ({
          name: row.name,
          type: (row.type as string).toLowerCase().includes('view') ? 'view' : 'table',
        }));
      } catch {
        return [];
      }
    }
  }

  /**
   * Get columns for a specific table
   */
  async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    try {
      // Try SQLite pragma
      const result = await this.adapter.execute(`PRAGMA table_info(${this.adapter.escapeIdentifier(tableName)})`);

      return result.rows.map(row => ({
        name: row.name,
        type: row.type,
        nullable: !row.notnull,
        primaryKey: !!row.pk,
        autoIncrement: false, // SQLite doesn't store this info directly
      }));
    } catch {
      // Try information schema for other databases
      try {
        const result = await this.adapter.execute(`
          SELECT
            column_name as name,
            data_type as type,
            is_nullable = 'YES' as nullable,
            column_key = 'PRI' as primary_key,
            extra like '%auto_increment%' as auto_increment,
            column_default as default_value,
            character_maximum_length as length
          FROM information_schema.columns
          WHERE table_name = ? AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tableName]);

        return result.rows.map(row => ({
          name: row.name,
          type: row.type,
          nullable: row.nullable,
          primaryKey: row.primary_key,
          autoIncrement: row.auto_increment,
          defaultValue: row.default_value,
          length: row.length,
        }));
      } catch {
        return [];
      }
    }
  }

  /**
   * Get foreign key relationships
   */
  async getForeignKeys(tableName: string): Promise<any[]> {
    try {
      // SQLite foreign keys
      const result = await this.adapter.execute(`PRAGMA foreign_key_list(${this.adapter.escapeIdentifier(tableName)})`);
      return result.rows;
    } catch {
      // Other databases - simplified
      return [];
    }
  }
}
