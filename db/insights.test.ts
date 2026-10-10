import { describe, expect, it } from 'vitest';

import { migrate } from '@/db/migrate';
import { createNodeSqliteClient } from '@/db/node-sqlite';
import { loadInsightSources } from '@/db/repositories/insights';
import { recordMomoTransaction } from '@/db/repositories/momo';
import { upsertDailySales } from '@/db/repositories/sales';

describe('insights dashboard sources', () => {
  it('loads sales and grouped MOMO activity only inside the requested range', async () => {
    const db = createNodeSqliteClient();
    await migrate(db);

    await upsertDailySales(db, { saleDate: '2026-10-09', totalSalesPesewas: 20000 });
    await upsertDailySales(db, { saleDate: '2026-10-10', totalSalesPesewas: 35000 });
    await upsertDailySales(db, { saleDate: '2026-09-01', totalSalesPesewas: 99999 });

    await recordMomoTransaction(db, {
      transactionType: 'cash_in',
      provider: 'MTN',
      amountPesewas: 10000,
      feePesewas: 100,
      transactionDate: '2026-10-10',
    });
    await recordMomoTransaction(db, {
      transactionType: 'cash_out',
      provider: 'Telecel',
      amountPesewas: 5000,
      feePesewas: 20,
      transactionDate: '2026-10-10',
    });
    await recordMomoTransaction(db, {
      transactionType: 'airtime',
      provider: 'AirtelTigo',
      amountPesewas: 2000,
      feePesewas: 200,
      transactionDate: '2026-10-09',
    });

    const sources = await loadInsightSources(db, {
      start: '2026-10-09',
      end: '2026-10-10',
    });

    expect(sources.daily).toEqual([
      {
        date: '2026-10-09',
        salesPesewas: 20000,
        cashInPesewas: 0,
        cashOutPesewas: 0,
        airtimePesewas: 2000,
        commissionPesewas: 200,
      },
      {
        date: '2026-10-10',
        salesPesewas: 35000,
        cashInPesewas: 10000,
        cashOutPesewas: 5000,
        airtimePesewas: 0,
        commissionPesewas: 120,
      },
    ]);
  });
});
