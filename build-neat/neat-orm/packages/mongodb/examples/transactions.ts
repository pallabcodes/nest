/**
 * MongoDB Transactions Example
 *
 * Demonstrates transaction management with automatic commit/rollback.
 */

import 'reflect-metadata';
import { Entity, Column } from '@neat-orm/core';
import {
  createMongoAdapter,
  MongoDBRepository,
  withTransaction,
  ObjectId,
} from '@neat-orm/mongodb';

@Entity('accounts')
export class Account {
  @Column({ type: 'ObjectId' })
  _id!: ObjectId;

  @Column()
  userId!: ObjectId;

  @Column()
  balance!: number;

  @Column()
  currency!: string;
}

@Entity('transactions')
export class Transaction {
  @Column({ type: 'ObjectId' })
  _id!: ObjectId;

  @Column()
  fromAccountId!: ObjectId;

  @Column()
  toAccountId!: ObjectId;

  @Column()
  amount!: number;

  @Column()
  status!: 'pending' | 'completed' | 'failed';

  @Column()
  createdAt!: Date;
}

async function main() {
  const adapter = createMongoAdapter({
    url: 'mongodb://localhost:27017',
    database: 'neat_orm_transactions',
  });

  await adapter.connect();

  const accountRepo = new MongoDBRepository(Account, adapter);
  const transactionRepo = new MongoDBRepository(Transaction, adapter);

  // Transfer money between accounts (atomic transaction)
  try {
    await withTransaction(adapter, async (session) => {
      const fromAccountId = new ObjectId();
      const toAccountId = new ObjectId();
      const amount = 100;

      // Get accounts
      const fromAccount = await accountRepo.findById(fromAccountId);
      const toAccount = await accountRepo.findById(toAccountId);

      if (!fromAccount || !toAccount) {
        throw new Error('Account not found');
      }

      if (fromAccount.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Deduct from sender
      await accountRepo.update(fromAccountId, {
        $inc: { balance: -amount },
      });

      // Add to receiver
      await accountRepo.update(toAccountId, {
        $inc: { balance: amount },
      });

      // Record transaction
      await transactionRepo.create({
        fromAccountId,
        toAccountId,
        amount,
        status: 'completed',
        createdAt: new Date(),
      });

      console.log('Transaction completed successfully');
    });
  } catch (error) {
    console.error('Transaction failed:', error);
    // Transaction automatically rolled back
  }

  await adapter.disconnect();
}

main().catch(console.error);

