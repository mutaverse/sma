import type { DbClient } from '@/db/client';
import { mapMomoTransaction } from '@/db/mappers';
import { enqueueSyncEvent } from '@/db/repositories/sync-queue';
import { nowIso } from '@/lib/dates';
import { createId } from '@/lib/id';
import {
  recordMomoTransactionSchema,
  type RecordMomoTransactionInput,
} from '@/lib/validation';
import type { MomoTransactionRecord } from '@/types/database';
import type { MomoTransaction } from '@/types/domain';

export type MomoDayTotals = {
  cashInPesewas: number;
  cashOutPesewas: number;
  airtimePesewas: number;
  feePesewas: number;
  count: number;
};

export type MomoDailyTotals = MomoDayTotals & {
  transactionDate: string;
};

export async function recordMomoTransaction(
  db: DbClient,
  input: RecordMomoTransactionInput,
): Promise<MomoTransaction> {
  const parsed = recordMomoTransactionSchema.parse(input);
  const id = createId();
  const timestamp = nowIso();
  const reference = parsed.customerReference?.trim() || null;
  const note = parsed.note?.trim() || null;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO momo_transactions (
        id, user_id, transaction_type, provider, amount, fee, customer_reference,
        transaction_date, note, created_at, updated_at, deleted_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        id,
        parsed.transactionType,
        parsed.provider,
        parsed.amountPesewas,
        parsed.feePesewas,
        reference,
        parsed.transactionDate,
        note,
        timestamp,
        timestamp,
      ],
    );

    await enqueueSyncEvent(db, {
      entityType: 'momo_transaction',
      entityId: id,
      operation: 'momo.upsert',
      payload: { id },
    });
  });

  return {
    id,
    userId: null,
    transactionType: parsed.transactionType,
    provider: parsed.provider,
    amountPesewas: parsed.amountPesewas,
    feePesewas: parsed.feePesewas,
    customerReference: reference,
    transactionDate: parsed.transactionDate,
    note,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export async function updateMomoTransaction(
  db: DbClient,
  id: string,
  input: RecordMomoTransactionInput,
): Promise<MomoTransaction> {
  const parsed = recordMomoTransactionSchema.parse(input);
  const existing = await db.getFirstAsync<MomoTransactionRecord>(
    'SELECT * FROM momo_transactions WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  if (!existing) {
    throw new Error('That transaction is no longer available.');
  }

  const timestamp = nowIso();
  const reference = parsed.customerReference?.trim() || existing.customer_reference;
  const note = parsed.note?.trim() || existing.note;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE momo_transactions
       SET transaction_type = ?, provider = ?, amount = ?, fee = ?, transaction_date = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        parsed.transactionType,
        parsed.provider,
        parsed.amountPesewas,
        parsed.feePesewas,
        parsed.transactionDate,
        timestamp,
        id,
      ],
    );
    await enqueueSyncEvent(db, {
      entityType: 'momo_transaction',
      entityId: id,
      operation: 'momo.upsert',
      payload: { id },
    });
  });

  return {
    ...mapMomoTransaction(existing),
    transactionType: parsed.transactionType,
    provider: parsed.provider,
    amountPesewas: parsed.amountPesewas,
    feePesewas: parsed.feePesewas,
    customerReference: reference,
    transactionDate: parsed.transactionDate,
    note,
    updatedAt: timestamp,
  };
}

export async function deleteMomoTransaction(db: DbClient, id: string): Promise<void> {
  const existing = await db.getFirstAsync<MomoTransactionRecord>(
    'SELECT * FROM momo_transactions WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  if (!existing) {
    return;
  }

  const timestamp = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE momo_transactions SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [timestamp, timestamp, id],
    );
    await enqueueSyncEvent(db, {
      entityType: 'momo_transaction',
      entityId: id,
      operation: 'momo.upsert',
      payload: { id, deleted: true },
    });
  });
}

export async function listMomoTransactions(
  db: DbClient,
  limit = 50,
): Promise<MomoTransaction[]> {
  const rows = await db.getAllAsync<MomoTransactionRecord>(
    `SELECT * FROM momo_transactions
     WHERE deleted_at IS NULL
     ORDER BY transaction_date DESC, created_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows.map(mapMomoTransaction);
}

export async function getMomoDayTotals(
  db: DbClient,
  transactionDate: string,
): Promise<MomoDayTotals> {
  const row = await db.getFirstAsync<{
    cash_in: number;
    cash_out: number;
    airtime: number;
    fees: number;
    count: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type = 'cash_in' THEN amount ELSE 0 END), 0) AS cash_in,
       COALESCE(SUM(CASE WHEN transaction_type = 'cash_out' THEN amount ELSE 0 END), 0) AS cash_out,
       COALESCE(SUM(CASE WHEN transaction_type = 'airtime' THEN amount ELSE 0 END), 0) AS airtime,
       COALESCE(SUM(fee), 0) AS fees,
       COUNT(*) AS count
     FROM momo_transactions
     WHERE transaction_date = ? AND deleted_at IS NULL`,
    [transactionDate],
  );

  return {
    cashInPesewas: Number(row?.cash_in ?? 0),
    cashOutPesewas: Number(row?.cash_out ?? 0),
    airtimePesewas: Number(row?.airtime ?? 0),
    feePesewas: Number(row?.fees ?? 0),
    count: Number(row?.count ?? 0),
  };
}

export async function listMomoRangeTotals(
  db: DbClient,
  startDate: string,
  endDate: string,
): Promise<MomoDailyTotals[]> {
  const rows = await db.getAllAsync<{
    transaction_date: string;
    cash_in: number;
    cash_out: number;
    airtime: number;
    fees: number;
    count: number;
  }>(
    `SELECT
       transaction_date,
       COALESCE(SUM(CASE WHEN transaction_type = 'cash_in' THEN amount ELSE 0 END), 0) AS cash_in,
       COALESCE(SUM(CASE WHEN transaction_type = 'cash_out' THEN amount ELSE 0 END), 0) AS cash_out,
       COALESCE(SUM(CASE WHEN transaction_type = 'airtime' THEN amount ELSE 0 END), 0) AS airtime,
       COALESCE(SUM(fee), 0) AS fees,
       COUNT(*) AS count
     FROM momo_transactions
     WHERE transaction_date >= ? AND transaction_date <= ? AND deleted_at IS NULL
     GROUP BY transaction_date
     ORDER BY transaction_date ASC`,
    [startDate, endDate],
  );

  return rows.map((row) => ({
    transactionDate: row.transaction_date,
    cashInPesewas: Number(row.cash_in),
    cashOutPesewas: Number(row.cash_out),
    airtimePesewas: Number(row.airtime),
    feePesewas: Number(row.fees),
    count: Number(row.count),
  }));
}
