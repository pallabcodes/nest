# @neat-orm/mongodb - Complete Guide

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Entity Definition](#entity-definition)
4. [Querying](#querying)
5. [Repositories](#repositories)
6. [Transactions](#transactions)
7. [Indexes](#indexes)
8. [Seeding](#seeding)
9. [Caching](#caching)
10. [Best Practices](#best-practices)

---

## Installation

```bash
# Install both packages
npm install @neat-orm/core @neat-orm/mongodb mongodb reflect-metadata

# TypeScript configuration
# Ensure your tsconfig.json has:
# "experimentalDecorators": true
# "emitDecoratorMetadata": true
```

---

## Quick Start

```typescript
import 'reflect-metadata';
import { Entity, Column, PrimaryKey } from '@neat-orm/core';
import { createMongoAdapter, MongoDBRepository, ObjectId } from '@neat-orm/mongodb';

// Define entity
@Entity('users')
class User {
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

---

## Entity Definition

### Basic Entity

```typescript
import { Entity, Column, PrimaryKey } from '@neat-orm/core';
import { ObjectId } from '@neat-orm/mongodb';

@Entity('users')
export class User {
  @PrimaryKey()
  @Column({ type: 'ObjectId' })
  _id!: ObjectId;
  
  @Column()
  name!: string;
  
  @Column()
  email!: string;
  
  @Column()
  age!: number;
  
  @Column()
  createdAt!: Date;
}
```

### With Soft Deletes

```typescript
@Entity('products')
export class Product {
  @PrimaryKey()
  @Column({ type: 'ObjectId' })
  _id!: ObjectId;
  
  @Column()
  name!: string;
  
  @Column()
  price!: number;
  
  @Column({ nullable: true })
  deletedAt?: Date | null;  // Soft delete field
}
```

---

## Querying

### Basic Queries

```typescript
// Find all
const users = await userRepo.find();

// Find with filter
const activeUsers = await userRepo.find({
  where: { status: 'active' }
});

// Find with options
const users = await userRepo.find({
  where: { age: { $gte: 18 } },
  sort: { name: 1 },
  limit: 10,
  skip: 20
});

// Find one
const user = await userRepo.findOne({ email: 'john@example.com' });

// Find by ID
const user = await userRepo.findById('507f1f77bcf86cd799439011');

// Count
const count = await userRepo.count({ status: 'active' });

// Check existence
const exists = await userRepo.exists({ email: 'john@example.com' });
```

### Query Builder

```typescript
import { createMongoQuery } from '@neat-orm/mongodb';

const query = createMongoQuery(adapter, 'users')
  .where({ age: { $gt: 18 } })
  .where({ status: 'active' })
  .sort({ name: 1 })
  .limit(10);

const users = await query.all();
```

### Aggregation Pipelines

```typescript
const stats = await createMongoQuery(adapter, 'orders')
  .aggregate([
    { $match: { status: 'completed' } },
    { $group: {
      _id: '$userId',
      totalAmount: { $sum: '$amount' },
      orderCount: { $sum: 1 }
    }},
    { $sort: { totalAmount: -1 } },
    { $limit: 10 }
  ])
  .execute();
```

### Text Search

```typescript
const articles = await createMongoQuery(adapter, 'articles')
  .where({ $text: { $search: 'typescript mongodb' } })
  .select({ title: 1, score: { $meta: 'textScore' } })
  .sort({ score: { $meta: 'textScore' } })
  .limit(10)
  .all();
```

### Geospatial Queries

```typescript
const nearby = await createMongoQuery(adapter, 'locations')
  .where({
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [-73.97, 40.77]
        },
        $maxDistance: 5000  // 5km
      }
    }
  })
  .all();
```

---

## Repositories

### CRUD Operations

```typescript
// Create
const user = await userRepo.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});

// Create many
const users = await userRepo.createMany([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' }
]);

// Update by ID
await userRepo.update(userId, {
  $set: { age: 31 },
  $inc: { loginCount: 1 }
});

// Update many
await userRepo.updateMany(
  { age: { $lt: 18 } },
  { $set: { status: 'minor' } }
);

// Delete by ID
await userRepo.delete(userId);

// Delete many
await userRepo.deleteMany({ status: 'inactive' });
```

### Soft Deletes

```typescript
// Soft delete
await userRepo.softDelete(userId);

// Find including soft deleted
const allUsers = await userRepo.find({ withTrashed: true });

// Find only soft deleted
const deletedUsers = await userRepo.find({ onlyTrashed: true });

// Restore
await userRepo.restore(userId);

// Force delete (permanent)
await userRepo.forceDelete(userId);
```

---

## Transactions

### Basic Transaction

```typescript
import { withTransaction } from '@neat-orm/mongodb';

await withTransaction(adapter, async (session) => {
  await userRepo.create({ name: 'John' });
  await postRepo.create({ title: 'Hello World', userId: user._id });
  // Automatically commits or rolls back
});
```

### Complex Transaction

```typescript
try {
  await withTransaction(adapter, async (session) => {
    // Transfer money
    await accountRepo.update(fromId, { $inc: { balance: -amount } });
    await accountRepo.update(toId, { $inc: { balance: amount } });
    
    // Record transaction
    await transactionRepo.create({
      fromId,
      toId,
      amount,
      status: 'completed'
    });
  });
} catch (error) {
  console.error('Transaction failed:', error);
}
```

---

## Indexes

### Field Indexes

```typescript
import { MongoDBIndex } from '@neat-orm/mongodb';

@Entity('users')
export class User {
  @MongoDBIndex(1, { unique: true })
  @Column()
  email!: string;
  
  @MongoDBIndex(-1)  // Descending
  @Column()
  createdAt!: Date;
}
```

### Compound Indexes

```typescript
import { MongoDBCompoundIndex } from '@neat-orm/mongodb';

@Entity('users')
@MongoDBCompoundIndex({ email: 1, status: 1 }, { unique: true })
export class User {
  @Column()
  email!: string;
  
  @Column()
  status!: string;
}
```

### Text Indexes

```typescript
import { MongoDBTextIndex } from '@neat-orm/mongodb';

@Entity('articles')
@MongoDBTextIndex(['title', 'content'])
export class Article {
  @Column()
  title!: string;
  
  @Column()
  content!: string;
}
```

### Geospatial Indexes

```typescript
import { MongoDBGeospatialIndex } from '@neat-orm/mongodb';

@Entity('locations')
@MongoDBGeospatialIndex('coordinates', '2dsphere')
export class Location {
  @Column()
  coordinates!: {
    type: 'Point';
    coordinates: [number, number];
  };
}
```

### TTL Indexes

```typescript
import { MongoDBTTLIndex } from '@neat-orm/mongodb';

@Entity('sessions')
@MongoDBTTLIndex('expiresAt', 3600)  // Expire after 1 hour
export class Session {
  @Column()
  expiresAt!: Date;
}
```

---

## Seeding

### Create Factory

```typescript
import { createMongoFactory } from '@neat-orm/mongodb';

const userFactory = createMongoFactory<User>((index) => ({
  name: `User ${index}`,
  email: `user${index}@example.com`,
  age: 20 + index,
  createdAt: new Date()
}));

// Generate data
const users = await userFactory.makeMany(100);

// Create in database
await userRepo.createMany(users);
```

### Create Seeder

```typescript
import { MongoDBSeeder } from '@neat-orm/mongodb';

export class UserSeeder implements MongoDBSeeder {
  name = 'UserSeeder';
  order = 10;
  
  async run(adapter: MongoDBAdapter) {
    const userRepo = new MongoDBRepository(User, adapter);
    const users = await userFactory.createMany(userRepo, 100);
    console.log('Seeded', users.length, 'users');
  }
  
  async rollback(adapter: MongoDBAdapter) {
    const collection = adapter.getCollection('users');
    await collection.deleteMany({});
  }
}
```

### Run Seeders

```typescript
import { MongoDBSeederRunner } from '@neat-orm/mongodb';

const runner = new MongoDBSeederRunner(adapter);
await runner.run([new UserSeeder(), new ProductSeeder()]);
```

---

## Caching

### Setup Caching

```typescript
import { CacheManager, MemoryCache } from '@neat-orm/core';
import { CachedMongoDBAdapter } from '@neat-orm/mongodb';

const cacheManager = new CacheManager({
  layers: [
    { cache: new MemoryCache({ maxEntries: 1000 }), priority: 1 }
  ]
});

const cachedAdapter = new CachedMongoDBAdapter(adapter, cacheManager);
```

### Cached Queries

```typescript
const query = createMongoQuery(adapter, 'users')
  .where({ age: { $gt: 18 } });

const users = await cachedAdapter.executeCached(query, {
  cache: true,
  ttl: 60000,  // 1 minute
  tables: ['users']
});
```

### Cache Invalidation

```typescript
// Invalidate specific collections
await cachedAdapter.invalidateCollections(['users', 'posts']);

// Clear all caches
await cachedAdapter.clearAll();
```

---

## Best Practices

### 1. Connection Management

```typescript
// Create adapter once
const adapter = createMongoAdapter({ url, database });
await adapter.connect();

// Reuse adapter across repositories
const userRepo = new MongoDBRepository(User, adapter);
const postRepo = new MongoDBRepository(Post, adapter);

// Close when done
await adapter.disconnect();
```

### 2. Index Strategy

- Index frequently queried fields
- Use compound indexes for multi-field queries
- Create text indexes for full-text search
- Use sparse indexes for nullable fields
- Monitor index usage and remove unused indexes

### 3. Query Optimization

- Use projection to select only needed fields
- Add limits to prevent large result sets
- Use aggregation pipelines for complex queries
- Enable caching for frequently accessed data

### 4. Transaction Guidelines

- Keep transactions short
- Don't perform I/O operations in transactions
- Handle errors and rollback properly
- Use transactions only when necessary

### 5. Schema Design

- Embed related data when accessed together
- Use references for large or frequently updated data
- Denormalize for read-heavy workloads
- Use soft deletes for audit trails

---

## Migration from Other ORMs

### From Mongoose

```typescript
// Mongoose
const UserSchema = new Schema({
  name: String,
  email: String
});
const User = model('User', UserSchema);

// NeatORM MongoDB
@Entity('users')
class User {
  @Column() name!: string;
  @Column() email!: string;
}
```

### From TypeORM

```typescript
// TypeORM (SQL)
@Entity()
class User {
  @PrimaryGeneratedColumn()
  id!: number;
  
  @Column()
  name!: string;
}

// NeatORM MongoDB
@Entity('users')
class User {
  @Column({ type: 'ObjectId' })
  _id!: ObjectId;
  
  @Column()
  name!: string;
}
```

---

## Troubleshooting

### Connection Issues

```typescript
// Test connection
const isHealthy = await adapter.testConnection();
if (!isHealthy) {
  console.error('MongoDB connection unhealthy');
}

// Check connection state
if (!adapter.isConnected()) {
  await adapter.connect();
}
```

### Query Debugging

```typescript
// See generated query
const query = createMongoQuery(adapter, 'users')
  .where({ age: { $gt: 18 } });

console.log('Query JSON:', query.toJSON());
```

---

## License

MIT

