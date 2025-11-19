# Neat Framework - Complete Middleware Integration Example

This example demonstrates the comprehensive middleware system in Neat Framework:
- Request logging middleware
- CORS middleware
- JSON body parsing middleware
- Error handling middleware
- Custom middleware creation
- Middleware composition and ordering

Shows how middleware enables enterprise-grade request processing with type safety.

```typescript
import { Injectable, Controller, StartupApplication } from '../core/src/decorators/index.js';
import {
  createFastifyAdapter,
  registerControllerRoutes,
  createRequestLoggingMiddleware,
  createCORSMiddleware,
  createJSONBodyParserMiddleware,
  createErrorHandlingMiddleware,
  composeMiddleware,
  MiddlewareRegistry
} from '../core/src/http/index.js';
import { brandPort } from '../core/src/types/branded.js';

// ... rest of the middleware integration code ...
```

See the original file for complete implementation details.

