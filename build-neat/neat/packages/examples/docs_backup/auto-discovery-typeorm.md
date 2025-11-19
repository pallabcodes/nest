# Neat Framework - Auto-Discovery TypeORM Example

Revolutionary zero-boilerplate ORM integration!

This example demonstrates Neat's auto-discovery TypeORM module that automatically finds entities, creates repositories, and injects them.

Key Innovation: No forRoot/forFeature! Just import and everything works.

Comparison with NestJS:
- NestJS: 15+ lines of configuration
- Neat: 1 line + auto-discovery

This is the future of ORM integration.

```typescript
import { Injectable } from '../core/src/decorators/index.js';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne
} from '../core/src/database/index.js';
import { BaseEntity } from '../core/src/database/types.js';
import {
  NeatTypeORMModule,
  InjectRepository,
  registerEntity
} from '../core/src/database/index.js';

// ... rest of the TypeORM auto-discovery code ...
```

See the original file for complete implementation details.

