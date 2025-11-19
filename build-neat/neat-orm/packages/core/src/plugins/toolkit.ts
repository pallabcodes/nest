/**
 * Plugin Development Toolkit
 *
 * Provides utilities, helpers, and best practices for developing NeatORM plugins.
 * Includes code generators, testing utilities, and development tools.
 *
 * @module plugins/toolkit
 */

import type {
  Plugin,
  PluginMetadata,
  PluginContext,
  PluginInstance,
  QueryBuilderPlugin,
  DecoratorPlugin,
  CacheProviderPlugin,
  MiddlewarePlugin,
} from './plugin-interface.js';

/**
 * Plugin development utilities.
 */
export class PluginToolkit {
  /**
   * Create a basic plugin template.
   */
  static createPluginTemplate(metadata: PluginMetadata): Plugin {
    return {
      metadata,
      lifecycle: {
        onInit: (context) => {
          context.logger.info(`${metadata.name} initialized`);
        },
        onDestroy: () => {
          console.log(`${metadata.name} destroyed`);
        },
      },
    };
  }

  /**
   * Create a query builder plugin template.
   */
  static createQueryBuilderPlugin(
    metadata: PluginMetadata,
    extensions: {
      methods?: Record<string, Function>;
      transformers?: Array<(sql: string, params: unknown[]) => { sql: string; params: unknown[] }>;
    }
  ): QueryBuilderPlugin {
    return {
      metadata,
      lifecycle: {
        onInit: (context) => {
          context.logger.info(`${metadata.name} query builder extensions loaded`);
        },
      },
      extendQueryBuilder: (builder, context) => {
        if (extensions.methods) {
          Object.assign(builder, extensions.methods);
        }
      },
      transformQuery: (sql, params) => {
        let transformed = { sql, params };

        if (extensions.transformers) {
          for (const transformer of extensions.transformers) {
            transformed = transformer(transformed.sql, transformed.params);
          }
        }

        return transformed;
      },
    };
  }

  /**
   * Create a middleware plugin template.
   */
  static createMiddlewarePlugin(
    metadata: PluginMetadata,
    middleware: {
      queryMiddleware?: MiddlewarePlugin['queryMiddleware'];
      transactionMiddleware?: MiddlewarePlugin['transactionMiddleware'];
    }
  ): MiddlewarePlugin {
    return {
      metadata,
      lifecycle: {
        onInit: (context) => {
          context.logger.info(`${metadata.name} middleware activated`);
        },
      },
      ...middleware,
    };
  }

  /**
   * Create a decorator plugin template.
   */
  static createDecoratorPlugin(
    metadata: PluginMetadata,
    decorators: Record<string, PropertyDecorator | MethodDecorator | ClassDecorator>
  ): DecoratorPlugin {
    return {
      metadata,
      decorators,
      lifecycle: {
        onInit: (context) => {
          context.logger.info(`${metadata.name} decorators registered`);
        },
      },
    };
  }

