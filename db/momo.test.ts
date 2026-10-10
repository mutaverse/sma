import { describe, expect, it } from 'vitest';

import { migrate } from '@/db/migrate';
import { createNodeSqliteClient } from '@/db/node-sqlite';
import {
  deleteMomoTransaction,
  getMomoDayTotals,
  listMomoRangeTotals,
  listMomoTransactions,
  recordMomoTransaction,
  updateMomoTransaction,
} from '@/db/repositories/momo';
import { listPendingSyncEvents } from '@/db/repositories/sync-queue';

async function setup() {
  const db = createNodeSqliteClient();
  await migrate(db);
  return db;
}

describe('MOMO transactions', () => {
  it('records full cash-in and cash-out details', async () => {
    const db = await setup();

    await recordMomoTransaction(db, {
      transactionType: 'cash_in',
      provider: 'MTN',
      amountPesewas: 25000,
      feePesewas: 250,
      customerReference: '024 123 4567',
      transactionDate: '2026-10-10',
      note: 'Market customer',
    });
    await recordMomoTransaction(db, {
      transactionType: 'cash_out',
      provider: 'Telecel',
      amountPesewas: 10000,
      feePesewas: 100,
      transactionDate: '2026-10-10',
    });

    const rows = await listMomoTransactions(db);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.provider)).toEqual(expect.arrayContaining(['MTN', 'Telecel']));
    expect(rows.find((row) => row.provider === 'MTN')?.customerReference).toBe('024 123 4567');

    expect(await getMomoDayTotals(db, '2026-10-10')).toEqual({
      cashInPesewas: 25000,
      cashOutPesewas: 10000,
      airtimePesewas: 0,
      feePesewas: 350,
      count: 2,
    });
    expect(await listMomoRangeTotals(db, '2026-10-09', '2026-10-10')).toEqual([
      {
        transactionDate: '2026-10-10',
        cashInPesewas: 25000,
        cashOutPesewas: 10000,
        airtimePesewas: 0,
        feePesewas: 350,
        count: 2,
      },
    ]);

    const queue = await listPendingSyncEvents(db);
    expect(queue.filter((item) => item.operation === 'momo.upsert')).toHaveLength(2);
  });

  it('rejects zero amounts and invalid dates', async () => {
    const db = await setup();
    await expect(
      recordMomoTransaction(db, {
        transactionType: 'cash_in',
        provider: 'MTN',
        amountPesewas: 0,
        feePesewas: 0,
        transactionDate: '2026-02-31',
      }),
    ).rejects.toThrow();
  });

  it('updates and deletes a transaction', async () => {
    const db = await setup();
    const created = await recordMomoTransaction(db, {
      transactionType: 'cash_in',
      provider: 'MTN',
      amountPesewas: 10000,
      feePesewas: 100,
      transactionDate: '2026-10-10',
    });

    const updated = await updateMomoTransaction(db, created.id, {
      transactionType: 'airtime',
      provider: 'Telecel',
      amountPesewas: 2000,
      feePesewas: 200,
      transactionDate: '2026-10-10',
    });
    expect(updated.transactionType).toBe('airtime');
    expect(updated.provider).toBe('Telecel');

    await deleteMomoTransaction(db, created.id);
    expect(await listMomoTransactions(db)).toHaveLength(0);
    expect((await getMomoDayTotals(db, '2026-10-10')).count).toBe(0);
  });
});
