# Soft Delete Feature - NeatOrm

## Overview

Soft Delete is an enterprise-critical feature that allows "deleting" records without physically removing them from the database. Instead, records are marked as deleted using a timestamp or boolean flag, enabling data recovery, audit trails, and compliance requirements.

## Features Implemented

### ✅ Core Functionality

1. **Decorator-Based Configuration**
   - `@SoftDelete()` decorator to enable soft delete on entities
   - Flexible configuration options for customization
   - Type-safe metadata system

2. **Multiple Soft Delete Strategies**
   - **Timestamp-based**: Uses a `deleted_at` column (default)
   - **Boolean-based**: Uses an `is_deleted` flag
   - Support for custom column names

3. **Repository Integration**
   - Automatic soft delete for `delete()` method
   - Explicit `softDelete()` method
   - `restore()` method to un-delete records
   - `forceDelete()` for permanent deletion

4. **Query Filtering**
   - Automatic exclusion of soft deleted records
   - `withTrashed` option to include deleted records
   - `onlyTrashed` option to query only deleted records
   - Configurable default behavior

5. **Lifecycle Hook Integration**
   - `beforeDelete` and `afterDelete` hooks work with soft delete
   - Hooks triggered for both soft and hard deletes
   - Context-aware hook execution

---

## Configuration Options

### SoftDeleteOptions Interface

```typescript
interface SoftDeleteOptions {
  // Column name for deleted flag (default: 'deleted_at')
  columnName?: string;

  // Type of soft delete strategy (default: 'timestamp')
  type?: 'timestamp' | 'boolean';

  // Include soft deleted records by default (default: false)
  includeDeletedByDefault?: boolean;

  // Allow hard deletes when calling delete() (default: false)
  allowHardDelete?: boolean;

  // Custom value when soft deleting
  deletedValue?: () => Date | number | boolean | null;

  // Custom value when restoring (default: null)
  restoredValue?: null | undefined | false;
}
```

---

## Usage Examples

### Basic Timestamp-Based Soft Delete

```typescript
@Entity('users')
@SoftDelete()
class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}

// Repository operations
const userRepo = new UserRepository(adapter, User);

// Soft delete (sets deleted_at = current timestamp)
await userRepo.delete(userId);

// Query excludes soft deleted by default
const activeUsers = await userRepo.find();

// Include soft deleted records
const allUsers = await userRepo.find({ withTrashed: true });

// Query only soft deleted records
const deletedUsers = await userRepo.find({ onlyTrashed: true });

// Restore a soft deleted record
await userRepo.restore(userId);

// Permanently delete
await userRepo.forceDelete(userId);
```

### Boolean-Based Soft Delete

```typescript
@Entity('products')
@SoftDelete({ type: 'boolean', columnName: 'is_deleted' })
class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ name: 'is_deleted', default: false })
  isDeleted!: boolean;
}

// Same repository API works with boolean strategy
const productRepo = new ProductRepository(adapter, Product);

// Soft delete (sets is_deleted = true)
await productRepo.delete(productId);

// Restore (sets is_deleted = false)
await productRepo.restore(productId);
```

### Custom Configuration

```typescript
@Entity('articles')
@SoftDelete({
  type: 'timestamp',
  columnName: 'removed_at',
  includeDeletedByDefault: true,  // Include deleted by default
  allowHardDelete: true,           // Allow hard deletes
})
class Article {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ name: 'removed_at', nullable: true })
  removedAt?: Date | null;
}

// With includeDeletedByDefault: true
const allArticles = await articleRepo.find(); // Includes deleted

// Explicitly exclude deleted
const activeArticles = await articleRepo.find({ withTrashed: false });

// With allowHardDelete: true, delete() performs hard delete
await articleRepo.delete(articleId); // Permanently deletes

// Force soft delete even with allowHardDelete
await articleRepo.softDelete(articleId); // Soft deletes
```

---

## API Reference

### Decorators

#### `@SoftDelete(options?: SoftDeleteOptions)`

Marks an entity as supporting soft deletes.

**Parameters:**
- `options`: Optional configuration (see SoftDeleteOptions above)

**Example:**
```typescript
@SoftDelete({ type: 'timestamp', columnName: 'deleted_at' })
```

#### `@WithTrashed()`

Method decorator to include soft deleted records in query results.

**Example:**
```typescript
class UserRepository extends BaseRepository<User> {
  @WithTrashed()
  async findAllIncludingDeleted(): Promise<User[]> {
    return this.find();
  }
}
```

#### `@OnlyTrashed()`

Method decorator to only return soft deleted records.

**Example:**
```typescript
class UserRepository extends BaseRepository<User> {
  @OnlyTrashed()
  async findDeleted(): Promise<User[]> {
    return this.find();
  }
}
```

