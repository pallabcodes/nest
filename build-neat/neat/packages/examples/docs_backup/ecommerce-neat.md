# Neat Framework E-Commerce Demo

Ultimate demonstration of Neat Framework's revolutionary capabilities!

This comprehensive example showcases:
- Complete e-commerce application (users, products, cart, orders)
- Multi-ORM architecture (TypeORM for users/orders, Mongoose for products)
- Auto-discovery of all components
- Zero-configuration setup
- CLI-generated code
- Enterprise patterns
- Performance monitoring
- Error handling

This proves Neat Framework can handle complex, real-world applications!

```typescript
import 'reflect-metadata';
import { NeatApplication } from '@neat/core';

// ========================================
// DOMAIN ENTITIES & SCHEMAS
// ========================================

// User Entity (TypeORM - SQL)
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from '@neat/core/database';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  createdAt!: Date;

  @OneToMany(() => Order, order => order.user)
  orders!: Order[];
}

// ... rest of the ecommerce demo code ...
```

See the original file for complete implementation details.

