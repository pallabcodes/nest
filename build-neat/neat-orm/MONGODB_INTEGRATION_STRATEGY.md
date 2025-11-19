# 🍃 MongoDB Integration Strategy for NeatORM

## Executive Summary

**Problem**: How to add MongoDB (NoSQL) support without bloating `@neat-orm/core` for SQL-only projects?

**Solution**: **Separate Package Architecture** - Keep SQL and NoSQL separate, provide unified abstraction layer.

---

## 🎯 Design Principles

### 1. **Zero Bloat for SQL-Only Projects**
- `@neat-orm/core` remains SQL-only
- MongoDB support in separate package
- No MongoDB dependencies in core package

### 2. **Unified API Where Possible**
- Common interfaces for both SQL and NoSQL
- Same decorators, same patterns
- Seamless switching between databases

### 3. **Leverage Existing Work**
- Use MongoDB integration from `@neat` framework
- Reuse adapter pattern from SQL adapters
- Maintain consistency with existing architecture

### 4. **Type Safety First**
- Full TypeScript support for MongoDB
- Type-safe query builders
- Compile-time validation

---

## 📦 Package Architecture

### **Option 1: Separate Package (RECOMMENDED)** ✅

```
@neat-orm/
├── core/                    # SQL-only (Postgres, MySQL, SQLite)
│   ├── adapters/           # SQL adapters only
│   ├── query-builder/      # SQL query builder
│   └── ...
│
├── mongodb/                 # MongoDB support (NEW)
│   ├── adapter/            # MongoDB adapter
│   ├── query-builder/       # MongoDB query builder
│   ├── schema/             # MongoDB schema decorators
│   └── ...
│
└── unified/                # Unified abstraction (OPTIONAL)
    ├── repository/         # Works with both SQL and NoSQL
    ├── entity-manager/     # Unified entity manager
    └── ...
```

**Pros**:
- ✅ Zero bloat for SQL-only projects
- ✅ Clear separation of concerns
- ✅ Can install only what you need
- ✅ Independent versioning
- ✅ Easier to maintain

**Cons**:
- ⚠️ Need to manage multiple packages
- ⚠️ Slightly more complex setup

**Installation**:
```bash
# SQL-only project
npm install @neat-orm/core

# MongoDB project
npm install @neat-orm/core @neat-orm/mongodb

# Both SQL and MongoDB
npm install @neat-orm/core @neat-orm/mongodb
```

---

### **Option 2: Monorepo with Optional Dependencies** ⚠️

```
@neat-orm/
├── core/                    # Core + SQL adapters
│   └── package.json        # mongodb: optional peer dependency
│
└── mongodb/                 # MongoDB adapter (peer dependency)
    └── package.json
```

**Pros**:
- ✅ Single package to install
- ✅ Still optional (peer dependency)

**Cons**:
- ⚠️ Still includes MongoDB types in core
- ⚠️ More complex dependency management
- ⚠️ Can confuse users about what's included

---

### **Option 3: Plugin Architecture** ✅ (Alternative)

```
@neat-orm/
├── core/                    # Core + adapter interface
│   └── adapters/           # Base adapter interface only
│
└── adapters/                # Separate adapter packages
    ├── postgres/
    ├── mysql/
    ├── sqlite/
    └── mongodb/             # MongoDB adapter
```

**Pros**:
- ✅ Maximum flexibility
- ✅ Each adapter is independent
- ✅ Can add custom adapters easily

**Cons**:
- ⚠️ More packages to manage
- ⚠️ More complex for simple use cases

---

## 🏗️ Recommended Architecture: Option 1

### **Package Structure**

```
@neat-orm/
├── packages/
│   ├── core/                # SQL-only ORM
│   │   ├── src/
│   │   │   ├── adapters/    # SQL adapters (Postgres, MySQL, SQLite)
│   │   │   ├── query-builder/  # SQL query builder
│   │   │   ├── repository/  # SQL repository
│   │   │   └── ...
│   │   └── package.json     # No MongoDB dependencies
│   │
│   ├── mongodb/             # MongoDB support (NEW)
│   │   ├── src/
│   │   │   ├── adapter/     # MongoDB adapter
│   │   │   ├── query-builder/  # MongoDB query builder
│   │   │   ├── schema/      # MongoDB schema decorators
│   │   │   ├── repository/  # MongoDB repository
│   │   │   └── ...
│   │   └── package.json     # Depends on @neat-orm/core
│   │
│   └── unified/             # Unified abstraction (OPTIONAL)
│       ├── src/
│       │   ├── repository/  # Works with both SQL and NoSQL
│       │   ├── entity-manager/  # Unified entity manager
│       │   └── ...
│       └── package.json     # Depends on core + mongodb
```

---

## 🔌 Adapter Interface Design

### **Unified Adapter Interface**

