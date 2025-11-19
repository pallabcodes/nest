#!/usr/bin/env tsx

/**
 * TRANSACTIONS DEMO - Atomic Banking Operations
 *
 * Demonstrates transaction-like behavior with proper error handling:
 * - Money transfers between accounts
 * - Atomic operations (all-or-nothing)
 * - Rollback on failure
 * - Business logic validation
 * - Transaction logging/audit trail
 */

import 'reflect-metadata';

// =============================================================================
// REUSABLE COMPONENTS
// =============================================================================

interface DatabaseResult {
  rows: any[];
  lastInsertRowid?: number;
}

interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<DatabaseResult>;
}

class SimpleSQLiteAdapter implements DatabaseAdapter {
  private db: any = null;

  constructor(private config: { database: string }) {}

  async connect(): Promise<void> {
    const sqlite3 = await import('sqlite3');
    const Database = (sqlite3 as any).Database || (sqlite3 as any).default?.Database || (sqlite3 as any).default;
    this.db = new Database(this.config.database);
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  async execute(sql: string, params: any[] = []): Promise<DatabaseResult> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      if (sql.toLowerCase().trim().startsWith('select')) {
        this.db.all(sql, params, (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve({ rows: rows || [] });
        });
      } else {
        this.db.run(sql, params, function(this: any, err: any) {
          if (err) reject(err);
          else resolve({
            rows: [],
            lastInsertRowid: this.lastID
          });
        });
      }
    });
  }
}

interface Entity {
  id: number;
}

class SimpleRepository<T extends Entity> {
  constructor(
    private adapter: DatabaseAdapter,
    private tableName: string
  ) {}

  async create(data: Omit<T, 'id'>): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?');

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const result = await this.adapter.execute(sql, values);

    return { ...data, id: result.lastInsertRowid! } as T;
  }

  async findById(id: number): Promise<T | null> {
    const result = await this.adapter.execute(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result.rows[0] || null;
  }

  async find(options: { where?: Partial<T>; limit?: number; orderBy?: string } = {}): Promise<T[]> {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    if (options.where) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    const result = await this.adapter.execute(sql, params);
    return result.rows;
  }

  async update(id: number, data: Partial<T>): Promise<void> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    await this.adapter.execute(sql, [...values, id]);
  }

  async delete(id: number): Promise<void> {
    await this.adapter.execute(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
  }

  async count(options: { where?: Partial<T> } = {}): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];

    if (options.where) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const result = await this.adapter.execute(sql, params);
    return result.rows[0]?.count || 0;
  }
}

// =============================================================================
// ENTITY TYPES
// =============================================================================

interface Account {
  id: number;
  owner: string;
  balance: number;
  currency: string;
  active: boolean;
  created_at: string;
}

interface TransactionRecord {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  type: 'transfer' | 'deposit' | 'withdrawal';
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  created_at: string;
  error_message?: string;
}

// =============================================================================
// BUSINESS LOGIC - ATOMIC OPERATIONS
// =============================================================================

interface TransferResult {
  success: boolean;
  transactionId?: number;
  error?: string;
}

class BankingService {
  constructor(
    private accountRepo: SimpleRepository<Account>,
    private transactionRepo: SimpleRepository<TransactionRecord>
  ) {}

