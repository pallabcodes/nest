# 🏢 NeatOrm Enterprise Features - Complete Guide

## Overview

This guide demonstrates all 8 enterprise features with practical, production-ready examples.

---

## 1️⃣ Query Result Caching

### **Setup**
```typescript
import { MemoryCache, RedisCache, CacheManager } from '@neat-orm/core';

// L1: In-memory cache
const memoryCache = new MemoryCache({
  maxEntries: 1000,
  defaultTtl: 300000, // 5 minutes
});

// L2: Redis cache
const redisCache = new RedisCache({
  url: 'redis://localhost:6379',
  defaultTtl: 1800000, // 30 minutes
});

// Multi-layer cache manager
const cacheManager = new CacheManager({
  layers: [
    { cache: memoryCache, priority: 1 },
    { cache: redisCache, priority: 2 },
  ],
  enableQueryCaching: true,
  enableCacheWarming: true,
});

// Integrate with query executor
const executor = new QueryExecutor(adapter, cacheManager);
```

### **Usage**
```typescript
// Queries are automatically cached
const users = await executor.executeSelect(
  'SELECT * FROM users WHERE status = $1',
  ['active'],
  { cache: true, tables: ['users'] }
);

// Cache invalidation on mutations
await executor.executeInsert(
  'INSERT INTO users ...',
  [...],
  { tables: ['users'] } // Automatically invalidates cache
);
```

---

## 2️⃣ Entity Lifecycle Hooks

### **Setup**
```typescript
import { Entity, Column, BeforeInsert, AfterInsert, BeforeUpdate } from '@neat-orm/core';

@Entity('users')
class User {
  @Column()
  id!: number;

  @Column()
  email!: string;

  @Column()
  password!: string;

  @Column()
  createdAt!: Date;

  @BeforeInsert(10) // Priority 10
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  @BeforeInsert(20)
  async setCreatedAt() {
    this.createdAt = new Date();
  }

  @AfterInsert()
  async sendWelcomeEmail() {
    await emailService.sendWelcome(this.email);
  }

  @BeforeUpdate()
  async validateEmail() {
    if (!this.email.includes('@')) {
      throw new Error('Invalid email');
    }
  }
}
```

### **Usage**
```typescript
// Hooks are automatically triggered
const user = await userRepository.create({
  email: 'user@example.com',
  password: 'plaintext', // Will be hashed by hook
});
// Hooks executed: @BeforeInsert (both) -> insert -> @AfterInsert
```

---

## 3️⃣ Soft Deletes

### **Setup**
```typescript
import { Entity, Column, SoftDelete } from '@neat-orm/core';

@Entity('products')
@SoftDelete() // timestamp-based
class Product {
  @Column()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  deletedAt?: Date;
}
```

### **Usage**
```typescript
// Soft delete (sets deletedAt)
await productRepo.delete(productId);

// Query excludes soft deleted by default
const products = await productRepo.find(); // Only active products

// Include soft deleted
const all = await productRepo.find({ withTrashed: true });

// Only soft deleted
const deleted = await productRepo.find({ onlyTrashed: true });

// Restore
await productRepo.restore(productId);

// Permanent delete
await productRepo.forceDelete(productId);
```

---

## 4️⃣ Database Indexing

### **Setup**
```typescript
import { Entity, Column, Index } from '@neat-orm/core';

@Entity('articles')
@Index({ columns: ['userId', 'status'] }) // Composite
@Index({ columns: ['title'], type: 'fulltext' }) // Full-text
@Index({ columns: ['createdAt'], where: 'deleted_at IS NULL' }) // Partial
class Article {
  @Column()
  @Index() // Simple index
  id!: number;

  @Column()
  userId!: number;

  @Column()
  title!: string;

  @Column()
  status!: string;

  @Column()
  createdAt!: Date;
}
```

### **Generate SQL**
```typescript
import { IndexGenerator, getEntityIndexes } from '@neat-orm/core';

const indexes = getEntityIndexes(Article);
const generator = new IndexGenerator({ database: 'postgres' });

for (const index of indexes) {
  const sql = generator.generateIndexSQL('articles', index);
  console.log(sql.create); // CREATE INDEX ...
  console.log(sql.drop);   // DROP INDEX ...
}
```