### Repository Methods

#### `delete(id: unknown): Promise<boolean>`

Deletes an entity. If soft delete is enabled, performs a soft delete.

**Returns:** `true` if deleted, `false` if not found

#### `softDelete(id: unknown): Promise<boolean>`

Explicitly soft deletes an entity.

**Throws:** Error if entity doesn't have `@SoftDelete` decorator

**Returns:** `true` if soft deleted, `false` if not found

#### `restore(id: unknown): Promise<boolean>`

Restores a soft deleted entity.

**Throws:** Error if entity doesn't have `@SoftDelete` decorator

**Returns:** `true` if restored, `false` if not found

#### `forceDelete(id: unknown): Promise<boolean>`

Permanently deletes an entity from the database.

**Returns:** `true` if permanently deleted, `false` if not found

### FindOptions Extensions

```typescript
interface FindOptions<T> {
  // ... existing options ...

  // Include soft deleted records
  withTrashed?: boolean;

  // Only return soft deleted records
  onlyTrashed?: boolean;
}
```

---

## SQL Generated

### Timestamp-Based Strategy

#### Normal Query (excludes soft deleted)
```sql
SELECT * FROM users WHERE deleted_at IS NULL
```

#### With Trashed (includes all)
```sql
SELECT * FROM users
```

#### Only Trashed (only deleted)
```sql
SELECT * FROM users WHERE deleted_at IS NOT NULL
```

#### Soft Delete Operation
```sql
UPDATE users SET deleted_at = '2025-01-01 12:00:00' WHERE id = 1
```

#### Restore Operation
```sql
UPDATE users SET deleted_at = NULL WHERE id = 1
```

### Boolean-Based Strategy

#### Normal Query (excludes soft deleted)
```sql
SELECT * FROM products WHERE is_deleted = false
```

#### Only Trashed (only deleted)
```sql
SELECT * FROM products WHERE is_deleted = true
```

#### Soft Delete Operation
```sql
UPDATE products SET is_deleted = true WHERE id = 1
```

#### Restore Operation
```sql
UPDATE products SET is_deleted = false WHERE id = 1
```

---

## Integration with Other Features

### Lifecycle Hooks

Soft delete operations trigger lifecycle hooks:

```typescript
@Entity('users')
@SoftDelete()
class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @BeforeDelete()
  async beforeDelete() {
    console.log('About to delete user');
  }

  @AfterDelete()
  async afterDelete() {
    console.log('User deleted (soft or hard)');
  }
}

// Both soft delete and force delete trigger hooks
await userRepo.softDelete(1);  // Triggers beforeDelete and afterDelete
await userRepo.forceDelete(1); // Triggers beforeDelete and afterDelete
```

### Query Caching

Soft delete operations automatically invalidate cache:

```typescript
// Cached query
const users = await userRepo.find({ cache: true });

// Soft delete invalidates cache
await userRepo.softDelete(userId);

// Next query fetches fresh data
const updatedUsers = await userRepo.find({ cache: true });
```

### Complex Queries

Soft delete filtering works with complex queries:

```typescript
// Complex query with soft delete filtering
const activeAdults = await userRepo.find({
  where: {
    age: { gte: 18 },
    status: 'active',
  },
  orderBy: { name: 'ASC' },
  limit: 10,
});
// Automatically excludes soft deleted users

// Count with soft delete filtering
const activeCount = await userRepo.count({
  where: { status: 'active' },
});
// Excludes soft deleted users
```

---

## Enterprise Benefits

### ✅ Data Recovery

Accidentally deleted records can be restored without backup restoration.

```typescript
// Accidental deletion
await userRepo.delete(importantUserId);

// Easy recovery
await userRepo.restore(importantUserId);
```

### ✅ Audit Trail

Maintain complete deletion history for compliance and auditing.

```typescript
// Query deletion history
const deletedRecords = await userRepo.find({
  onlyTrashed: true,
  orderBy: { deletedAt: 'DESC' },
});
```

### ✅ Referential Integrity

Maintain relationships even after "deletion."

```typescript
// User is soft deleted but orders remain accessible
await userRepo.softDelete(userId);

// Orders still reference the user
const orders = await orderRepo.find({
  where: { userId },
  withTrashed: true, // Can still join to soft deleted user
});
```

### ✅ GDPR Compliance

Implement "right to be forgotten" with permanent deletion when required.

```typescript
// Initial soft delete (keeps data for grace period)
await userRepo.softDelete(userId);

// After grace period, permanently delete for GDPR compliance
await userRepo.forceDelete(userId);
```

---

## Performance Considerations

### Index Recommendations

For optimal performance, add indexes on soft delete columns:

