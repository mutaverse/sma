import type { DbClient } from '@/db/client';
import { mapPurchase, mapPriceHistory } from '@/db/mappers';
import { requireProduct } from '@/db/repositories/products';
import { enqueueSyncEvent } from '@/db/repositories/sync-queue';
import {
  addStock,
  calculateUnitCost,
  subtractStock,
} from '@/lib/calculations';
import { nowIso, isoFromCalendarDate } from '@/lib/dates';
import { DomainError } from '@/lib/errors';
import { createId } from '@/lib/id';
import { recordPurchaseSchema, type RecordPurchaseInput } from '@/lib/validation';
import type { PriceHistoryRecord, PurchaseRecord } from '@/types/database';
import type { PriceHistory, Purchase } from '@/types/domain';

export type UndoLatestPreview = {
  purchase: Purchase;
  nextStockThousandths: number;
  nextCostPesewas: number;
  nextSellingPesewas: number;
  clampedToZero: boolean;
};

export async function recordPurchase(db: DbClient, input: RecordPurchaseInput): Promise<Purchase> {
  const parsed = recordPurchaseSchema.parse(input);
  const product = await requireProduct(db, parsed.productId);
  const unitCost = calculateUnitCost(parsed.totalCostPesewas, parsed.quantityThousandths);
  const purchaseId = createId();
  const historyId = createId();
  const timestamp = nowIso();
  const nextStock = addStock(product.currentStockThousandths, parsed.quantityThousandths);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO purchases (
        id, user_id, product_id, quantity, total_cost, unit_cost, selling_price,
        purchase_date, created_at, updated_at, deleted_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        purchaseId,
        parsed.productId,
        parsed.quantityThousandths,
        parsed.totalCostPesewas,
        unitCost,
        parsed.sellingPricePesewas,
        parsed.purchaseDate,
        timestamp,
        timestamp,
      ],
    );

    await db.runAsync(
      `INSERT INTO price_history (
        id, user_id, product_id, purchase_id, cost_price, selling_price, recorded_at, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [
        historyId,
        parsed.productId,
        purchaseId,
        unitCost,
        parsed.sellingPricePesewas,
        isoFromCalendarDate(parsed.purchaseDate),
        timestamp,
        timestamp,
      ],
    );

    const currentPrices = await latestActivePurchasePrices(db, parsed.productId);

    await db.runAsync(
      `UPDATE products
       SET current_stock = ?, current_cost_price = ?, current_selling_price = ?, updated_at = ?
       WHERE id = ?`,
      [
        nextStock,
        currentPrices?.unitCost ?? unitCost,
        currentPrices?.sellingPrice ?? parsed.sellingPricePesewas,
        timestamp,
        parsed.productId,
      ],
    );

    await enqueueSyncEvent(db, {
      entityType: 'purchase',
      entityId: purchaseId,
      operation: 'purchase.recorded',
      payload: {
        id: purchaseId,
        productId: parsed.productId,
        quantityThousandths: parsed.quantityThousandths,
        totalCostPesewas: parsed.totalCostPesewas,
        unitCostPesewas: unitCost,
        sellingPricePesewas: parsed.sellingPricePesewas,
        purchaseDate: parsed.purchaseDate,
      },
    });
  });

  return {
    id: purchaseId,
    userId: null,
    productId: parsed.productId,
    quantityThousandths: parsed.quantityThousandths,
    totalCostPesewas: parsed.totalCostPesewas,
    unitCostPesewas: unitCost,
    sellingPricePesewas: parsed.sellingPricePesewas,
    purchaseDate: parsed.purchaseDate,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export async function previewPurchaseRemoval(
  db: DbClient,
  purchaseId: string,
): Promise<UndoLatestPreview> {
  const existing = await activePurchase(db, purchaseId);
  if (!existing) {
    throw new DomainError('That purchase is no longer available.');
  }

  const product = await requireProduct(db, existing.product_id);
  const remaining = await latestActivePurchasePrices(db, existing.product_id, purchaseId);
  const fallback = await latestPriceHistory(db, existing.product_id, purchaseId);
  const stock = subtractStock(product.currentStockThousandths, existing.quantity);

  return {
    purchase: mapPurchase(existing),
    nextStockThousandths: stock.next,
    nextCostPesewas: remaining?.unitCost ?? fallback?.cost_price ?? 0,
    nextSellingPesewas: remaining?.sellingPrice ?? fallback?.selling_price ?? 0,
    clampedToZero: stock.clamped,
  };
}

export async function previewUndoLatestPurchase(
  db: DbClient,
  productId: string,
): Promise<UndoLatestPreview> {
  const product = await requireProduct(db, productId);
  const latest = await latestActivePurchase(db, productId);

  if (!latest) {
    throw new DomainError('There is no purchase to undo for this product.');
  }

  const remaining = await latestActivePurchasePrices(db, productId, latest.id);
  const fallback = await latestPriceHistory(db, productId, latest.id);
  const stock = subtractStock(product.currentStockThousandths, latest.quantity);

  return {
    purchase: mapPurchase(latest),
    nextStockThousandths: stock.next,
    nextCostPesewas: remaining?.unitCost ?? fallback?.cost_price ?? 0,
    nextSellingPesewas: remaining?.sellingPrice ?? fallback?.selling_price ?? 0,
    clampedToZero: stock.clamped,
  };
}

export async function undoLatestPurchase(db: DbClient, productId: string): Promise<Purchase> {
  const latest = await latestActivePurchase(db, productId);
  if (!latest) {
    throw new DomainError('There is no purchase to undo for this product.');
  }

  return deletePurchase(db, latest.id);
}

export async function updatePurchase(
  db: DbClient,
  purchaseId: string,
  input: RecordPurchaseInput,
): Promise<Purchase> {
  const parsed = recordPurchaseSchema.parse(input);
  const existing = await activePurchase(db, purchaseId);
  if (!existing || existing.product_id !== parsed.productId) {
    throw new DomainError('That purchase is no longer available.');
  }

  const product = await requireProduct(db, parsed.productId);
  const unitCost = calculateUnitCost(parsed.totalCostPesewas, parsed.quantityThousandths);
  const delta = parsed.quantityThousandths - existing.quantity;
  const nextStock =
    delta >= 0
      ? addStock(product.currentStockThousandths, delta)
      : subtractStock(product.currentStockThousandths, -delta).next;
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE purchases
       SET quantity = ?, total_cost = ?, unit_cost = ?, selling_price = ?, purchase_date = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        parsed.quantityThousandths,
        parsed.totalCostPesewas,
        unitCost,
        parsed.sellingPricePesewas,
        parsed.purchaseDate,
        timestamp,
        purchaseId,
      ],
    );
    const historyUpdate = await db.runAsync(
      `UPDATE price_history
       SET cost_price = ?, selling_price = ?, recorded_at = ?, updated_at = ?
       WHERE purchase_id = ?`,
      [unitCost, parsed.sellingPricePesewas, isoFromCalendarDate(parsed.purchaseDate), timestamp, purchaseId],
    );
    if (historyUpdate.changes === 0) {
      await db.runAsync(
        `INSERT INTO price_history (
          id, user_id, product_id, purchase_id, cost_price, selling_price, recorded_at, created_at, updated_at
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createId(),
          parsed.productId,
          purchaseId,
          unitCost,
          parsed.sellingPricePesewas,
          isoFromCalendarDate(parsed.purchaseDate),
          timestamp,
          timestamp,
        ],
      );
    }

    const prices = await latestActivePurchasePrices(db, parsed.productId);
    await db.runAsync(
      `UPDATE products
       SET current_stock = ?, current_cost_price = ?, current_selling_price = ?, updated_at = ?
       WHERE id = ?`,
      [
        nextStock,
        prices?.unitCost ?? unitCost,
        prices?.sellingPrice ?? parsed.sellingPricePesewas,
        timestamp,
        parsed.productId,
      ],
    );
    await enqueueSyncEvent(db, {
      entityType: 'purchase',
      entityId: purchaseId,
      operation: 'purchase.recorded',
      payload: { id: purchaseId, productId: parsed.productId },
    });
    await enqueueSyncEvent(db, {
      entityType: 'product',
      entityId: parsed.productId,
      operation: 'product.upsert',
      payload: { id: parsed.productId },
    });
  });

  return {
    ...mapPurchase(existing),
    quantityThousandths: parsed.quantityThousandths,
    totalCostPesewas: parsed.totalCostPesewas,
    unitCostPesewas: unitCost,
    sellingPricePesewas: parsed.sellingPricePesewas,
    purchaseDate: parsed.purchaseDate,
    updatedAt: timestamp,
  };
}