```typescript
// @neat-orm/core/src/adapters/base-adapter.ts

/**
 * Base interface for all database adapters (SQL and NoSQL)
 */
export interface DatabaseAdapter {
  readonly dialect: 'postgres' | 'mysql' | 'sqlite' | 'mongodb';
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Unified query execution
  execute<T = DatabaseRow>(
    query: string | QueryBuilder,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
  
  // Transaction support (MongoDB 4.0+)
  beginTransaction(options?: TransactionOptions): Promise<Transaction>;
  
  // Connection management
  getConnection(): Promise<DatabaseConnection>;
  
  // Health checks
  testConnection(): Promise<boolean>;
}
```

### **MongoDB-Specific Adapter**

```typescript
// @neat-orm/mongodb/src/adapter/mongodb-adapter.ts

import { DatabaseAdapter, QueryResult } from '@neat-orm/core';
import { MongoClient, Collection } from 'mongodb';

export interface MongoDBConfig {
  dialect: 'mongodb';
  url: string;
  database: string;
  options?: MongoClientOptions;
}

export class MongoDBAdapter implements DatabaseAdapter {
  readonly dialect = 'mongodb' as const;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  
  constructor(private config: MongoDBConfig) {}
  
  async connect(): Promise<void> {
    this.client = new MongoClient(this.config.url, this.config.options);
    await this.client.connect();
    this.db = this.client.db(this.config.database);
  }
  
  async execute<T = DatabaseRow>(
    query: string | MongoDBQueryBuilder,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (typeof query === 'string') {
      // Execute raw MongoDB query (JSON)
      const parsed = JSON.parse(query);
      return this.executeRaw(parsed);
    }
    
    // Execute query builder
    return query.execute(this.db!);
  }
  
  // MongoDB-specific methods
  getCollection<T>(name: string): Collection<T> {
    return this.db!.collection<T>(name);
  }
  
  // ... other MongoDB-specific methods
}
```

---

## 🎨 Schema Definition (Unified Decorators)

### **SQL Entities** (Existing)

```typescript
// @neat-orm/core
import { Entity, Column, PrimaryKey } from '@neat-orm/core';

@Entity('users')
export class User {
  @PrimaryKey()
  @Column({ type: 'serial' })
  id!: number;
  
  @Column({ type: 'varchar', length: 255 })
  name!: string;
}
```

### **MongoDB Schemas** (New - Same Decorators!)

```typescript
// @neat-orm/mongodb
import { Entity, Column, PrimaryKey } from '@neat-orm/core';

@Entity('users')  // Same decorator!
export class User {
  @PrimaryKey()
  @Column({ type: 'ObjectId' })  // MongoDB-specific type
  _id!: ObjectId;
  
  @Column({ type: 'string' })
  name!: string;
  
  @Column({ type: 'date' })
  createdAt!: Date;
}
```

**Key Insight**: Use **same decorators** but different implementations!

---

## 🔄 Query Builder Design

### **SQL Query Builder** (Existing)

```typescript
// @neat-orm/core
const users = await db
  .select('id', 'name', 'email')
  .from('users')
  .where('age', '>', 18)
  .execute();
```

### **MongoDB Query Builder** (New - Similar API!)

```typescript
// @neat-orm/mongodb
const users = await db
  .select('_id', 'name', 'email')
  .from('users')
  .where('age', '>', 18)
  .execute();

// MongoDB-specific features
const users = await db
  .from('users')
  .where('tags', 'in', ['admin', 'user'])
  .aggregate([
    { $match: { age: { $gt: 18 } } },
    { $group: { _id: '$department', count: { $sum: 1 } } }
  ])
  .execute();
```

**Key Insight**: **Similar API**, but MongoDB-specific features available!

---

## 📚 Repository Pattern (Unified)

### **Unified Repository Interface**

```typescript
// @neat-orm/core/src/repository/base-repository.ts

export interface BaseRepository<T> {
  findById(id: string | number): Promise<T | null>;
  find(options?: FindOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  delete(id: string | number): Promise<void>;
}
```

### **SQL Repository** (Existing)

```typescript
// @neat-orm/core
@Repository(User)
export class UserRepository extends BaseRepository<User> {
  // SQL-specific methods
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }
}
```

### **MongoDB Repository** (New)

```typescript
// @neat-orm/mongodb
@Repository(User)
export class UserRepository extends BaseRepository<User> {
  // MongoDB-specific methods
  async findByEmail(email: string): Promise<User | null> {
    return this.collection.findOne({ email });
  }
  
  async search(text: string): Promise<User[]> {
    return this.collection.find({
      $text: { $search: text }
    }).toArray();
  }
}
```

---

## 🎯 Implementation Strategy

### **Phase 1: Core Abstraction** (Week 1-2)