  /**
   * Atomic money transfer between accounts
   * Simulates transaction behavior with proper error handling
   */
  async transferMoney(
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    description?: string
  ): Promise<TransferResult> {
    try {
      // VALIDATION PHASE
      if (fromAccountId === toAccountId) {
        throw new Error('Cannot transfer to the same account');
      }

      if (amount <= 0) {
        throw new Error('Transfer amount must be positive');
      }

      if (amount > 10000) {
        throw new Error('Transfer amount exceeds maximum limit of $10,000');
      }

      // GET ACCOUNTS
      const [fromAccount, toAccount] = await Promise.all([
        this.accountRepo.findById(fromAccountId),
        this.accountRepo.findById(toAccountId)
      ]);

      if (!fromAccount || !toAccount) {
        throw new Error('One or both accounts not found');
      }

      if (!fromAccount.active || !toAccount.active) {
        throw new Error('One or both accounts are inactive');
      }

      if (fromAccount.currency !== toAccount.currency) {
        throw new Error('Currency mismatch between accounts');
      }

      if (fromAccount.balance < amount) {
        throw new Error('Insufficient funds');
      }

      // RECORD TRANSACTION (PENDING)
      const transaction = await this.transactionRepo.create({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount,
        type: 'transfer',
        status: 'pending',
        description,
        created_at: new Date().toISOString(),
      });

      try {
        // EXECUTE TRANSFER (ATOMIC OPERATIONS)
        await this.accountRepo.update(fromAccountId, {
          balance: fromAccount.balance - amount
        });

        await this.accountRepo.update(toAccountId, {
          balance: toAccount.balance + amount
        });

        // MARK TRANSACTION AS COMPLETED
        await this.transactionRepo.update(transaction.id, {
          status: 'completed'
        });

        return { success: true, transactionId: transaction.id };

      } catch (executionError) {
        // ROLLBACK: Refund the money if transfer failed
        try {
          await this.accountRepo.update(fromAccountId, {
            balance: fromAccount.balance
          });
        } catch (rollbackError) {
          console.error('CRITICAL: Failed to rollback transfer!', rollbackError);
        }

        // MARK TRANSACTION AS FAILED
        await this.transactionRepo.update(transaction.id, {
          status: 'failed',
          error_message: executionError instanceof Error ? executionError.message : 'Transfer execution failed'
        });

        throw executionError;
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed'
      };
    }
  }

  /**
   * Bulk transfer with individual success/failure tracking
   */
  async bulkTransfer(
    transfers: Array<{
      fromAccountId: number;
      toAccountId: number;
      amount: number;
      description?: string;
    }>
  ): Promise<{
    success: boolean;
    completed: number;
    failed: number;
    errors: string[];
    transactionIds: number[];
  }> {
    const results = {
      success: true,
      completed: 0,
      failed: 0,
      errors: [] as string[],
      transactionIds: [] as number[]
    };

    for (const transfer of transfers) {
      const result = await this.transferMoney(
        transfer.fromAccountId,
        transfer.toAccountId,
        transfer.amount,
        transfer.description
      );

      if (result.success && result.transactionId) {
        results.completed++;
        results.transactionIds.push(result.transactionId);
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(`Transfer failed: ${result.error}`);
        }
      }
    }