export async function deletePurchase(db: DbClient, purchaseId: string): Promise<Purchase> {
  const existing = await activePurchase(db, purchaseId);
  if (!existing) {
    throw new DomainError('That purchase is no longer available.');
  }

  const product = await requireProduct(db, existing.product_id);
  const stock = subtractStock(product.currentStockThousandths, existing.quantity);
  const remaining = await latestActivePurchasePrices(db, existing.product_id, purchaseId);
  const fallback = await latestPriceHistory(db, existing.product_id, purchaseId);
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE purchases SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      [timestamp, timestamp, purchaseId],
    );
    await db.runAsync(
      `UPDATE products
       SET current_stock = ?, current_cost_price = ?, current_selling_price = ?, updated_at = ?
       WHERE id = ?`,
      [
        stock.next,
        remaining?.unitCost ?? fallback?.cost_price ?? 0,
        remaining?.sellingPrice ?? fallback?.selling_price ?? 0,
        timestamp,
        existing.product_id,
      ],
    );
    await enqueueSyncEvent(db, {
      entityType: 'purchase',
      entityId: purchaseId,
      operation: 'purchase.undone',
      payload: { id: purchaseId, productId: existing.product_id },
    });
    await enqueueSyncEvent(db, {
      entityType: 'product',
      entityId: existing.product_id,
      operation: 'product.upsert',
      payload: { id: existing.product_id },
    });
  });

  return {
    ...mapPurchase(existing),
    updatedAt: timestamp,
    deletedAt: timestamp,
  };
}

