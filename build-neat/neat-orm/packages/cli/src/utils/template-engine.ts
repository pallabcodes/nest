/**
 * Template Engine
 *
 * Simple template engine for generating code files.
 *
 * @module cli/utils/template-engine
 */

/**
 * Template Engine
 *
 * Handles template rendering with variable substitution.
 */
export class TemplateEngine {
  /**
   * Render template with variables
   */
  render(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * Render template from file
   */
  async renderFromFile(
    templatePath: string,
    variables: Record<string, any>
  ): Promise<string> {
    const fs = await import('fs-extra');
    const template = await fs.readFile(templatePath, 'utf-8');
    return this.render(template, variables);
  }

  /**
   * Get default templates
   */
  getDefaultTemplates(): Record<string, string> {
    return {
      migration: `/**
 * Migration: {{name}}
 * Generated at: {{timestamp}}
 */

export async function up(adapter) {
  // Add migration logic here
  await adapter.execute(\`
    -- Example: Create a users table
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  \`);
}

export async function down(adapter) {
  // Add rollback logic here
  await adapter.execute(\`
    DROP TABLE IF EXISTS users
  \`);
}
`,
      entity: `/**
 * Entity: {{className}}
 * Table: {{tableName}}
 * Generated at: {{timestamp}}
 */

import { Entity, Column, PrimaryKey } from '@neat-orm/core';

@Entity('{{tableName}}')
export class {{className}} {
  @PrimaryKey()
  @Column()
  id: number;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;
}
`,
      seed: `/**
 * Seed: {{name}}
 * Generated at: {{timestamp}}
 */

export async function run(adapter) {
  // Add seed data here
  await adapter.execute(\`
    INSERT INTO users (email, name) VALUES
    ('admin@example.com', 'Admin User'),
    ('user@example.com', 'Regular User')
  \`);
}
`,
    };
  }
}
