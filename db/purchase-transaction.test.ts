import { describe, expect, it } from 'vitest';

import { migrate } from '@/db/migrate';
import { createNodeSqliteClient } from '@/db/node-sqlite';
import { createProduct, getProduct } from '@/db/repositories/products';
import { recordPurchase, undoLatestPurchase, listPriceHistory, previewUndoLatestPurchase } from '@/db/repositories/purchases';
import { listPendingSyncEvents } from '@/db/repositories/sync-queue';
import type { DbClient } from '@/db/client';

async function setup() {
  const db = createNodeSqliteClient();
  await migrate(db);
  const product = await createProduct(db, {
    name: 'Milo 400g',
    unit: 'pack',
    categoryId: null,
    sellingPricePesewas: 2700,
    costPricePesewas: 2280,
    openingStockThousandths: 0,
  });
  return { db, product };
}

function failOnSql(client: DbClient, needle: string): DbClient {
  return {
    ...client,
    runAsync: async (sql, params) => {
      if (sql.includes(needle)) {
        throw new Error('forced failure');
      }
      return client.runAsync(sql, params);
    },
  };
}

describe('purchase transaction', () => {
  it('records purchase, stock, prices, history, and a domain sync event atomically', async () => {
    const { db, product } = await setup();

    const purchase = await recordPurchase(db, {
      productId: product.id,
      quantityThousandths: 24000,
      totalCostPesewas: 56400,
      sellingPricePesewas: 2800,
      purchaseDate: '2026-09-15',
    });

    expect(purchase.unitCostPesewas).toBe(2350);

    const updated = await getProduct(db, product.id);
    expect(updated?.currentStockThousandths).toBe(24000);
    expect(updated?.currentCostPesewas).toBe(2350);
    expect(updated?.currentSellingPesewas).toBe(2800);

    const history = await listPriceHistory(db, product.id);
    expect(history.some((row) => row.purchaseId === purchase.id && row.costPesewas === 2350)).toBe(true);
    expect(history.find((row) => row.purchaseId === purchase.id)?.recordedAt).toBe('2026-09-15T12:00:00.000Z');

    const queue = await listPendingSyncEvents(db);
    expect(queue.some((item) => item.operation === 'purchase.recorded' && item.entityId === purchase.id)).toBe(true);
  });

  it('uses the latest purchase_date for current prices when backdating', async () => {
    const { db, product } = await setup();

    await recordPurchase(db, {
      productId: product.id,
      quantityThousandths: 1000,
      totalCostPesewas: 2500,
      sellingPricePesewas: 3000,
      purchaseDate: '2026-09-15',
    });

    await recordPurchase(db, {
      productId: product.id,
      quantityThousandths: 1000,
      totalCostPesewas: 2000,
      sellingPricePesewas: 2600,
      purchaseDate: '2026-09-01',
    });

    const updated = await getProduct(db, product.id);
    expect(updated?.currentCostPesewas).toBe(2500);
    expect(updated?.currentSellingPesewas).toBe(3000);
    expect(updated?.currentStockThousandths).toBe(2000);
  });

  it('rolls back stock and queue when a later write fails', async () => {
    const { db, product } = await setup();
    const failing = failOnSql(db, 'INSERT INTO price_history');

    await expect(
      recordPurchase(failing, {
        productId: product.id,
        quantityThousandths: 24000,
        totalCostPesewas: 56400,
        sellingPricePesewas: 2800,
        purchaseDate: '2026-09-15',
      }),
    ).rejects.toThrow('forced failure');

    const unchanged = await getProduct(db, product.id);
    expect(unchanged?.currentStockThousandths).toBe(0);
    expect(await listPendingSyncEvents(db)).toHaveLength(1);
  });

  it('undo restores previous prices and stock', async () => {
    const { db, product } = await setup();

    await recordPurchase(db, {
      productId: product.id,
      quantityThousandths: 24000,
      totalCostPesewas: 56400,
      sellingPricePesewas: 2800,
      purchaseDate: '2026-09-15',
    });

    await undoLatestPurchase(db, product.id);

    const restored = await getProduct(db, product.id);
    expect(restored?.currentStockThousandths).toBe(0);
    expect(restored?.currentCostPesewas).toBe(2280);
    expect(restored?.currentSellingPesewas).toBe(2700);
  });

  it('preview matches the undo result', async () => {
    const { db, product } = await setup();

    await recordPurchase(db, {
      productId: product.id,
      quantityThousandths: 24000,
      totalCostPesewas: 56400,
      sellingPricePesewas: 2800,
      purchaseDate: '2026-09-15',
    });

    const preview = await previewUndoLatestPurchase(db, product.id);
    expect(preview.nextStockThousandths).toBe(0);
    expect(preview.nextCostPesewas).toBe(2280);
    expect(preview.nextSellingPesewas).toBe(2700);
    expect(preview.clampedToZero).toBe(false);
  });
});