---

## 5️⃣ Database Seeding

### **Setup**
```typescript
import { Seeder, SeederRunner, createFactory } from '@neat-orm/core';

class UserSeeder implements Seeder {
  name = 'UserSeeder';
  order = 10;
  dependencies = []; // Run first

  async run(executor: QueryExecutor) {
    // Using factory
    const factory = createFactory<User>((faker) => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      createdAt: new Date(),
    }));

    const users = await factory.makeMany(100);

    // Bulk insert
    for (const user of users) {
      await executor.executeInsert(
        'INSERT INTO users (name, email, created_at) VALUES ($1, $2, $3)',
        [user.name, user.email, user.createdAt]
      );
    }
  }

  async rollback(executor: QueryExecutor) {
    await executor.executeRaw('DELETE FROM users');
  }
}

class ProductSeeder implements Seeder {
  name = 'ProductSeeder';
  order = 20;
  dependencies = ['UserSeeder']; // Run after users

  async run(executor: QueryExecutor) {
    // Seeding logic...
  }
}
```

### **Usage**
```typescript
const runner = new SeederRunner(adapter, {
  useTransactions: true,
  skipExecuted: true,
  logger: console.log,
});

await runner.run([new UserSeeder(), new ProductSeeder()]);

// Rollback
await runner.rollback([new ProductSeeder(), new UserSeeder()]);

// Get history
const history = await runner.getHistory();
```

---

## 6️⃣ Query Logging & Monitoring

### **Setup**
```typescript
import { QueryLogger, PerformanceMonitor, FileTransport } from '@neat-orm/core';

// Query logger
const logger = new QueryLogger({
  level: 'info',
  slowQueryThreshold: 1000,
  sanitize: true,
  transport: new FileTransport('/var/log/queries.log'),
});

// Performance monitor
const monitor = new PerformanceMonitor({
  slowQueryThreshold: 1000,
  qpsThreshold: 1000,
  onAlert: (alert) => {
    if (alert.severity === 'critical') {
      notificationService.send(alert);
    }
  },
});

monitor.start();
```

### **Usage**
```typescript
// Integrate with query executor
executor.on('query', (sql, params, time, rowCount) => {
  logger.logQuery(sql, params, time, rowCount);
  monitor.recordQuery(time, true, false);
});

executor.on('error', (sql, params, error, time) => {
  logger.logError(sql, params, error, time);
  monitor.recordQuery(time, false, false);
});

// Get statistics
const logStats = logger.getStats();
console.log(`Total Queries: ${logStats.totalQueries}`);
console.log(`Slow Queries: ${logStats.slowQueries}`);
console.log(`Avg Time: ${logStats.avgExecutionTime}ms`);

const perfMetrics = monitor.getMetrics();
console.log(`QPS: ${perfMetrics.queriesPerSecond}`);
console.log(`P95: ${perfMetrics.p95QueryTime}ms`);
console.log(`Failure Rate: ${perfMetrics.failureRate}%`);

// Get alerts
const alerts = monitor.getAlerts('critical');
alerts.forEach(alert => {
  console.log(`${alert.message}: ${alert.value} > ${alert.threshold}`);
  console.log(`Suggestion: ${alert.suggestion}`);
});
```

---

## 7️⃣ Multi-Database Support

### **Setup**
```typescript
import { ConnectionManager } from '@neat-orm/core';

const manager = new ConnectionManager();

// Main application database
await manager.addConnection({
  name: 'main',
  type: 'postgres',
  host: 'main.db',
  port: 5432,
  database: 'app',
  default: true,
  poolSize: 20,
});

// Analytics database
await manager.addConnection({
  name: 'analytics',
  type: 'postgres',
  host: 'analytics.db',
  port: 5432,
  database: 'analytics',
  readOnly: true,
  tags: ['analytics', 'reporting'],
  poolSize: 10,
});

// User-specific database (multi-tenant)
await manager.addConnection({
  name: 'tenant_acme',
  type: 'postgres',
  host: 'tenants.db',
  port: 5432,
  database: 'tenant_acme',
  tags: ['tenant'],
  poolSize: 5,
});

// Cache database
await manager.addConnection({
  name: 'cache',
  type: 'redis',
  host: 'cache.redis',
  port: 6379,
  tags: ['cache'],
});
```

