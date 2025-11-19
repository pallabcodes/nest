# Neat Framework - Complete Database Integration Example

This example demonstrates the full database integration capabilities of Neat Framework with EntityManager, Repositories, and proper service layer integration.

Shows how Neat now provides complete parity with NestJS + TypeORM for database operations.

```typescript
import { Injectable } from '../core/src/decorators/index.js';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  BaseEntity,
  createDatabaseConnection,
  createEntityManager,
  registerEntityManager,
  getEntityManager,
  brandDatabaseUrl
} from '../core/src/database/index.js';

// ... rest of the complete database integration code ...
```

See the original file for complete implementation details.

