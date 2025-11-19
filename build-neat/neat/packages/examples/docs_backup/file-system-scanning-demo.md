# Neat Framework - Production File System Scanning Demo

This demo showcases the production-ready file system scanning capabilities that work in both development and production environments.

Key Features Demonstrated:
- Environment-aware scanning (dev/prod)
- Multiple file type support (.ts, .js, .d.ts)
- Configuration-based scanning
- Performance optimizations with caching
- Fallback strategies for different environments
- Auto-discovery with manual registration fallbacks

```typescript
import { MetadataScanner } from '../core/src/metadata/index.js';
import { setScannerConfig, createDevelopmentConfig, createProductionConfig } from '../core/src/metadata/config.js';

// ... rest of the file system scanning demo code ...
```

See the original file for complete implementation details.

