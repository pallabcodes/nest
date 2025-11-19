# Post Entity - Auto-discovered by Neat Framework

This entity is automatically discovered by the metadata scanner when NeatTypeORMModule is imported. No manual registration needed!

```typescript
import { BaseEntity } from '../../../core/src/database/index.js';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from '../../../core/src/database/index.js';

@Entity({ name: 'posts' })
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 100 })
  slug!: string;

  @Column({ type: 'boolean', default: true })
  published!: boolean;

  // Foreign key
  @Column()
  authorId!: number;

  // Relationship
  @ManyToOne(() => User, user => user.posts)
  author!: User;
}

// Re-export for convenience
export { User } from './User.js';
```