export async function listPurchaseHistory(db: DbClient, productId: string): Promise<Purchase[]> {
  const rows = await db.getAllAsync<PurchaseRecord>(
    `SELECT * FROM purchases
     WHERE product_id = ? AND deleted_at IS NULL
     ORDER BY purchase_date DESC, created_at DESC`,
    [productId],
  );
  return rows.map(mapPurchase);
}

export async function listPriceHistory(db: DbClient, productId: string): Promise<PriceHistory[]> {
  const rows = await db.getAllAsync<PriceHistoryRecord>(
    `SELECT * FROM price_history WHERE product_id = ? ORDER BY recorded_at DESC`,
    [productId],
  );
  return rows.map(mapPriceHistory);
}

async function activePurchase(db: DbClient, purchaseId: string): Promise<PurchaseRecord | null> {
  return db.getFirstAsync<PurchaseRecord>(
    'SELECT * FROM purchases WHERE id = ? AND deleted_at IS NULL',
    [purchaseId],
  );
}

async function latestActivePurchase(db: DbClient, productId: string): Promise<PurchaseRecord | null> {
  return db.getFirstAsync<PurchaseRecord>(
    `SELECT * FROM purchases
     WHERE product_id = ? AND deleted_at IS NULL
     ORDER BY purchase_date DESC, created_at DESC
     LIMIT 1`,
    [productId],
  );
}

async function latestActivePurchasePrices(
  db: DbClient,
  productId: string,
  excludingPurchaseId?: string,
): Promise<{ unitCost: number; sellingPrice: number } | null> {
  const row = excludingPurchaseId
    ? await db.getFirstAsync<PurchaseRecord>(
        `SELECT * FROM purchases
         WHERE product_id = ? AND deleted_at IS NULL AND id != ?
         ORDER BY purchase_date DESC, created_at DESC
         LIMIT 1`,
        [productId, excludingPurchaseId],
      )
    : await latestActivePurchase(db, productId);

  if (!row) {
    return null;
  }

  return { unitCost: row.unit_cost, sellingPrice: row.selling_price };
}

async function latestPriceHistory(
  db: DbClient,
  productId: string,
  excludingPurchaseId?: string,
): Promise<PriceHistoryRecord | null> {
  if (excludingPurchaseId) {
    return db.getFirstAsync<PriceHistoryRecord>(
      `SELECT * FROM price_history
       WHERE product_id = ? AND (purchase_id IS NULL OR purchase_id != ?)
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [productId, excludingPurchaseId],
    );
  }

  return db.getFirstAsync<PriceHistoryRecord>(
    `SELECT * FROM price_history WHERE product_id = ? ORDER BY recorded_at DESC LIMIT 1`,
    [productId],
  );
}
