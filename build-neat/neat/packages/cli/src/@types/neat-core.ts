// Mock types for @neat/core to allow CLI package to build independently

export const scanner = {
  scanForEntities: () => [],
  scanForServices: () => [],
  scanForControllers: () => [],
  scanForSchemas: () => [],
  scanForGuards: () => Promise.resolve([]),
  scanForPipes: () => Promise.resolve([]),
  scanForInterceptors: () => Promise.resolve([]),
  scanForExceptionFilters: () => Promise.resolve([])
};

export const getScannerConfig = () => ({
  enableCache: false,
  cacheTTL: 60000,
  directoryConfig: {
    baseDirs: ['src'],
    excludePatterns: ['**/node_modules/**']
  }
});

export const setScannerConfig = () => {};
export const createDevelopmentConfig = () => ({});
export const createProductionConfig = () => ({});