```sql
-- For timestamp-based soft delete
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- For boolean-based soft delete
CREATE INDEX idx_products_is_deleted ON products(is_deleted) WHERE is_deleted = false;
```

### Query Performance

- **Timestamp Strategy**: Slightly faster for queries (single NULL check)
- **Boolean Strategy**: Slightly faster for deletes (boolean vs timestamp)
- Both strategies have minimal performance impact

---

## Comparison with Other ORMs

| Feature | NeatOrm | TypeORM | Prisma | Sequelize |
|---------|---------|---------|---------|-----------|
| Decorator-based | ✅ | ✅ | ❌ | ❌ |
| Timestamp strategy | ✅ | ✅ | ❌ | ✅ |
| Boolean strategy | ✅ | ❌ | ❌ | ✅ |
| Custom column name | ✅ | ✅ | ❌ | ✅ |
| Restore method | ✅ | ✅ | ❌ | ✅ |
| Force delete method | ✅ | ✅ | ❌ | ✅ |
| Include deleted by default | ✅ | ❌ | ❌ | ❌ |
| Query only deleted | ✅ | ❌ | ❌ | ✅ |
| Lifecycle hook integration | ✅ | ✅ | ❌ | ✅ |

---

## Migration from Other ORMs

### From TypeORM

```typescript
// TypeORM
@Entity()
@DeleteDateColumn()
class User {
  @DeleteDateColumn()
  deletedAt?: Date;
}

// NeatOrm (equivalent)
@Entity('users')
@SoftDelete()
class User {
  @Column({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
```

### From Sequelize

```typescript
// Sequelize
const User = sequelize.define('User', {
  // ... fields ...
}, {
  paranoid: true,
  deletedAt: 'deleted_at'
});

// NeatOrm (equivalent)
@Entity('users')
@SoftDelete({ columnName: 'deleted_at' })
class User {
  @Column({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
```

---

## Testing

Example test cases for soft delete:

```typescript
describe('Soft Delete', () => {
  it('should soft delete a record', async () => {
    const user = await userRepo.create({ name: 'Test' });
    await userRepo.delete(user.id);
    
    const found = await userRepo.findById(user.id);
    expect(found).toBeNull();
    
    const withTrashed = await userRepo.findById(user.id, { withTrashed: true });
    expect(withTrashed).not.toBeNull();
    expect(withTrashed!.deletedAt).not.toBeNull();
  });

  it('should restore a soft deleted record', async () => {
    const user = await userRepo.create({ name: 'Test' });
    await userRepo.softDelete(user.id);
    await userRepo.restore(user.id);
    
    const found = await userRepo.findById(user.id);
    expect(found).not.toBeNull();
    expect(found!.deletedAt).toBeNull();
  });

  it('should permanently delete with forceDelete', async () => {
    const user = await userRepo.create({ name: 'Test' });
    await userRepo.forceDelete(user.id);
    
    const found = await userRepo.findById(user.id, { withTrashed: true });
    expect(found).toBeNull();
  });
});
```

---

## ✅ Implementation Status

- [x] `@SoftDelete` decorator with configurable options
- [x] Timestamp-based soft delete strategy
- [x] Boolean-based soft delete strategy
- [x] `softDelete()` repository method
- [x] `restore()` repository method
- [x] `forceDelete()` repository method
- [x] Automatic filtering in `find()` queries
- [x] `withTrashed` option for including deleted records
- [x] `onlyTrashed` option for querying only deleted records
- [x] Integration with `count()` method
- [x] Lifecycle hook integration
- [x] Cache invalidation support
- [x] Comprehensive examples
- [x] Full TypeScript type safety

**Status**: ✅ **Production Ready**

---

## Future Enhancements (Optional)

1. **Batch Soft Delete**: `softDeleteMany(ids: unknown[])`
2. **Batch Restore**: `restoreMany(ids: unknown[])`
3. **Auto-Purge**: Automatically force delete after X days
4. **Soft Delete Events**: Dedicated event system for soft delete operations
5. **Query Builder Integration**: Native soft delete support in query builder
6. **Cascade Soft Delete**: Soft delete related entities automatically

---

## Conclusion

NeatOrm's Soft Delete implementation is **enterprise-grade**, **type-safe**, and **flexible**. It provides all the features needed for production applications while maintaining a clean, intuitive API that aligns with the framework's OOP-based design philosophy.

**Key Advantages:**
- 🚀 Zero configuration for basic use case
- 🎯 Highly configurable for advanced scenarios
- 🔒 Type-safe at compile time
- ⚡ Minimal performance overhead
- 🏢 Enterprise-ready with full feature set
- 🔄 Seamless integration with other NeatOrm features

