/**
 * Plugin Loader Implementation
 *
 * Handles discovery and loading of plugins from various sources:
 * - File paths
 * - Directories
 * - NPM packages
 * - Configuration objects
 *
 * @module plugins/plugin-loader
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import type { Plugin, PluginLoader as IPluginLoader } from './plugin-interface.js';

/**
 * Plugin loader implementation.
 */
export class PluginLoader implements IPluginLoader {
  private loadedPlugins: Map<string, Plugin> = new Map();

  async loadFromPath(path: string): Promise<Plugin> {
    const fullPath = resolve(path);

    // Check if already loaded
    if (this.loadedPlugins.has(fullPath)) {
      return this.loadedPlugins.get(fullPath)!;
    }

    try {
      // Dynamic import for ES modules or CommonJS
      const module = await import(fullPath);
      const plugin = this.extractPluginFromModule(module, fullPath);

      this.loadedPlugins.set(fullPath, plugin);
      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin from ${fullPath}: ${error}`);
    }
  }

  async loadFromPackage(packageName: string): Promise<Plugin> {
    // Check if already loaded
    if (this.loadedPlugins.has(packageName)) {
      return this.loadedPlugins.get(packageName)!;
    }

    try {
      // Try to import as npm package
      const module = await import(packageName);
      const plugin = this.extractPluginFromModule(module, packageName);

      this.loadedPlugins.set(packageName, plugin);
      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin package ${packageName}: ${error}`);
    }
  }

  async loadFromDirectory(directory: string): Promise<Plugin[]> {
    const fullPath = resolve(directory);
    const plugins: Plugin[] = [];

    try {
      const entries = readdirSync(fullPath);

      for (const entry of entries) {
        const entryPath = join(fullPath, entry);
        const stat = statSync(entryPath);

        if (stat.isFile() && this.isPluginFile(entry)) {
          try {
            const plugin = await this.loadFromPath(entryPath);
            plugins.push(plugin);
          } catch (error) {
            console.warn(`Failed to load plugin from ${entryPath}:`, error);
          }
        } else if (stat.isDirectory()) {
          // Check for package.json or index file
          const packageJsonPath = join(entryPath, 'package.json');
          const indexPath = join(entryPath, 'index.js');

          if (statSync(packageJsonPath, { throwIfNoEntry: false })) {
            try {
              const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
              const mainFile = packageJson.main || 'index.js';
              const plugin = await this.loadFromPath(join(entryPath, mainFile));
              plugins.push(plugin);
            } catch (error) {
              console.warn(`Failed to load plugin from directory ${entryPath}:`, error);
            }
          } else if (statSync(indexPath, { throwIfNoEntry: false })) {
            try {
              const plugin = await this.loadFromPath(indexPath);
              plugins.push(plugin);
            } catch (error) {
              console.warn(`Failed to load plugin from ${indexPath}:`, error);
            }
          }
        }
      }

      return plugins;
    } catch (error) {
      throw new Error(`Failed to load plugins from directory ${fullPath}: ${error}`);
    }
  }

  async loadFromConfig(config: Record<string, unknown>): Promise<Plugin[]> {
    const plugins: Plugin[] = [];

    // Handle different configuration formats
    if (config.plugins && Array.isArray(config.plugins)) {
      for (const pluginConfig of config.plugins) {
        if (typeof pluginConfig === 'string') {
          // Plugin name or path
          try {
            if (pluginConfig.startsWith('.') || pluginConfig.startsWith('/')) {
              // File path
              const plugin = await this.loadFromPath(pluginConfig);
              plugins.push(plugin);
            } else {
              // NPM package
              const plugin = await this.loadFromPackage(pluginConfig);
              plugins.push(plugin);
            }
          } catch (error) {
            console.warn(`Failed to load plugin ${pluginConfig}:`, error);
          }
        } else if (typeof pluginConfig === 'object' && pluginConfig !== null) {
          // Plugin configuration object
          const pluginConfigObj = pluginConfig as {
            name?: string;
            path?: string;
            package?: string;
            config?: Record<string, unknown>;
          };

          try {
            let plugin: Plugin;

            if (pluginConfigObj.path) {
              plugin = await this.loadFromPath(pluginConfigObj.path);
            } else if (pluginConfigObj.package) {
              plugin = await this.loadFromPackage(pluginConfigObj.package);
            } else if (pluginConfigObj.name) {
              plugin = await this.loadFromPackage(pluginConfigObj.name);
            } else {
              throw new Error('Plugin configuration must specify path, package, or name');
            }

            plugins.push(plugin);
          } catch (error) {
            console.warn(`Failed to load plugin from config:`, error);
          }
        }
      }
    }

    return plugins;
  }

  /**
   * Clear the loaded plugins cache.
   */
  clearCache(): void {
    this.loadedPlugins.clear();
  }

  /**
   * Get all loaded plugins.
   */
  getLoadedPlugins(): Plugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Check if a file is a plugin file.
   */
  private isPluginFile(filename: string): boolean {
    const ext = extname(filename).toLowerCase();
    return ['.js', '.mjs', '.cjs', '.ts'].includes(ext) &&
           (filename.includes('plugin') || filename.includes('Plugin'));
  }

  /**
   * Extract plugin from loaded module.
   */
  private extractPluginFromModule(module: any, source: string): Plugin {
    // Try different export patterns
    let plugin: Plugin | undefined;

    // Default export
    if (module.default && this.isPlugin(module.default)) {
      plugin = module.default;
    }

    // Named export
    if (!plugin && module.Plugin && this.isPlugin(module.Plugin)) {
      plugin = module.Plugin;
    }

    // Check if the module itself is a plugin
    if (!plugin && this.isPlugin(module)) {
      plugin = module;
    }

    // Look for plugin exports
    if (!plugin) {
      const pluginKeys = Object.keys(module).filter(key =>
        key.toLowerCase().includes('plugin') && this.isPlugin(module[key])
      );

      if (pluginKeys.length > 0) {
        plugin = module[pluginKeys[0]];
      }
    }

    if (!plugin) {
      throw new Error(`No valid plugin found in ${source}`);
    }

    return plugin;
  }

  /**
   * Check if an object is a valid plugin.
   */
  private isPlugin(obj: any): obj is Plugin {
    return obj &&
           typeof obj === 'object' &&
           obj.metadata &&
           typeof obj.metadata === 'object' &&
           typeof obj.metadata.id === 'string' &&
           typeof obj.metadata.name === 'string' &&
           typeof obj.metadata.version === 'string';
  }
}
