# Neat Framework - Auto-Discovery Mongoose Example

Revolutionary zero-boilerplate MongoDB integration!

This example demonstrates Neat's auto-discovery Mongoose module that automatically finds schemas, creates MongoDB connections, and injects models.

Key Innovation: No forRoot/forFeature! Just import and everything works.

Comparison with NestJS:
- NestJS: Complex MongooseModule setup
- Neat: 1 line + auto-discovery magic

This shows Neat can handle both SQL and NoSQL databases seamlessly!

```typescript
import { Injectable } from '../core/src/decorators/index.js';
import {
  Schema,
  Prop,
  NeatMongooseModule,
  InjectModel,
  registerSchema
} from '../core/src/database/index.js';

// ... rest of the Mongoose auto-discovery code ...
```

See the original file for complete implementation details.

