import type { DbClient } from '@/db/client';

export async function addMomoTransactions(db: DbClient): Promise<void> {
  await db.execAsync(`
    CREATE TABLE momo_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('cash_in', 'cash_out', 'airtime')),
      provider TEXT NOT NULL,
      amount INTEGER NOT NULL,
      fee INTEGER NOT NULL DEFAULT 0,
      customer_reference TEXT,
      transaction_date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX idx_momo_transactions_date
      ON momo_transactions (transaction_date DESC, created_at DESC);
  `);
}