### **Usage**
```typescript
// Get default connection
const mainDB = manager.getConnection();

// Get specific connection
const analyticsDB = manager.getConnection('analytics');
const tenantDB = manager.getConnection('tenant_acme');

// Get by tags
const reportingDBs = manager.getConnectionsByTags(['reporting']);
const cacheDBs = manager.getConnectionsByTags(['cache']);

// Health check
const isHealthy = await manager.checkHealth('analytics');
if (!isHealthy) {
  await manager.reconnect('analytics');
}

// Get statistics
const stats = manager.getStatistics();
console.log(`Active Connections: ${stats.activeConnections}`);
console.log(`Total Queries: ${stats.totalQueries}`);

// Get connection states
const states = manager.getAllStates();
states.forEach(state => {
  console.log(`${state.name}: ${state.status} (${state.totalQueries} queries)`);
});
```

---

## 8️⃣ Read Replicas Support

### **Setup**
```typescript
import { ReadReplicaManager } from '@neat-orm/core';

const replicaManager = new ReadReplicaManager(connectionManager, {
  primary: 'main',
  replicas: ['replica1', 'replica2', 'replica3'],
  strategy: 'least-connections', // or 'round-robin', 'weighted', 'latency-based'
  weights: {
    replica1: 2, // Gets 2x more queries
    replica2: 1,
    replica3: 1,
  },
  fallbackToPrimary: true,
  healthCheckInterval: 30000,
  maxRetries: 3,
});

replicaManager.start();
```

### **Usage**
```typescript
// Read queries (auto load-balanced across replicas)
const users = await replicaManager.executeRead(async (adapter) => {
  return adapter.query('SELECT * FROM users WHERE status = $1', ['active']);
});

// Write queries (always on primary)
const newUser = await replicaManager.executeWrite(async (adapter) => {
  return adapter.query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    ['John Doe', 'john@example.com']
  );
});

// Get replica health
const health = replicaManager.getReplicaHealth();
health.forEach(h => {
  console.log(`${h.name}:`);
  console.log(`  Healthy: ${h.healthy}`);
  console.log(`  Latency: ${h.averageLatency}ms`);
  console.log(`  Active Connections: ${h.activeConnections}`);
  console.log(`  Failed Checks: ${h.failedChecks}`);
});

// Get statistics
const stats = replicaManager.getStatistics();
console.log(`Total Replicas: ${stats.totalReplicas}`);
console.log(`Healthy: ${stats.healthyReplicas}`);
console.log(`Unhealthy: ${stats.unhealthyReplicas}`);
console.log(`Avg Latency: ${stats.averageLatency}ms`);
```

---

## 🔗 Combined Usage: Enterprise Setup

