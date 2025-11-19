/**
 * Neat Framework - Production File System Scanner Configuration
 *
 * This module provides configuration for the file system scanner,
 * enabling production-ready auto-discovery that works in all environments.
 *
 * Key Features:
 * - Environment-aware scanning (dev/prod)
 * - Multiple file type support (.ts, .js, .d.ts)
 * - Configurable scan paths
 * - Fallback strategies
 * - Performance optimizations
 */

import type { Result } from '../types/results.js';

// ========================================
// CONFIGURATION TYPES
// ========================================

/**
 * File system scanning strategy
 */
export type ScanStrategy = 'auto' | 'compiled-only' | 'source-only' | 'hybrid';

/**
 * Environment type for scanning
 */
export type ScanEnvironment = 'development' | 'production' | 'test' | 'ci';

/**
 * File scanning options
 */
export interface FileScanOptions {
  /** Include .ts files */
  includeTypeScript?: boolean;
  /** Include .js files */
  includeJavaScript?: boolean;
  /** Include .d.ts files */
  includeDeclarations?: boolean;
  /** Maximum files to scan (0 = unlimited) */
  maxFiles?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Directory scanning configuration
 */
export interface DirectoryScanConfig {
  /** Base directory paths to scan */
  baseDirs: string[];
  /** Patterns to exclude */
  excludePatterns?: string[];
  /** Recursive depth (0 = unlimited) */
  maxDepth?: number;
  /** Follow symbolic links */
  followSymlinks?: boolean;
}

/**
 * Complete scanner configuration
 */
export interface ScannerConfig {
  /** Scanning environment */
  environment: ScanEnvironment;
  /** Primary scanning strategy */
  strategy: ScanStrategy;
  /** File scanning options */
  fileOptions: FileScanOptions;
  /** Directory scanning config */
  directoryConfig: DirectoryScanConfig;
  /** Enable debug logging */
  debug?: boolean;
  /** Cache results for performance */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
}

// ========================================
// DEFAULT CONFIGURATIONS
// ========================================

/**
 * Get default configuration based on environment
 */
export function getDefaultConfig(environment: ScanEnvironment = detectEnvironment()): ScannerConfig {
  const baseConfig: Partial<ScannerConfig> = {
    environment,
    fileOptions: {
      includeTypeScript: true,
      includeJavaScript: true,
      includeDeclarations: true,
      maxFiles: 1000,
      timeout: 30000
    },
    directoryConfig: {
      baseDirs: getDefaultScanDirs(environment),
      excludePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/.next/**',
        '**/.nuxt/**',
        '**/.output/**',
        '**/coverage/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/__tests__/**',
        '**/__mocks__/**'
      ],
      maxDepth: 10,
      followSymlinks: false
    },
    debug: environment === 'development',
    enableCache: environment !== 'development',
    cacheTTL: 60000 // 1 minute
  };

  // Environment-specific overrides
  switch (environment) {
    case 'development':
      return {
        ...baseConfig,
        strategy: 'hybrid',
        fileOptions: {
          ...baseConfig.fileOptions!,
          maxFiles: 500
        }
      } as ScannerConfig;

    case 'production':
      return {
        ...baseConfig,
        strategy: 'compiled-only',
        fileOptions: {
          ...baseConfig.fileOptions!,
          includeTypeScript: false,
          includeDeclarations: false
        }
      } as ScannerConfig;

    case 'test':
    case 'ci':
      return {
        ...baseConfig,
        strategy: 'source-only',
        fileOptions: {
          ...baseConfig.fileOptions!,
          maxFiles: 200
        },
        enableCache: false
      } as ScannerConfig;

    default:
      return baseConfig as ScannerConfig;
  }
}

/**
 * Detect current environment
 */
export function detectEnvironment(): ScanEnvironment {
  const nodeEnv = process.env.NODE_ENV;
  const ci = process.env.CI;

  if (ci || process.env.GITHUB_ACTIONS || process.env.CIRCLECI) {
    return 'ci';
  }

  switch (nodeEnv) {
    case 'production':
    case 'prod':
      return 'production';
    case 'test':
    case 'testing':
      return 'test';
    case 'development':
    case 'dev':
    default:
      return 'development';
  }
}

/**
 * Get default scan directories for environment
 */
function getDefaultScanDirs(environment: ScanEnvironment): string[] {
  const dirs: string[] = [];

  // Always include common directories
  dirs.push('./src', './lib', './packages');

  // Environment-specific directories
  switch (environment) {
    case 'production':
      dirs.push('./dist', './build', './lib');
      break;
    case 'development':
      dirs.push('./src', './packages');
      break;
    case 'test':
      dirs.push('./src', './test', './__tests__');
      break;
    case 'ci':
      dirs.push('./src', './packages');
      break;
  }

  return dirs;
}

// ========================================
// CONFIGURATION MANAGEMENT
// ========================================

/**
 * Global scanner configuration
 */
let globalConfig: ScannerConfig | null = null;

/**
 * Set global scanner configuration
 */
export function setScannerConfig(config: Partial<ScannerConfig>): Result<void> {
  try {
    const defaultConfig = getDefaultConfig(config.environment || detectEnvironment());
    globalConfig = { ...defaultConfig, ...config };

    if (globalConfig.debug) {
      console.log('🔧 Scanner config set:', {
        environment: globalConfig.environment,
        strategy: globalConfig.strategy,
        baseDirs: globalConfig.directoryConfig.baseDirs
      });
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to set scanner config')
    };
  }
}

/**
 * Get current scanner configuration
 */
export function getScannerConfig(): ScannerConfig {
  if (!globalConfig) {
    globalConfig = getDefaultConfig();
  }
  return globalConfig;
}

/**
 * Reset scanner configuration to defaults
 */
export function resetScannerConfig(): void {
  globalConfig = null;
}

// ========================================
// PRODUCTION OPTIMIZATIONS
// ========================================

/**
 * Scan result cache for performance
 */
interface ScanCache {
  entities: Map<string, any[]>;
  services: Map<string, any[]>;
  controllers: Map<string, any[]>;
  schemas: Map<string, any[]>;
  guards: Map<string, any[]>;
  pipes: Map<string, any[]>;
  interceptors: Map<string, any[]>;
  exceptionFilters: Map<string, any[]>;
  timestamp: number;
}

let scanCache: ScanCache | null = null;

/**
 * Get cached scan results if valid
 */
export function getCachedScanResults(type: keyof ScanCache, key: string): any[] | null {
  const config = getScannerConfig();

  if (!config.enableCache || !scanCache) {
    return null;
  }

  const now = Date.now();
  if (now - scanCache.timestamp > (config.cacheTTL || 60000)) {
    scanCache = null;
    return null;
  }

  const cache = scanCache[type] as Map<string, any[]>;
  return cache.get(key) || null;
}

/**
 * Cache scan results
 */
export function setCachedScanResults(type: keyof ScanCache, key: string, results: any[]): void {
  const config = getScannerConfig();

  if (!config.enableCache) {
    return;
  }

  if (!scanCache) {
    scanCache = {
      entities: new Map(),
      services: new Map(),
      controllers: new Map(),
      schemas: new Map(),
      guards: new Map(),
      pipes: new Map(),
      interceptors: new Map(),
      exceptionFilters: new Map(),
      timestamp: Date.now()
    };
  }

  const cache = scanCache[type] as Map<string, any[]>;
  cache.set(key, results);
  scanCache.timestamp = Date.now();
}

/**
 * Clear scan cache
 */
export function clearScanCache(): void {
  scanCache = null;
}

// ========================================
// ENVIRONMENT-SPECIFIC HELPERS
// ========================================

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return detectEnvironment() === 'production';
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return detectEnvironment() === 'development';
}

/**
 * Check if TypeScript source files should be scanned
 */
export function shouldScanTypeScript(): boolean {
  const config = getScannerConfig();
  return config.strategy === 'source-only' ||
         config.strategy === 'hybrid' ||
         (config.strategy === 'auto' && config.environment === 'development');
}

/**
 * Check if compiled JavaScript files should be scanned
 */
export function shouldScanJavaScript(): boolean {
  const config = getScannerConfig();
  return config.strategy === 'compiled-only' ||
         config.strategy === 'hybrid' ||
         (config.strategy === 'auto' && config.environment === 'production');
}

// ========================================
// ADVANCED CONFIGURATION
// ========================================

/**
 * Create custom configuration for specific use cases
 */
export class ScannerConfigBuilder {
  private config: Partial<ScannerConfig> = {};

  /**
   * Set environment
   */
  environment(env: ScanEnvironment): this {
    this.config.environment = env;
    return this;
  }

  /**
   * Set scanning strategy
   */
  strategy(strategy: ScanStrategy): this {
    this.config.strategy = strategy;
    return this;
  }

  /**
   * Configure file scanning options
   */
  fileOptions(options: Partial<FileScanOptions>): this {
    this.config.fileOptions = { ...this.config.fileOptions, ...options };
    return this;
  }

  /**
   * Configure directory scanning
   */
  directories(config: Partial<DirectoryScanConfig>): this {
    const currentConfig = this.config.directoryConfig || getDefaultConfig().directoryConfig;
    this.config.directoryConfig = {
      baseDirs: config.baseDirs || currentConfig.baseDirs,
      excludePatterns: config.excludePatterns || currentConfig.excludePatterns,
      maxDepth: config.maxDepth !== undefined ? config.maxDepth : currentConfig.maxDepth,
      followSymlinks: config.followSymlinks !== undefined ? config.followSymlinks : currentConfig.followSymlinks
    };
    return this;
  }

  /**
   * Enable debug logging
   */
  debug(enabled: boolean = true): this {
    this.config.debug = enabled;
    return this;
  }

  /**
   * Enable caching
   */
  cache(enabled: boolean = true, ttl: number = 60000): this {
    this.config.enableCache = enabled;
    this.config.cacheTTL = ttl;
    return this;
  }

  /**
   * Build the configuration
   */
  build(): ScannerConfig {
    const defaultConfig = getDefaultConfig(this.config.environment);
    return { ...defaultConfig, ...this.config } as ScannerConfig;
  }

  /**
   * Apply the configuration globally
   */
  apply(): Result<void> {
    return setScannerConfig(this.build());
  }
}

/**
 * Create a scanner config builder
 */
export function configureScanner(): ScannerConfigBuilder {
  return new ScannerConfigBuilder();
}

// ========================================
// PRODUCTION CONFIGURATIONS
// ========================================

/**
 * Pre-configured production scanner config
 */
export function createProductionConfig(): ScannerConfig {
  return configureScanner()
    .environment('production')
    .strategy('compiled-only')
    .fileOptions({
      includeTypeScript: false,
      includeDeclarations: false,
      maxFiles: 2000,
      timeout: 10000
    })
    .directories({
      baseDirs: ['./dist', './build', './lib'],
      maxDepth: 5
    })
    .cache(true, 300000) // 5 minutes cache
    .debug(false)
    .build();
}

/**
 * Pre-configured development scanner config
 */
export function createDevelopmentConfig(): ScannerConfig {
  return configureScanner()
    .environment('development')
    .strategy('hybrid')
    .fileOptions({
      includeTypeScript: true,
      includeJavaScript: true,
      maxFiles: 1000,
      timeout: 5000
    })
    .directories({
      baseDirs: ['./src', './packages', './lib'],
      maxDepth: 8
    })
    .cache(false) // Disable cache in dev for hot reload
    .debug(true)
    .build();
}

/**
 * Pre-configured CI/CD scanner config
 */
export function createCIConfig(): ScannerConfig {
  return configureScanner()
    .environment('ci')
    .strategy('source-only')
    .fileOptions({
      includeTypeScript: true,
      includeJavaScript: false,
      maxFiles: 500,
      timeout: 15000
    })
    .directories({
      baseDirs: ['./src', './packages'],
      maxDepth: 6
    })
    .cache(false)
    .debug(true)
    .build();
}

// ========================================
// INITIALIZATION
// ========================================

// Auto-configure based on environment
const env = detectEnvironment();
switch (env) {
  case 'production':
    setScannerConfig(createProductionConfig());
    break;
  case 'development':
    setScannerConfig(createDevelopmentConfig());
    break;
  case 'ci':
  case 'test':
    setScannerConfig(createCIConfig());
    break;
}

console.log(`🔧 File scanner auto-configured for ${env} environment`);
