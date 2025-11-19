# User Entity - Auto-discovered by Neat Framework

This entity is automatically discovered by the metadata scanner when NeatTypeORMModule is imported. No manual registration needed!

```typescript
import { BaseEntity } from '../../../core/src/database/index.js';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from '../../../core/src/database/index.js';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // Relationship
  @OneToMany(() => Post, post => post.author)
  posts!: Post[];
}

// Re-export for convenience
export { Post } from './Post.js';
```

