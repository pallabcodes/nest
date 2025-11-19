# Neat Framework - Strategy Pattern Example

This example demonstrates the @Strategy and @FactoryPattern decorators working together to provide dynamic strategy selection and factory patterns.

Key Features Demonstrated:
- @Strategy decorator for marking strategy implementations
- @FactoryPattern decorator for creating strategy factories
- Type-safe strategy selection and execution
- Integration with dependency injection
- Automatic strategy discovery and registration

```typescript
import { Injectable, Strategy, FactoryPattern, StartupApplication } from '../core/src/decorators/index.js';
import { brandPort } from '../core/src/types/branded.js';

// ... rest of the strategy pattern code ...
```

See the original file for complete implementation details.

