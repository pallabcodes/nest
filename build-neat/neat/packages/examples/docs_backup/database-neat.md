# Neat Framework - Database Integration Example

This example demonstrates the database integration capabilities of Neat Framework:
- Database connection management
- Entity definitions with decorators (simplified for demo)
- Repository pattern concepts
- Type-safe database operations
- Connection pooling and transactions

Shows how Neat provides a foundation for building type-safe database applications.

```typescript
import { Injectable } from '../core/src/decorators/index.js';
import { BaseEntity } from '../core/src/database/types.js';
import { createDatabaseConnection } from '../core/src/database/connection.js';
import { brandDatabaseUrl } from '../core/src/database/types.js';

// ... rest of the database integration code ...
```

See the original file for complete implementation details.