```typescript
import {
  ConnectionManager,
  ReadReplicaManager,
  QueryLogger,
  PerformanceMonitor,
  CacheManager,
  MemoryCache,
  RedisCache,
  SeederRunner,
} from '@neat-orm/core';

async function setupEnterpriseORM() {
  // 1. Setup multi-database
  const connectionManager = new ConnectionManager();
  await connectionManager.addConnection({
    name: 'primary',
    type: 'postgres',
    host: 'primary.db',
    database: 'app',
    default: true,
    poolSize: 20,
  });

  await connectionManager.addConnection({
    name: 'replica1',
    type: 'postgres',
    host: 'replica1.db',
    database: 'app',
    readOnly: true,
    poolSize: 10,
  });

  await connectionManager.addConnection({
    name: 'replica2',
    type: 'postgres',
    host: 'replica2.db',
    database: 'app',
    readOnly: true,
    poolSize: 10,
  });

  // 2. Setup read replicas
  const replicaManager = new ReadReplicaManager(connectionManager, {
    primary: 'primary',
    replicas: ['replica1', 'replica2'],
    strategy: 'least-connections',
    fallbackToPrimary: true,
  });
  replicaManager.start();

  // 3. Setup caching
  const cacheManager = new CacheManager({
    layers: [
      { cache: new MemoryCache({ maxEntries: 1000 }), priority: 1 },
      { cache: new RedisCache({ url: 'redis://cache' }), priority: 2 },
    ],
    enableQueryCaching: true,
    enableCacheWarming: true,
  });

  // 4. Setup logging
  const logger = new QueryLogger({
    level: 'info',
    slowQueryThreshold: 1000,
    sanitize: true,
  });

  // 5. Setup monitoring
  const monitor = new PerformanceMonitor({
    slowQueryThreshold: 1000,
    onAlert: (alert) => {
      logger.log({ level: 'warn', query: alert.message, executionTime: 0, queryType: 'ALERT' });
    },
  });
  monitor.start();

  // 6. Create query executor with all features
  const primaryAdapter = connectionManager.getConnection('primary');
  const executor = new QueryExecutor(primaryAdapter, cacheManager);

  // Integrate logging and monitoring
  executor.on('query', (sql, params, time, rowCount) => {
    logger.logQuery(sql, params, time, rowCount);
    monitor.recordQuery(time, true);
  });

  return {
    connectionManager,
    replicaManager,
    cacheManager,
    logger,
    monitor,
    executor,
  };
}

// Usage
const orm = await setupEnterpriseORM();

// Read operations (use replicas with caching)
const users = await orm.replicaManager.executeRead(async (adapter) => {
  return orm.executor.executeSelect(
    'SELECT * FROM users WHERE status = $1',
    ['active'],
    { cache: true, tables: ['users'] }
  );
});

// Write operations (use primary, invalidate cache)
await orm.replicaManager.executeWrite(async (adapter) => {
  return orm.executor.executeInsert(
    'INSERT INTO users ...',
    [...],
    { tables: ['users'] } // Invalidates cache
  );
});

// Monitor performance
setInterval(() => {
  const metrics = orm.monitor.getMetrics();
  const logStats = orm.logger.getStats();
  const cacheStats = orm.cacheManager.getStats();

  console.log('=== Performance Report ===');
  console.log(`QPS: ${metrics.queriesPerSecond}`);
  console.log(`P95 Latency: ${metrics.p95QueryTime}ms`);
  console.log(`Cache Hit Rate: ${metrics.cacheHitRate}%`);
  console.log(`Slow Queries: ${logStats.slowQueries}`);
  console.log(`Replica Health: ${orm.replicaManager.getStatistics().healthyReplicas}`);
}, 60000); // Every minute
```

---

## 🎯 Best Practices

### **1. Caching**
- Cache read-heavy queries
- Use appropriate TTLs
- Implement intelligent invalidation
- Monitor cache hit rates

### **2. Logging**
- Log slow queries for optimization
- Sanitize sensitive data
- Use appropriate log levels
- Implement log rotation

### **3. Multi-Database**
- Separate read and write workloads
- Use tags for logical grouping
- Implement health checks
- Monitor connection pools

### **4. Read Replicas**
- Use appropriate load balancing strategy
- Monitor replica lag
- Implement automatic failover
- Test failover scenarios

### **5. Seeding**
- Use factories for consistent data
- Implement idempotent seeders
- Use transactions
- Track execution history

### **6. Soft Deletes**
- Implement purge policies
- Use partial indexes
- Consider GDPR requirements
- Monitor deleted data volume

### **7. Indexing**
- Index foreign keys
- Use composite indexes wisely
- Monitor index usage
- Remove unused indexes

### **8. Lifecycle Hooks**
- Keep hooks fast
- Avoid circular dependencies
- Use for cross-cutting concerns
- Consider transaction boundaries

---

## ✅ Checklist for Production

- [ ] Enable query caching for read-heavy endpoints
- [ ] Implement lifecycle hooks for audit trails
- [ ] Set up soft deletes for critical tables
- [ ] Create indexes for frequently queried columns
- [ ] Configure seeding for development/test environments
- [ ] Enable query logging with sanitization
- [ ] Set up performance monitoring with alerts
- [ ] Configure multi-database for different workloads
- [ ] Implement read replicas for horizontal scaling
- [ ] Test failover scenarios
- [ ] Monitor cache hit rates
- [ ] Review slow query logs regularly
- [ ] Implement connection pool sizing
- [ ] Set up automated health checks
- [ ] Configure backup strategies

---

**NeatOrm: Production-Ready Enterprise TypeScript ORM** 🚀

