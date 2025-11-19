# Neat Framework - Complete HTTP Integration Example

This example demonstrates the full HTTP layer integration in Neat Framework:
- Controller decorators (@Controller, @Get, @Post)
- Automatic route discovery
- HTTP adapter integration (Fastify)
- Complete application startup

Shows how the framework automatically wires everything together.

```typescript
import { Injectable, Controller, StartupApplication } from '../core/src/decorators/index.js';
import { createFastifyAdapter, registerControllerRoutes } from '../core/src/http/index.js';
import { brandPort } from '../core/src/types/branded.js';

// ... rest of the HTTP integration code ...
```

See the original file for complete implementation details.

