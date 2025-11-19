# @neat-orm/core

**NeatOrm** is a next-generation TypeScript ORM that's **5x better** than existing solutions. It combines the best ideas from TypeORM, Prisma, Kysely, and Hibernate while solving their most painful problems.

## Why NeatOrm?

### 🎯 Pain Points Solved

✅ **N+1 Query Problem** → Automatic batching with DataLoader  
✅ **Circular Dependencies** → Bidirectional relationship registry  
✅ **Poor Type Safety** → 100% compile-time validation  
✅ **Ugly Query Syntax** → SQL-like, readable queries  
✅ **No Advanced SQL** → Full CTE, window function, view support  
✅ **Complex Transactions** → Automatic commit/rollback  
✅ **Migration Headaches** → Type-safe migration builder  

### 🚀 Key Features

- **SQL-Like Syntax** → Familiar to all developers
- **God-Tier TypeScript** → Branded types, phantom types, compile-time validation
- **Zero N+1 Queries** → Automatic batching (Facebook's DataLoader pattern)
- **Zero Circular Dependencies** → Clean relationship registry
- **Advanced SQL Support** → CTEs, window functions, materialized views
- **Transaction Safety** → Automatic commit/rollback with timeout protection
- **Type-Safe Migrations** → Schema builder with full IDE support
- **Enterprise Ready** → Designed for production from day one

## Installation

```bash
npm install @neat-orm/core
```

## Quick Start

### 1. Define Entities (No Circular Dependencies!)

```typescript
import { Entity, Column, PrimaryGeneratedColumn, HasMany, BelongsTo } from '@neat-orm/core';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @ReferencedBy(() => Post, 'userId')
  posts?: Post[];
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({ type: 'integer' })
  userId!: number;

  @References(() => User, 'userId')
  author?: User;
}
```

### 2. Define Relationships (Solves Circular Deps!)

```typescript
import { defineRelationships } from '@neat-orm/core';

defineRelationships({
  User: {
    posts: { type: 'referencedBy', target: Post, foreignKey: 'userId' },
  },
  Post: {
    author: { type: 'references', target: User, foreignKey: 'userId' },
  },
});
```

### 3. Type-Safe Queries (SQL-Like Syntax!)

```typescript
// Clean API - no verbose phantom types!
const users = await query<User>()
  .select('id', 'name', 'email')
  .from('users')
  .where('age', '>', 18)
  .orderBy('name', 'ASC')
  .execute();
// Type: Array<{ id: number; name: string; email: string }>

// INSERT with RETURNING
const user = await insert<User>()
  .into('users')
  .values({ name: 'Alice', email: 'alice@example.com' })
  .returning('id', 'name')
  .execute();
// Type: { id: number; name: string }

// UPDATE with WHERE
await update<User>()
  .table('users')
  .set({ name: 'Alice Updated' })
  .where('id', '=', 1)
  .execute();

// DELETE with safety
await delete_()
  .from('users')
  .where('id', '=', 1)
  .execute();
```

### 4. N+1 Prevention (Automatic!)

```typescript
import { RelationLoader } from '@neat-orm/core';

// Load posts with authors (NO N+1!)
const posts = await db.select('*').from('posts').execute();
const relationLoader = new RelationLoader();
const authorsMap = await relationLoader.loadBelongsTo(
  posts,
  'author',
  { type: 'belongsTo', target: User, foreignKey: 'userId' }
);

// Only 2 queries executed:
// 1. SELECT * FROM posts
// 2. SELECT * FROM users WHERE id IN (1, 2, 3, ...)
```

### 5. Transactions (Automatic!)

```typescript
import { TransactionManager } from '@neat-orm/core';

const txManager = new TransactionManager();

await txManager.transaction(async (tx) => {
  await createUser(tx);
  await createPost(tx);
  // Automatically commits on success
  // Automatically rolls back on error
});
```

### 6. Advanced SQL (First-Class Support!)

```typescript
// CTEs (Common Table Expressions)
const hierarchy = cte('hierarchy', true)
  .columns(['id', 'name', 'parent_id', 'level'])
  .as(`
    SELECT id, name, parent_id, 0 as level
    FROM departments WHERE parent_id IS NULL
    UNION ALL
    SELECT d.id, d.name, d.parent_id, h.level + 1
    FROM departments d
    JOIN hierarchy h ON d.parent_id = h.id
  `);

// Window Functions
const ranking = window<Employee>()
  .rowNumber()
  .partitionBy('department')
  .orderBy('salary', 'DESC')
  .build();

// Materialized Views
const userStats = materializedView('user_stats')
  .as(db.select('user_id').selectAs('COUNT(*)', 'post_count').from('posts'));
```

### 7. Migrations (Type-Safe!)

```typescript
import { migration } from '@neat-orm/core';

export const createUsers = migration(
  '20240101000000_create_users',
  async (ctx) => {
    await ctx.createTable('users')
      .integer('id', { primaryKey: true, autoIncrement: true })
      .string('name', 255, { nullable: false })
      .string('email', 255, { unique: true })
      .timestamps();
  },
  async (ctx) => {
    await ctx.dropTable('users');
  }
);
```

## Architecture

NeatOrm is built on solid principles:

- **Phantom Types** → State machine validation at compile time
- **Branded Types** → Nominal typing for IDs and values
- **DataLoader Pattern** → Automatic batching (Facebook's proven solution)
- **Relationship Registry** → No circular dependencies
- **SQL-First** → Generate optimal SQL, not bloated queries

## Comparison

| Feature | NeatOrm | TypeORM | Prisma | Sequelize |
|---------|---------|---------|--------|-----------|
| **SQL-like Syntax** | ✅ | ❌ | ⚠️ | ❌ |
| **Compile-time Type Safety** | ✅ | ⚠️ | ✅ | ❌ |
| **Auto N+1 Prevention** | ✅ | ❌ | ❌ | ❌ |
| **No Circular Deps** | ✅ | ❌ | N/A | ❌ |
| **Advanced SQL (CTEs, Windows)** | ✅ | ❌ | ⚠️ | ❌ |
| **Type-Safe Migrations** | ✅ | ⚠️ | ✅ | ❌ |
| **Transaction Safety** | ✅ | ⚠️ | ✅ | ⚠️ |

## Examples

See the `examples/` directory for comprehensive examples:
- `basic-entity-setup.ts` → Entity and relationship setup
- `query-builder-usage.ts` → All query types with explanations
- `comprehensive-example.ts` → Full-featured blog platform
- `neat-framework-integration.ts` → **NeatOrm + Neat Framework** full-stack example

## Documentation

- [API Reference](./docs/api.md)
- [Migration Guide](./docs/migrations.md)
- [Advanced Features](./docs/advanced.md)
- [Benchmarks](../../BENCHMARKS.md)

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

---

**Built with ❤️ for Enterprise TypeScript Applications**
