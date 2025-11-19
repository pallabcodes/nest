/**
 * Database Adapter Factory
 *
 * Creates appropriate database adapters based on connection configuration.
 * Supports multiple database dialects and connection string parsing.
 *
 * @module adapters/adapter-factory
 */

import type { ConnectionConfig, DatabaseAdapter } from './base-adapter.js';
import { PostgresAdapter } from './postgres-adapter.js';
import { MySQLAdapter } from './mysql-adapter.js';
import { SQLiteAdapter } from './sqlite-adapter.js';

/**
 * Create a database adapter based on the provided configuration.
 *
 * @param config - Connection configuration
 * @returns Database adapter instance
 * @throws Error if dialect is not supported
 *
 * @example
 * ```typescript
 * // PostgreSQL
 * const pgAdapter = createAdapter({
 *   dialect: 'postgres',
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'mydb',
 *   user: 'postgres',
 *   password: 'secret',
 * });
 *
 * // MySQL
 * const mysqlAdapter = createAdapter({
 *   dialect: 'mysql',
 *   host: 'localhost',
 *   port: 3306,
 *   database: 'mydb',
 *   user: 'root',
 *   password: 'secret',
 * });
 *
 * // SQLite
 * const sqliteAdapter = createAdapter({
 *   dialect: 'sqlite',
 *   database: './data.db',
 * });
 *
 * // Connection string
 * const adapter = createAdapter({
 *   dialect: 'postgres',
 *   connectionString: 'postgresql://user:pass@localhost:5432/mydb',
 * });
 * ```
 */
export function createAdapter(config: ConnectionConfig): DatabaseAdapter {
  switch (config.dialect) {
    case 'postgres':
      return new PostgresAdapter(config);

    case 'mysql':
      return new MySQLAdapter(config);

    case 'sqlite':
      return new SQLiteAdapter(config);

    case 'sqlserver':
      throw new Error(
        'SQL Server adapter not yet implemented. Coming in Phase 3.'
      );

    case 'oracle':
      throw new Error('Oracle adapter not yet implemented. Coming in Phase 3.');

    default:
      throw new Error(
        `Unsupported database dialect: ${(config as ConnectionConfig).dialect}`
      );
  }
}

/**
 * Parse a connection string into ConnectionConfig.
 *
 * Supports standard connection string formats:
 * - PostgreSQL: postgresql://user:pass@host:port/database
 * - MySQL: mysql://user:pass@host:port/database
 * - SQLite: sqlite://path/to/database.db or sqlite::memory:
 *
 * @param connectionString - Database connection string
 * @returns Parsed connection configuration
 * @throws Error if connection string format is invalid
 *
 * @example
 * ```typescript
 * const config = parseConnectionString('postgresql://user:pass@localhost:5432/mydb');
 * // Returns:
 * // {
 * //   dialect: 'postgres',
 * //   host: 'localhost',
 * //   port: 5432,
 * //   database: 'mydb',
 * //   user: 'user',
 * //   password: 'pass',
 * //   connectionString: 'postgresql://user:pass@localhost:5432/mydb'
 * // }
 * ```
 */
export function parseConnectionString(
  connectionString: string
): ConnectionConfig {
  try {
    const url = new URL(connectionString);

    // Determine dialect from protocol
    let dialect: ConnectionConfig['dialect'];
    switch (url.protocol.replace(':', '')) {
      case 'postgresql':
      case 'postgres':
        dialect = 'postgres';
        break;
      case 'mysql':
        dialect = 'mysql';
        break;
      case 'sqlite':
        dialect = 'sqlite';
        break;
      case 'sqlserver':
      case 'mssql':
        dialect = 'sqlserver';
        break;
      case 'oracle':
        dialect = 'oracle';
        break;
      default:
        throw new Error(`Unsupported protocol: ${url.protocol}`);
    }

    // For SQLite, database is the pathname
    if (dialect === 'sqlite') {
      return {
        dialect,
        database: url.pathname === '/:memory:' ? ':memory:' : url.pathname,
        connectionString,
      };
    }

    // For other databases, parse host, port, database, user, password
    const config: ConnectionConfig = {
      dialect,
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : undefined,
      database: url.pathname.substring(1), // Remove leading slash
      user: url.username || undefined,
      password: url.password || undefined,
      connectionString,
    };

    // Parse query parameters as options
    if (url.search) {
      const options: Record<string, unknown> = {};
      url.searchParams.forEach((value, key) => {
        // Try to parse boolean values
        if (value === 'true') {
          options[key] = true;
        } else if (value === 'false') {
          options[key] = false;
        } else if (!isNaN(Number(value))) {
          options[key] = Number(value);
        } else {
          options[key] = value;
        }
      });
      config.options = options;
    }

    return config;
  } catch (error) {
    throw new Error(
      `Invalid connection string: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a database adapter from a connection string.
 *
 * Convenience function that combines parseConnectionString and createAdapter.
 *
 * @param connectionString - Database connection string
 * @returns Database adapter instance
 *
 * @example
 * ```typescript
 * const adapter = createAdapterFromConnectionString(
 *   'postgresql://user:pass@localhost:5432/mydb'
 * );
 *
 * await adapter.connect();
 * const result = await adapter.execute('SELECT * FROM users');
 * await adapter.disconnect();
 * ```
 */
export function createAdapterFromConnectionString(
  connectionString: string
): DatabaseAdapter {
  const config = parseConnectionString(connectionString);
  return createAdapter(config);
}

/**
 * Validate connection configuration.
 *
 * Checks if all required fields are present for the specified dialect.
 *
 * @param config - Connection configuration to validate
 * @throws Error if configuration is invalid
 *
 * @example
 * ```typescript
 * try {
 *   validateConnectionConfig({
 *     dialect: 'postgres',
 *     host: 'localhost',
 *     database: 'mydb',
 *     // Missing user and password
 *   });
 * } catch (error) {
 *   console.error('Invalid configuration:', error.message);
 * }
 * ```
 */
export function validateConnectionConfig(config: ConnectionConfig): void {
  if (!config.dialect) {
    throw new Error('Database dialect is required');
  }

  if (config.dialect === 'sqlite') {
    if (!config.database) {
      throw new Error('Database path is required for SQLite');
    }
    return;
  }

  // For non-SQLite databases
  if (!config.database) {
    throw new Error('Database name is required');
  }

  if (!config.host && !config.connectionString) {
    throw new Error('Database host or connection string is required');
  }

  // Warn if credentials are missing (not all databases require them)
  if (!config.user && !config.connectionString) {
    console.warn(
      'Warning: Database user not specified. Some databases require authentication.'
    );
  }
}

/**
 * Get default port for a database dialect.
 *
 * @param dialect - Database dialect
 * @returns Default port number, or undefined if not applicable
 */
export function getDefaultPort(
  dialect: ConnectionConfig['dialect']
): number | undefined {
  const ports: Record<string, number | undefined> = {
    postgres: 5432,
    mysql: 3306,
    sqlite: undefined,
    sqlserver: 1433,
    oracle: 1521,
  };

  return ports[dialect];
}

