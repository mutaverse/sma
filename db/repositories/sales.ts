import type { DbClient } from '@/db/client';
import { mapDailySale } from '@/db/mappers';
import { enqueueSyncEvent } from '@/db/repositories/sync-queue';
import { nowIso } from '@/lib/dates';
import { createId } from '@/lib/id';
import { upsertDailySalesSchema, type UpsertDailySalesInput } from '@/lib/validation';
import type { DailySaleRecord } from '@/types/database';
import type { DailySale } from '@/types/domain';

export async function upsertDailySales(db: DbClient, input: UpsertDailySalesInput): Promise<DailySale> {
  const parsed = upsertDailySalesSchema.parse(input);
  const timestamp = nowIso();
  const existing = await db.getFirstAsync<DailySaleRecord>(
    'SELECT * FROM daily_sales WHERE sale_date = ? AND deleted_at IS NULL',
    [parsed.saleDate],
  );

  const id = existing?.id ?? createId();

  await db.withTransactionAsync(async () => {
    if (existing) {
      await db.runAsync(
        'UPDATE daily_sales SET total_sales = ?, updated_at = ? WHERE id = ?',
        [parsed.totalSalesPesewas, timestamp, id],
      );
    } else {
      await db.runAsync(
        `INSERT INTO daily_sales (
          id, user_id, sale_date, total_sales, created_at, updated_at, deleted_at
        ) VALUES (?, NULL, ?, ?, ?, ?, NULL)`,
        [id, parsed.saleDate, parsed.totalSalesPesewas, timestamp, timestamp],
      );
    }

    await enqueueSyncEvent(db, {
      entityType: 'sale',
      entityId: id,
      operation: 'sale.upsert',
      payload: { id, saleDate: parsed.saleDate, totalSalesPesewas: parsed.totalSalesPesewas },
    });
  });

  if (existing) {
    return {
      ...mapDailySale(existing),
      totalPesewas: parsed.totalSalesPesewas,
      updatedAt: timestamp,
    };
  }

  return {
    id,
    userId: null,
    saleDate: parsed.saleDate,
    totalPesewas: parsed.totalSalesPesewas,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export async function getDailySale(db: DbClient, saleDate: string): Promise<DailySale | null> {
  const row = await db.getFirstAsync<DailySaleRecord>(
    'SELECT * FROM daily_sales WHERE sale_date = ? AND deleted_at IS NULL',
    [saleDate],
  );
  return row ? mapDailySale(row) : null;
}

export async function listDailySales(db: DbClient): Promise<DailySale[]> {
  const rows = await db.getAllAsync<DailySaleRecord>(
    'SELECT * FROM daily_sales WHERE deleted_at IS NULL ORDER BY sale_date DESC',
  );
  return rows.map(mapDailySale);
}
