import type { DbClient } from '@/db/client';
import { requireProduct } from '@/db/repositories/products';
import { enqueueSyncEvent } from '@/db/repositories/sync-queue';
import { nowIso } from '@/lib/dates';
import { createId } from '@/lib/id';
import { recordStockCountSchema, type RecordStockCountInput } from '@/lib/validation';
import type { StockCount } from '@/types/domain';

export async function recordStockCount(db: DbClient, input: RecordStockCountInput): Promise<StockCount> {
  const parsed = recordStockCountSchema.parse(input);
  await requireProduct(db, parsed.productId);

  const id = createId();
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO stock_counts (
        id, user_id, product_id, quantity, counted_at, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?)`,
      [id, parsed.productId, parsed.quantityThousandths, parsed.countedAt, timestamp, timestamp],
    );

    await db.runAsync(
      `UPDATE products
       SET current_stock = ?, counted_at = ?, updated_at = ?
       WHERE id = ?`,
      [parsed.quantityThousandths, parsed.countedAt, timestamp, parsed.productId],
    );

    await enqueueSyncEvent(db, {
      entityType: 'stock_count',
      entityId: id,
      operation: 'stock.count_set',
      payload: {
        id,
        productId: parsed.productId,
        quantityThousandths: parsed.quantityThousandths,
        countedAt: parsed.countedAt,
      },
    });
  });

  return {
    id,
    userId: null,
    productId: parsed.productId,
    quantityThousandths: parsed.quantityThousandths,
    countedAt: parsed.countedAt,
    createdAt: timestamp,
  };
}
