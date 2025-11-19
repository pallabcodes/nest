# @neat-orm/mongodb

**Production-Grade MongoDB Support for NeatORM**

MongoDB adapter with full TypeScript type safety, advanced query builders, and enterprise features.

## Installation

```bash
npm install @neat-orm/core @neat-orm/mongodb reflect-metadata
```

## Quick Start

```typescript
import 'reflect-metadata';
import { Entity, Column, PrimaryKey } from '@neat-orm/core';
import { createMongoAdapter, MongoDBRepository } from '@neat-orm/mongodb';

// Define entity
@Entity('users')
export class User {
  @PrimaryKey()
  @Column({ type: 'ObjectId' })
  _id!: ObjectId;
  
  @Column()
  name!: string;
  
  @Column()
  email!: string;
}

// Create adapter
const adapter = createMongoAdapter({
  url: 'mongodb://localhost:27017',
  database: 'mydb'
});

await adapter.connect();

// Use repository
const userRepo = new MongoDBRepository(User, adapter);
const users = await userRepo.find({ name: 'John' });
```

## Features

- ✅ **Type-Safe Query Builder** - Full TypeScript support
- ✅ **Advanced Queries** - Aggregation pipelines, text search, geospatial
- ✅ **Transaction Support** - MongoDB 4.0+ transactions
- ✅ **Schema Validation** - Built-in validation decorators
- ✅ **Indexing** - Automatic index creation
- ✅ **Caching** - Integrated with NeatORM cache layer
- ✅ **Migrations** - Schema migrations and seeding
- ✅ **Production-Ready** - Enterprise-grade reliability

## Documentation

See full documentation at [neat-orm.dev/mongodb](https://neat-orm.dev/mongodb)

## License

MIT