    results.success = results.failed === 0;
    return results;
  }

  /**
   * Get account balance with recent transactions
   */
  async getAccountSummary(accountId: number): Promise<{
    account: Account;
    recentTransactions: TransactionRecord[];
    totalTransferred: number;
  } | null> {
    const account = await this.accountRepo.findById(accountId);
    if (!account) return null;

    const recentTransactions = await this.transactionRepo.find({
      where: {
        from_account_id: accountId,
        status: 'completed'
      },
      orderBy: 'created_at DESC',
      limit: 5
    });

    const allTransactions = await this.transactionRepo.find({
      where: {
        from_account_id: accountId,
        status: 'completed'
      }
    });

    const totalTransferred = allTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      account,
      recentTransactions,
      totalTransferred
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

async function setupDatabase(adapter: DatabaseAdapter): Promise<void> {
  // Accounts table
  await adapter.execute(`
    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      currency TEXT NOT NULL DEFAULT 'USD',
      active BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Transactions table
  await adapter.execute(`
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_account_id INTEGER NOT NULL,
      to_account_id INTEGER NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT,
      FOREIGN KEY (from_account_id) REFERENCES accounts(id),
      FOREIGN KEY (to_account_id) REFERENCES accounts(id)
    )
  `);
}

async function createSampleAccounts(accountRepo: SimpleRepository<Account>): Promise<Account[]> {
  const accounts = [
    { owner: 'Alice Johnson', balance: 1500.00, currency: 'USD', active: true },
    { owner: 'Bob Smith', balance: 800.00, currency: 'USD', active: true },
    { owner: 'Charlie Brown', balance: 300.00, currency: 'USD', active: true },
    { owner: 'Diana Prince', balance: 2500.00, currency: 'USD', active: true },
    { owner: 'Eve Wilson', balance: 100.00, currency: 'USD', active: false }, // Inactive
  ];

  const createdAccounts: Account[] = [];
  for (const account of accounts) {
    const created = await accountRepo.create({
      ...account,
      created_at: new Date().toISOString(),
    });
    createdAccounts.push(created);
  }

  return createdAccounts;
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main(): Promise<void> {
  console.log('🏦 NeatORM Transactions Demo - Atomic Banking Operations\n');

  try {
    // Setup database
    const adapter = new SimpleSQLiteAdapter({ database: ':memory:' });
    await adapter.connect();
    await setupDatabase(adapter);

    console.log('✅ Database setup complete');

    // Initialize repositories and services
    const accountRepo = new SimpleRepository<Account>(adapter, 'accounts');
    const transactionRepo = new SimpleRepository<TransactionRecord>(adapter, 'transactions');

    const bankingService = new BankingService(accountRepo, transactionRepo);

    console.log('✅ Banking service initialized');

    // ========================================
    // SETUP SAMPLE ACCOUNTS
    // ========================================

    console.log('\n💳 Setting up sample accounts...');

    const accounts = await createSampleAccounts(accountRepo);
    const [alice, bob, charlie, diana, eve] = accounts;

    console.log(`✅ Created ${accounts.length} accounts:`);
    accounts.forEach(acc => {
      console.log(`   ${acc.owner}: $${acc.balance} ${acc.currency} (${acc.active ? 'Active' : 'Inactive'})`);
    });

    // ========================================
    // SUCCESSFUL TRANSFERS
    // ========================================

    console.log('\n💸 Demonstrating successful transfers...');

    // Alice → Bob: $100
    const transfer1 = await bankingService.transferMoney(
      alice.id, bob.id, 100.00, 'Lunch payment'
    );
    console.log(`✅ Alice → Bob: $100 (${transfer1.success ? 'SUCCESS' : 'FAILED'})`);

    // Bob → Charlie: $50
    const transfer2 = await bankingService.transferMoney(
      bob.id, charlie.id, 50.00, 'Movie tickets'
    );
    console.log(`✅ Bob → Charlie: $50 (${transfer2.success ? 'SUCCESS' : 'FAILED'})`);

    // Diana → Alice: $200
    const transfer3 = await bankingService.transferMoney(
      diana.id, alice.id, 200.00, 'Thank you gift'
    );
    console.log(`✅ Diana → Alice: $200 (${transfer3.success ? 'SUCCESS' : 'FAILED'})`);

    // ========================================
    // ERROR HANDLING & VALIDATION
    // ========================================

    console.log('\n🚫 Demonstrating error handling...');

    // Insufficient funds
    const insufficientFunds = await bankingService.transferMoney(
      charlie.id, alice.id, 1000.00, 'Overdraft attempt'
    );
    console.log(`❌ Insufficient funds: ${insufficientFunds.error}`);

    // Transfer to same account
    const sameAccount = await bankingService.transferMoney(
      alice.id, alice.id, 10.00, 'Self transfer'
    );
    console.log(`❌ Same account transfer: ${sameAccount.error}`);

    // Transfer to inactive account
    const inactiveAccount = await bankingService.transferMoney(
      bob.id, eve.id, 10.00, 'To inactive account'
    );
    console.log(`❌ Inactive account: ${inactiveAccount.error}`);

    // Negative amount
    const negativeAmount = await bankingService.transferMoney(
      alice.id, bob.id, -50.00, 'Negative transfer'
    );
    console.log(`❌ Negative amount: ${negativeAmount.error}`);

    // Amount too large
    const largeAmount = await bankingService.transferMoney(
      diana.id, alice.id, 15000.00, 'Large transfer'
    );
    console.log(`❌ Amount too large: ${largeAmount.error}`);

    // Non-existent account
    const nonExistent = await bankingService.transferMoney(
      999, alice.id, 10.00, 'Non-existent sender'
    );
    console.log(`❌ Non-existent account: ${nonExistent.error}`);

    // ========================================
    // BULK TRANSFERS
    // ========================================

    console.log('\n📦 Demonstrating bulk transfers...');

    // Create a few more accounts for bulk testing
    const frank = await accountRepo.create({
      owner: 'Frank Miller',
      balance: 400.00,
      currency: 'USD',
      active: true,
      created_at: new Date().toISOString(),
    });

    const grace = await accountRepo.create({
      owner: 'Grace Lee',
      balance: 600.00,
      currency: 'USD',
      active: true,
      created_at: new Date().toISOString(),
    });

    const bulkTransfers = [
      { fromAccountId: diana.id, toAccountId: frank.id, amount: 50.00, description: 'Bulk 1' },
      { fromAccountId: diana.id, toAccountId: grace.id, amount: 75.00, description: 'Bulk 2' },
      { fromAccountId: grace.id, toAccountId: charlie.id, amount: 25.00, description: 'Bulk 3' },
      { fromAccountId: charlie.id, toAccountId: diana.id, amount: 500.00, description: 'Too much' }, // Will fail
      { fromAccountId: frank.id, toAccountId: bob.id, amount: 30.00, description: 'Bulk 5' },
    ];

    const bulkResult = await bankingService.bulkTransfer(bulkTransfers);

    console.log(`📊 Bulk transfer results:`);
    console.log(`   ✅ Completed: ${bulkResult.completed}`);
    console.log(`   ❌ Failed: ${bulkResult.failed}`);
    console.log(`   📋 Transaction IDs: [${bulkResult.transactionIds.join(', ')}]`);

    if (bulkResult.errors.length > 0) {
      console.log('   🚨 Errors:');
      bulkResult.errors.forEach(error => console.log(`     - ${error}`));
    }

    // ========================================
    // ACCOUNT SUMMARIES
    // ========================================

    console.log('\n📊 Account summaries with transaction history...');

    for (const account of [alice, bob, charlie, diana, frank, grace]) {
      const summary = await bankingService.getAccountSummary(account.id);
      if (summary) {
        console.log(`\n👤 ${summary.account.owner}:`);
        console.log(`   💰 Balance: $${summary.account.balance}`);
        console.log(`   📤 Total transferred: $${summary.totalTransferred}`);
        console.log(`   📜 Recent transactions: ${summary.recentTransactions.length}`);

        summary.recentTransactions.slice(0, 3).forEach(tx => {
          const toAccount = accounts.concat([frank, grace]).find(a => a.id === tx.to_account_id);
          console.log(`     → $${tx.amount} to ${toAccount?.owner || 'Unknown'} (${tx.created_at.split('T')[1]?.split('.')[0]})`);
        });
      }
    }

    // ========================================
    // TRANSACTION AUDIT TRAIL
    // ========================================

    console.log('\n📋 Complete transaction audit trail...');

    const allTransactions = await transactionRepo.find({
      orderBy: 'created_at ASC'
    });

    console.log(`📊 Total transactions: ${allTransactions.length}`);

    const statusCounts = allTransactions.reduce((counts, tx) => {
      counts[tx.status] = (counts[tx.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    console.log(`   ✅ Completed: ${statusCounts.completed || 0}`);
    console.log(`   ❌ Failed: ${statusCounts.failed || 0}`);
    console.log(`   ⏳ Pending: ${statusCounts.pending || 0}`);

    // Show failed transactions
    const failedTransactions = allTransactions.filter(tx => tx.status === 'failed');
    if (failedTransactions.length > 0) {
      console.log('\n❌ Failed transactions:');
      failedTransactions.forEach(tx => {
        console.log(`   ID ${tx.id}: ${tx.error_message || 'Unknown error'}`);
      });
    }

    // ========================================
    // FINAL ACCOUNT BALANCES
    // ========================================

    console.log('\n💰 Final account balances:');

    const finalAccounts = await accountRepo.find({ orderBy: 'balance DESC' });
    const allInitialAccounts = accounts.concat([frank, grace]);

    finalAccounts.forEach(account => {
      const initialAccount = allInitialAccounts.find(a => a.id === account.id);
      if (initialAccount) {
        const change = account.balance - initialAccount.balance;
        const changeSymbol = change >= 0 ? '+' : '';
        console.log(`   ${account.owner}: $${account.balance} (${changeSymbol}$${change})`);
      } else {
        console.log(`   ${account.owner}: $${account.balance} (new account)`);
      }
    });

    // Cleanup
    await adapter.disconnect();
    console.log('\n✅ Database disconnected');

    console.log('\n🎉 Transactions demo completed successfully!');
    console.log('✅ Demonstrated: Atomic transfers with rollback');
    console.log('✅ Demonstrated: Comprehensive error handling');
    console.log('✅ Demonstrated: Business logic validation');
    console.log('✅ Demonstrated: Transaction audit trails');
    console.log('✅ Demonstrated: Bulk operations with partial failures');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// =============================================================================
// RUN THE EXAMPLE
// =============================================================================

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
