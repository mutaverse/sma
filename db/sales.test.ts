import { describe, expect, it } from 'vitest';

import { migrate } from '@/db/migrate';
import { createNodeSqliteClient } from '@/db/node-sqlite';
import { getDailySale, listDailySales, upsertDailySales } from '@/db/repositories/sales';
import { listPendingSyncEvents } from '@/db/repositories/sync-queue';

async function setup() {
  const db = createNodeSqliteClient();
  await migrate(db);
  return db;
}

describe('daily sales', () => {
  it('saves twice on the same day as one updated row', async () => {
    const db = await setup();

    const first = await upsertDailySales(db, {
      saleDate: '2026-09-16',
      totalSalesPesewas: 42000,
    });
    const second = await upsertDailySales(db, {
      saleDate: '2026-09-16',
      totalSalesPesewas: 48000,
    });

    expect(second.id).toBe(first.id);
    expect((await getDailySale(db, '2026-09-16'))?.totalPesewas).toBe(48000);
    expect(await listDailySales(db)).toHaveLength(1);

    const queue = await listPendingSyncEvents(db);
    expect(queue.filter((item) => item.operation === 'sale.upsert')).toHaveLength(2);
  });

  it('keeps yesterday as a separate day', async () => {
    const db = await setup();

    await upsertDailySales(db, {
      saleDate: '2026-09-16',
      totalSalesPesewas: 42000,
    });
    await upsertDailySales(db, {
      saleDate: '2026-09-15',
      totalSalesPesewas: 38000,
    });

    const days = await listDailySales(db);
    expect(days.map((row) => row.saleDate)).toEqual(['2026-09-16', '2026-09-15']);
    expect((await getDailySale(db, '2026-09-15'))?.totalPesewas).toBe(38000);
  });

  it('allows zero and rejects a negative total', async () => {
    const db = await setup();

    const closed = await upsertDailySales(db, {
      saleDate: '2026-09-16',
      totalSalesPesewas: 0,
    });
    expect(closed.totalPesewas).toBe(0);

    await expect(
      upsertDailySales(db, {
        saleDate: '2026-09-16',
        totalSalesPesewas: -1,
      }),
    ).rejects.toThrow(/cannot be negative/);
  });
});