1. **Extend Base Adapter Interface**
   ```typescript
   // Add MongoDB dialect support
   export type DatabaseDialect = 'postgres' | 'mysql' | 'sqlite' | 'mongodb';
   ```

2. **Create MongoDB Package Structure**
   ```
   @neat-orm/mongodb/
   ├── src/
   │   ├── adapter/
   │   ├── query-builder/
   │   ├── schema/
   │   └── repository/
   └── package.json
   ```

3. **Implement MongoDB Adapter**
   - Use native MongoDB driver (not Mongoose)
   - Implement `DatabaseAdapter` interface
   - Support transactions (MongoDB 4.0+)

### **Phase 2: Query Builder** (Week 3-4)

1. **MongoDB Query Builder**
   - Similar API to SQL query builder
   - Support MongoDB-specific features
   - Type-safe aggregation pipeline

2. **Schema Decorators**
   - Reuse existing decorators
   - MongoDB-specific type mappings
   - Index support

### **Phase 3: Repository & Integration** (Week 5-6)

1. **MongoDB Repository**
   - Extend base repository
   - MongoDB-specific methods
   - Full-text search support

2. **Integration with @neat Framework**
   - Use existing Mongoose driver from @neat
   - Provide adapter wrapper
   - Auto-discovery support

### **Phase 4: Unified Abstraction** (Week 7-8) - OPTIONAL

1. **Unified Repository**
   - Works with both SQL and NoSQL
   - Automatic adapter selection
   - Type-safe switching

2. **Multi-Database Support**
   - Use SQL for some entities
   - Use MongoDB for others
   - Seamless integration

---

## 💡 Key Design Decisions

### **1. Use Native MongoDB Driver (Not Mongoose)**

**Why**:
- ✅ More control over implementation
- ✅ Better performance (less abstraction)
- ✅ Aligns with SQL adapter approach
- ✅ No external ODM dependency

**Alternative**: Provide Mongoose adapter wrapper (optional)

### **2. Reuse Decorators**

**Why**:
- ✅ Familiar API for developers
- ✅ Same patterns for SQL and NoSQL
- ✅ Easier migration between databases
- ✅ Consistent developer experience

### **3. Separate Package**

**Why**:
- ✅ Zero bloat for SQL-only projects
- ✅ Clear separation of concerns
- ✅ Independent versioning
- ✅ Can install only what you need

### **4. Unified Interface Where Possible**

**Why**:
- ✅ Same patterns for both SQL and NoSQL
- ✅ Easier to switch databases
- ✅ Consistent developer experience
- ✅ Type-safe abstraction

---

## 📦 Package.json Structure

### **@neat-orm/core** (SQL-only)

```json
{
  "name": "@neat-orm/core",
  "version": "1.0.0",
  "dependencies": {
    "pg": "^8.11.0",
    "mysql2": "^3.6.0",
    "better-sqlite3": "^9.0.0"
    // NO MongoDB dependencies!
  },
  "peerDependencies": {
    "reflect-metadata": "^0.1.13"
  }
}
```

### **@neat-orm/mongodb** (MongoDB support)

```json
{
  "name": "@neat-orm/mongodb",
  "version": "1.0.0",
  "dependencies": {
    "@neat-orm/core": "^1.0.0",
    "mongodb": "^6.0.0"
  },
  "peerDependencies": {
    "reflect-metadata": "^0.1.13"
  }
}
```

---

## 🎨 Usage Examples

### **SQL-Only Project** (No Bloat!)

```typescript
// Only install SQL package
import { createAdapter, Entity, Column } from '@neat-orm/core';

@Entity('users')
export class User {
  @Column()
  id!: number;
  
  @Column()
  name!: string;
}

const adapter = createAdapter({
  dialect: 'postgres',
  host: 'localhost',
  database: 'mydb'
});
```

### **MongoDB Project**

```typescript
// Install both packages
import { Entity, Column } from '@neat-orm/core';
import { createMongoAdapter } from '@neat-orm/mongodb';

@Entity('users')  // Same decorator!
export class User {
  @Column({ type: 'ObjectId' })
  _id!: ObjectId;
  
  @Column()
  name!: string;
}

const adapter = createMongoAdapter({
  dialect: 'mongodb',
  url: 'mongodb://localhost:27017',
  database: 'mydb'
});
```

### **Multi-Database Project**

```typescript
// Use both SQL and MongoDB
import { createAdapter } from '@neat-orm/core';
import { createMongoAdapter } from '@neat-orm/mongodb';

const sqlAdapter = createAdapter({ dialect: 'postgres', ... });
const mongoAdapter = createMongoAdapter({ dialect: 'mongodb', ... });

// Use SQL for relational data
const users = await sqlAdapter.execute('SELECT * FROM users');

// Use MongoDB for document data
const logs = await mongoAdapter.execute(
  db.from('logs').where('level', 'error')
);
```

