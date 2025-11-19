/**
 * NeatOrm CLI Entry Point
 *
 * Exports all CLI commands and utilities.
 *
 * @module cli/index
 */

export { CLIFramework, cli, type CLIConfig } from './framework/cli.js';

// Export commands
export { MigrateCommand } from './commands/migrate.js';
export { SchemaCommand } from './commands/schema.js';
export { EntityCommand } from './commands/entity.js';
export { SeedCommand } from './commands/seed.js';
export { DBCommand } from './commands/db.js';

// Export utilities
export * from './utils/index.js';

