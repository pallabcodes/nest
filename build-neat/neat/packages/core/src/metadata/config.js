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
// ========================================
// DEFAULT CONFIGURATIONS
// ========================================
/**
 * Get default configuration based on environment
 */
export function getDefaultConfig(environment = detectEnvironment()) {
    const baseConfig = {
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
                    ...baseConfig.fileOptions,
                    maxFiles: 500
                }
            };
        case 'production':
            return {
                ...baseConfig,
                strategy: 'compiled-only',
                fileOptions: {
                    ...baseConfig.fileOptions,
                    includeTypeScript: false,
                    includeDeclarations: false
                }
            };
        case 'test':
        case 'ci':
            return {
                ...baseConfig,
                strategy: 'source-only',
                fileOptions: {
                    ...baseConfig.fileOptions,
                    maxFiles: 200
                },
                enableCache: false
            };
        default:
            return baseConfig;
    }
}
/**
 * Detect current environment
 */
export function detectEnvironment() {
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
function getDefaultScanDirs(environment) {
    const dirs = [];
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
let globalConfig = null;
/**
 * Set global scanner configuration
 */
export function setScannerConfig(config) {
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
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Failed to set scanner config')
        };
    }
}
/**
 * Get current scanner configuration
 */
export function getScannerConfig() {
    if (!globalConfig) {
        globalConfig = getDefaultConfig();
    }
    return globalConfig;
}
/**
 * Reset scanner configuration to defaults
 */
export function resetScannerConfig() {
    globalConfig = null;
}
let scanCache = null;
/**
 * Get cached scan results if valid
 */
export function getCachedScanResults(type, key) {
    const config = getScannerConfig();
    if (!config.enableCache || !scanCache) {
        return null;
    }
    const now = Date.now();
    if (now - scanCache.timestamp > (config.cacheTTL || 60000)) {
        scanCache = null;
        return null;
    }
    const cache = scanCache[type];
    return cache.get(key) || null;
}
/**
 * Cache scan results
 */
export function setCachedScanResults(type, key, results) {
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
    const cache = scanCache[type];
    cache.set(key, results);
    scanCache.timestamp = Date.now();
}
/**
 * Clear scan cache
 */
export function clearScanCache() {
    scanCache = null;
}
// ========================================
// ENVIRONMENT-SPECIFIC HELPERS
// ========================================
/**
 * Check if running in production environment
 */
export function isProduction() {
    return detectEnvironment() === 'production';
}
/**
 * Check if running in development environment
 */
export function isDevelopment() {
    return detectEnvironment() === 'development';
}
/**
 * Check if TypeScript source files should be scanned
 */
export function shouldScanTypeScript() {
    const config = getScannerConfig();
    return config.strategy === 'source-only' ||
        config.strategy === 'hybrid' ||
        (config.strategy === 'auto' && config.environment === 'development');
}
/**
 * Check if compiled JavaScript files should be scanned
 */
export function shouldScanJavaScript() {
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
    config = {};
    /**
     * Set environment
     */
    environment(env) {
        this.config.environment = env;
        return this;
    }
    /**
     * Set scanning strategy
     */
    strategy(strategy) {
        this.config.strategy = strategy;
        return this;
    }
    /**
     * Configure file scanning options
     */
    fileOptions(options) {
        this.config.fileOptions = { ...this.config.fileOptions, ...options };
        return this;
    }
    /**
     * Configure directory scanning
     */
    directories(config) {
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
    debug(enabled = true) {
        this.config.debug = enabled;
        return this;
    }
    /**
     * Enable caching
     */
    cache(enabled = true, ttl = 60000) {
        this.config.enableCache = enabled;
        this.config.cacheTTL = ttl;
        return this;
    }
    /**
     * Build the configuration
     */
    build() {
        const defaultConfig = getDefaultConfig(this.config.environment);
        return { ...defaultConfig, ...this.config };
    }
    /**
     * Apply the configuration globally
     */
    apply() {
        return setScannerConfig(this.build());
    }
}
/**
 * Create a scanner config builder
 */
export function configureScanner() {
    return new ScannerConfigBuilder();
}
// ========================================
// PRODUCTION CONFIGURATIONS
// ========================================
/**
 * Pre-configured production scanner config
 */
export function createProductionConfig() {
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
export function createDevelopmentConfig() {
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
export function createCIConfig() {
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
//# sourceMappingURL=config.js.map