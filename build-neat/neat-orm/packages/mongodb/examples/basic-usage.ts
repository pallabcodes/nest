/**
 * Basic MongoDB Usage Example
 *
 * Demonstrates core MongoDB functionality with NeatORM.
 */

import 'reflect-metadata';
import { Entity, Column, PrimaryKey } from '@neat-orm/core';
import {
  createMongoAdapter,
  MongoDBRepository,
  ObjectId,
  MongoDBIndex,
  MongoDBCompoundIndex,
} from '@neat-orm/mongodb';

// Define MongoDB entity
@Entity('users')
@MongoDBCompoundIndex({ email: 1, status: 1 }, { unique: true })
export class User {
  @PrimaryKey()
  @Column({ type: 'ObjectId' })
  _id!: ObjectId;

  @Column()
  @MongoDBIndex(1, { unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column()
  age!: number;

  @Column()
  status!: 'active' | 'inactive';

  @Column()
  createdAt!: Date;

  @Column({ nullable: true })
  deletedAt?: Date | null;
}

async function main() {
  // Create adapter
  const adapter = createMongoAdapter({
    url: 'mongodb://localhost:27017',
    database: 'neat_orm_example',
    poolSize: 10,
  });

  await adapter.connect();

  // Create repository
  const userRepo = new MongoDBRepository(User, adapter);

  // Create users
  const user1 = await userRepo.create({
    email: 'john@example.com',
    name: 'John Doe',
    age: 30,
    status: 'active',
    createdAt: new Date(),
  });

  console.log('Created user:', user1);

  // Find users
  const activeUsers = await userRepo.find({
    where: { status: 'active', age: { $gte: 18 } },
    sort: { name: 1 },
    limit: 10,
  });

  console.log('Active users:', activeUsers);

  // Update user
  await userRepo.update(user1._id, {
    $set: { age: 31 },
  });

  // Find by ID
  const user = await userRepo.findById(user1._id);
  console.log('Updated user:', user);

  // Count users
  const count = await userRepo.count({ status: 'active' });
  console.log('Active user count:', count);

  // Delete user
  await userRepo.delete(user1._id);

  // Cleanup
  await adapter.disconnect();
}

main().catch(console.error);