  /**
   * Validate plugin metadata.
   */
  static validateMetadata(metadata: PluginMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.id || typeof metadata.id !== 'string') {
      errors.push('Plugin ID is required and must be a string');
    }

    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('Plugin name is required and must be a string');
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('Plugin version is required and must be a string');
    }

    // Validate version format (semver)
    if (metadata.version && !/^(\d+)\.(\d+)\.(\d+)(.*)?$/.test(metadata.version)) {
      errors.push('Plugin version must follow semantic versioning (e.g., 1.0.0)');
    }

    if (metadata.keywords && !Array.isArray(metadata.keywords)) {
      errors.push('Plugin keywords must be an array of strings');
    }

    if (metadata.supportedDialects && !Array.isArray(metadata.supportedDialects)) {
      errors.push('Plugin supportedDialects must be an array of strings');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate plugin documentation.
   */
  static generateDocumentation(plugin: Plugin): string {
    const { metadata } = plugin;

    return `# ${metadata.name}

${metadata.description || 'No description provided.'}

## Installation

\`\`\`bash
npm install ${metadata.name}
\`\`\`

## Configuration

${metadata.version ? `**Version:** ${metadata.version}` : ''}
${metadata.author ? `**Author:** ${metadata.author}` : ''}
${metadata.license ? `**License:** ${metadata.license}` : ''}

## Supported Databases

${metadata.supportedDialects ?
  metadata.supportedDialects.map(dialect => `- ${dialect}`).join('\n') :
  'All databases supported'
}

## Keywords

${metadata.keywords ? metadata.keywords.join(', ') : 'None'}

## Dependencies

${metadata.dependencies ?
  Object.entries(metadata.dependencies)
    .map(([dep, version]) => `- ${dep}@${version}`)
    .join('\n') :
  'No dependencies'
}
`;
  }

  /**
   * Test plugin compatibility.
   */
  static async testCompatibility(
    plugin: Plugin,
    testEnvironment: {
      adapter?: any;
      config?: Record<string, unknown>;
    } = {}
  ): Promise<{ compatible: boolean; warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Test plugin initialization
      if (plugin.lifecycle?.onInit) {
        const mockContext: Partial<PluginContext> = {
          config: testEnvironment.config || {},
          logger: {
            debug: () => {},
            info: () => {},
            warn: (msg) => warnings.push(msg),
            error: (msg) => errors.push(msg),
          },
          emit: () => {},
          on: () => {},
          off: () => {},
        };

        await plugin.lifecycle.onInit(mockContext as PluginContext);
      }

      // Test plugin destruction
      if (plugin.lifecycle?.onDestroy) {
        await plugin.lifecycle.onDestroy();
      }

    } catch (error) {
      errors.push(`Plugin lifecycle error: ${error}`);
    }

    return {
      compatible: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Bundle plugin for distribution.
   */
  static async bundlePlugin(plugin: Plugin): Promise<{
    plugin: Plugin;
    bundle: string;
    size: number;
  }> {
    // This would implement plugin bundling for distribution
    // For now, return a mock implementation
    const bundle = JSON.stringify(plugin, null, 2);
    const size = new Blob([bundle]).size;

    return {
      plugin,
      bundle,
      size,
    };
  }

  /**
   * Create plugin from configuration.
   */
  static createPluginFromConfig(config: {
    metadata: PluginMetadata;
    type: 'basic' | 'query-builder' | 'middleware' | 'decorator';
    extensions?: Record<string, unknown>;
  }): Plugin {
    switch (config.type) {
      case 'query-builder':
        return this.createQueryBuilderPlugin(
          config.metadata,
          config.extensions as any || {}
        );

      case 'middleware':
        return this.createMiddlewarePlugin(
          config.metadata,
          config.extensions as any || {}
        );

      case 'decorator':
        return this.createDecoratorPlugin(
          config.metadata,
          config.extensions as any || {}
        );

      default:
        return this.createPluginTemplate(config.metadata);
    }
  }
}

/**
 * Plugin testing utilities.
 */
export class PluginTestingUtils {
  /**
   * Create a mock plugin context for testing.
   */
  static createMockContext(config: Record<string, unknown> = {}): PluginContext {
    const events: Map<string, Set<(data?: unknown) => void>> = new Map();

    return {
      adapter: {} as any, // Mock adapter
      config,
      logger: {
        debug: (...args) => console.debug('[Test]', ...args),
        info: (...args) => console.info('[Test]', ...args),
        warn: (...args) => console.warn('[Test]', ...args),
        error: (...args) => console.error('[Test]', ...args),
      },
      plugins: new Map(),
      emit: (event: string, data?: unknown) => {
        const listeners = events.get(event);
        if (listeners) {
          listeners.forEach(listener => listener(data));
        }
      },
      on: (event: string, handler: (data?: unknown) => void) => {
        if (!events.has(event)) {
          events.set(event, new Set());
        }
        events.get(event)!.add(handler);
      },
      off: (event: string, handler: (data?: unknown) => void) => {
        const listeners = events.get(event);
        if (listeners) {
          listeners.delete(handler);
        }
      },
    };
  }

  /**
   * Create a mock query builder for testing.
   */
  static createMockQueryBuilder(): any {
    return {
      _table: 'test_table',
      _operation: 'select',
      _wheres: [],
      _orders: [],
      _limit: null,
      _offset: null,

      select: function(...columns: string[]) {
        this._columns = columns;
        return this;
      },

      from: function(table: string) {
        this._table = table;
        return this;
      },

      where: function(column: string, operator: string, value: unknown) {
        this._wheres.push({ column, operator, value });
        return this;
      },

      orderBy: function(column: string, direction: 'asc' | 'desc' = 'asc') {
        this._orders.push({ column, direction });
        return this;
      },

      limit: function(count: number) {
        this._limit = count;
        return this;
      },

      offset: function(count: number) {
        this._offset = count;
        return this;
      },

      toSQL: function() {
        return {
          sql: `SELECT * FROM ${this._table}`,
          params: [],
        };
      },

      execute: async function() {
        return {
          rows: [{ id: 1, name: 'Test' }],
          rowCount: 1,
        };
      },
    };
  }

  /**
   * Assert plugin behavior.
   */
  static assertPluginBehavior(
    plugin: Plugin,
    tests: Array<{
      name: string;
      test: (context: PluginContext) => Promise<void> | void;
      expect?: (result: any) => boolean;
    }>
  ): Promise<Array<{ name: string; passed: boolean; error?: string }>> {
    const results: Array<{ name: string; passed: boolean; error?: string }> = [];

    return new Promise(async (resolve) => {
      for (const test of tests) {
        try {
          const context = this.createMockContext();
          await test.test(context);

          const passed = test.expect ? test.expect(context) : true;
          results.push({ name: test.name, passed });
        } catch (error) {
          results.push({
            name: test.name,
            passed: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      resolve(results);
    });
  }
}

/**
 * Plugin CLI utilities for development.
 */
export class PluginCLIUtils {
  /**
   * Generate a new plugin scaffold.
   */
  static generatePluginScaffold(
    name: string,
    options: {
      type: 'basic' | 'query-builder' | 'middleware' | 'decorator';
      description?: string;
      author?: string;
      keywords?: string[];
    }
  ): string {
    const className = name.replace(/[-_](.)/g, (_, letter) => letter.toUpperCase())
                         .replace(/^./, str => str.toUpperCase()) + 'Plugin';

    const template = `/**
 * ${name} Plugin
 *
 * ${options.description || 'A NeatORM plugin'}
 *
 * @author ${options.author || 'Plugin Author'}
 */

import { Plugin } from '@neat-orm/core';

export class ${className} implements Plugin {
  readonly metadata = {
    id: '${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}',
    name: '${name}',
    version: '1.0.0',
    description: '${options.description || 'A NeatORM plugin'}',
    author: '${options.author || 'Plugin Author'}',
    keywords: ${JSON.stringify(options.keywords || [])},
    supportedDialects: ['postgres', 'mysql', 'sqlite', 'sqlserver'],
  };

  readonly lifecycle = {
    onInit: (context) => {
      context.logger.info('${name} plugin initialized');
    },

    onDestroy: () => {
      console.log('${name} plugin destroyed');
    },
  };
}

// Export the plugin instance
export const ${name.toLowerCase().replace(/[^a-z0-9]/g, '')}Plugin = new ${className}();
`;

    return template;
  }

  /**
   * Generate plugin tests.
   */
  static generatePluginTests(pluginName: string): string {
    const className = pluginName.replace(/[-_](.)/g, (_, letter) => letter.toUpperCase())
                               .replace(/^./, str => str.toUpperCase()) + 'Plugin';

    return `/**
 * ${pluginName} Plugin Tests
 */

import { ${className} } from './${pluginName}.plugin';
import { PluginTestingUtils } from '@neat-orm/core';

describe('${pluginName} Plugin', () => {
  let plugin: ${className};

  beforeEach(() => {
    plugin = new ${className}();
  });

  it('should have valid metadata', () => {
    const validation = PluginTestingUtils.validateMetadata(plugin.metadata);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should initialize correctly', async () => {
    const compatibility = await PluginTestingUtils.testCompatibility(plugin);
    expect(compatibility.compatible).toBe(true);
    expect(compatibility.errors).toHaveLength(0);
  });

  it('should have proper lifecycle hooks', async () => {
    const context = PluginTestingUtils.createMockContext();

    // Test initialization
    await plugin.lifecycle?.onInit?.(context);
    expect(plugin.metadata.name).toBe('${pluginName}');

    // Test destruction
    await plugin.lifecycle?.onDestroy?.();
  });
});
`;
  }

  /**
   * Generate plugin README.
   */
  static generatePluginReadme(
    name: string,
    options: {
      description?: string;
      author?: string;
      repository?: string;
    }
  ): string {
    return `# ${name}

${options.description || 'A NeatORM plugin'}

## Installation

\`\`\`bash
npm install ${name}
\`\`\`

## Usage

\`\`\`typescript
import { PluginManager } from '@neat-orm/core';
import { ${name.toLowerCase().replace(/[^a-z0-9]/g, '')}Plugin } from '${name}';

const pluginManager = new PluginManager();
await pluginManager.registerPlugin(${name.toLowerCase().replace(/[^a-z0-9]/g, '')}Plugin);
await pluginManager.initialize(adapter);
\`\`\`

## Configuration

The plugin can be configured during registration:

\`\`\`typescript
await pluginManager.registerPlugin(${name.toLowerCase().replace(/[^a-z0-9]/g, '')}Plugin, {
  // Plugin-specific configuration options
});
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Run tests
npm test

# Build the plugin
npm run build
\`\`\`

## License

MIT

${options.author ? `## Author

${options.author}` : ''}

${options.repository ? `## Repository

[${options.repository}](${options.repository})` : ''}
`;
  }
}

/**
 * Plugin performance monitoring utilities.
 */
export class PluginPerformanceUtils {
  /**
   * Measure plugin initialization time.
   */
  static async measureInitializationTime(plugin: Plugin): Promise<number> {
    const startTime = Date.now();

    const mockContext = PluginTestingUtils.createMockContext();
    await plugin.lifecycle?.onInit?.(mockContext);

    return Date.now() - startTime;
  }

  /**
   * Profile plugin method execution.
   */
  static async profileMethodExecution<T>(
    fn: () => Promise<T> | T,
    label: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      console.log(\`[Performance] \${label}: \${duration.toFixed(2)}ms\`);

      return { result, duration };
    } catch (error) {
      const duration = performance.now() - startTime;
      console.log(\`[Performance] \${label} failed after \${duration.toFixed(2)}ms\`);
      throw error;
    }
  }

  /**
   * Monitor plugin memory usage.
   */
  static getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as any).memory;
      const used = mem.usedJSHeapSize;
      const total = mem.totalJSHeapSize;
      const percentage = (used / total) * 100;

      return { used, total, percentage };
    }

    return { used: 0, total: 0, percentage: 0 };
  }
}
