import { describe, expect, it } from 'vitest';

import { migrate } from '@/db/migrate';
import { createNodeSqliteClient } from '@/db/node-sqlite';
import { createProduct, getProduct } from '@/db/repositories/products';
import { recordPurchase, undoLatestPurchase } from '@/db/repositories/purchases';
import { recordStockCount } from '@/db/repositories/stock-counts';
import { listPendingSyncEvents } from '@/db/repositories/sync-queue';

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

describe('stock count', () => {
  it('sets on-hand instead of adding to the last purchase', async () => {
    const { db, product } = await setup();

    await recordPurchase(db, {
      productId: product.id,
      quantityThousandths: 24000,
      totalCostPesewas: 56400,
      sellingPricePesewas: 2800,
      purchaseDate: '2026-09-15',
    });

    await recordStockCount(db, {
      productId: product.id,
      quantityThousandths: 18000,
      countedAt: '2026-09-16T12:00:00.000Z',
    });

    const counted = await getProduct(db, product.id);
    expect(counted?.currentStockThousandths).toBe(18000);
    expect(counted?.countedAt).toBe('2026-09-16T12:00:00.000Z');
    expect(counted?.currentCostPesewas).toBe(2350);
    expect(counted?.currentSellingPesewas).toBe(2800);

    const queue = await listPendingSyncEvents(db);
    expect(queue.some((item) => item.operation === 'stock.count_set')).toBe(true);
  });

  it('undo after a lower count restores prices and clamps on-hand at zero', async () => {
    const { db, product } = await setup();

    await recordPurchase(db, {
      productId: product.id,
      quantityThousandths: 24000,
      totalCostPesewas: 56400,
      sellingPricePesewas: 2800,
      purchaseDate: '2026-09-15',
    });

    await recordStockCount(db, {
      productId: product.id,
      quantityThousandths: 18000,
      countedAt: '2026-09-16T12:00:00.000Z',
    });

    await undoLatestPurchase(db, product.id);

    const restored = await getProduct(db, product.id);
    expect(restored?.currentStockThousandths).toBe(0);
    expect(restored?.currentCostPesewas).toBe(2280);
    expect(restored?.currentSellingPesewas).toBe(2700);

    const queue = await listPendingSyncEvents(db);
    expect(queue.some((item) => item.operation === 'purchase.undone')).toBe(true);
  });
});
