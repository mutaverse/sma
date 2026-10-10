import type { DbClient } from '@/db/client';

export async function allowMomoAirtime(db: DbClient): Promise<void> {
  await db.execAsync(`
    CREATE TABLE momo_transactions_v4 (
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

    INSERT INTO momo_transactions_v4 (
      id, user_id, transaction_type, provider, amount, fee, customer_reference,
      transaction_date, note, created_at, updated_at, deleted_at
    )
    SELECT
      id, user_id, transaction_type, provider, amount, fee, customer_reference,
      transaction_date, note, created_at, updated_at, deleted_at
    FROM momo_transactions;

    DROP TABLE momo_transactions;
    ALTER TABLE momo_transactions_v4 RENAME TO momo_transactions;

    CREATE INDEX idx_momo_transactions_date
      ON momo_transactions (transaction_date DESC, created_at DESC);
  `);
}