---

## 🔄 Integration with @neat Framework

### **Leverage Existing MongoDB Support**

```typescript
// @neat-orm/mongodb/src/adapter/mongoose-adapter.ts (Optional)

import { MongooseDriver } from '@neat/core/database/drivers/mongoose-driver';
import { DatabaseAdapter } from '@neat-orm/core';

/**
 * Wrapper adapter for @neat framework's Mongoose driver
 * Allows using NeatORM with @neat's existing MongoDB integration
 */
export class MongooseAdapter implements DatabaseAdapter {
  constructor(private mongooseDriver: MongooseDriver) {}
  
  // Implement DatabaseAdapter interface
  // Wraps Mongoose driver methods
}
```

---

## ✅ Benefits of This Approach

### **1. Zero Bloat**
- ✅ SQL-only projects: No MongoDB code, no MongoDB dependencies
- ✅ MongoDB projects: Install only what you need
- ✅ Bundle size: Minimal for SQL-only projects

### **2. Clear Separation**
- ✅ SQL adapters in `@neat-orm/core`
- ✅ MongoDB adapter in `@neat-orm/mongodb`
- ✅ Easy to understand what's included

### **3. Flexible**
- ✅ Can use SQL only
- ✅ Can use MongoDB only
- ✅ Can use both together
- ✅ Easy to add more NoSQL databases (Redis, DynamoDB, etc.)

### **4. Consistent API**
- ✅ Same decorators for SQL and NoSQL
- ✅ Similar query builder API
- ✅ Same repository pattern
- ✅ Easy to switch databases

### **5. Type Safety**
- ✅ Full TypeScript support
- ✅ Type-safe query builders
- ✅ Compile-time validation
- ✅ MongoDB-specific types available

---

## 🚀 Migration Path

### **From SQL to MongoDB**

```typescript
// Before (SQL)
import { Entity, Column } from '@neat-orm/core';

@Entity('users')
export class User {
  @Column({ type: 'serial' })
  id!: number;
}

// After (MongoDB) - Minimal changes!
import { Entity, Column } from '@neat-orm/core';

@Entity('users')  // Same decorator!
export class User {
  @Column({ type: 'ObjectId' })  // Just change type
  _id!: ObjectId;
}
```

### **From @neat Framework MongoDB**

```typescript
// Before (@neat framework)
import { MongooseDriver } from '@neat/core';

// After (@neat-orm/mongodb)
import { createMongoAdapter } from '@neat-orm/mongodb';

// Same functionality, better type safety!
```

---

## 📊 Comparison with Competitors

| Feature | NeatORM (Proposed) | TypeORM | Prisma | Mongoose |
|---------|-------------------|---------|--------|----------|
| **SQL Support** | ✅ Separate package | ✅ Built-in | ✅ Built-in | ❌ |
| **MongoDB Support** | ✅ Separate package | ✅ Built-in | ⚠️ Limited | ✅ Built-in |
| **Zero Bloat** | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| **Unified API** | ✅ Yes | ⚠️ Partial | ⚠️ Partial | ❌ No |
| **Type Safety** | ✅✅✅ Excellent | ✅✅ Good | ✅✅✅ Excellent | ✅ Basic |

---

## 🎯 Recommendation

**Use Option 1: Separate Package Architecture**

1. ✅ **Zero bloat** for SQL-only projects
2. ✅ **Clear separation** of concerns
3. ✅ **Flexible** - use what you need
4. ✅ **Consistent API** - same patterns
5. ✅ **Type-safe** - full TypeScript support
6. ✅ **Leverages existing work** - use @neat's MongoDB support

**Implementation Priority**:
1. **P0**: Create `@neat-orm/mongodb` package structure
2. **P0**: Implement MongoDB adapter (native driver)
3. **P1**: MongoDB query builder (similar to SQL)
4. **P1**: Schema decorators (reuse existing)
5. **P2**: Unified abstraction layer (optional)
6. **P2**: Mongoose adapter wrapper (optional)

---

## 📝 Next Steps

1. **Create MongoDB Package**
   ```bash
   mkdir -p packages/mongodb/src/{adapter,query-builder,schema,repository}
   ```

2. **Implement MongoDB Adapter**
   - Use native MongoDB driver
   - Implement `DatabaseAdapter` interface
   - Support transactions

3. **Create MongoDB Query Builder**
   - Similar API to SQL query builder
   - MongoDB-specific features
   - Type-safe aggregation

4. **Documentation**
   - MongoDB-specific guides
   - Migration guides
   - Examples

5. **Integration Tests**
   - MongoDB adapter tests
   - Query builder tests
   - Repository tests

---

**Status**: ✅ **Architecture Approved**  
**Next**: Implement MongoDB adapter  
**Timeline**: 6-8 weeks for full implementation

