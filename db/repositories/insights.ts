import type { DbClient } from '@/db/client';
import { listActiveProducts } from '@/db/repositories/products';
import { listDailySales } from '@/db/repositories/sales';
import type { CostHistoryPoint } from '@/lib/insights';
import type { DailySale, Product } from '@/types/domain';

export type InsightSources = {
  sales: DailySale[];
  products: Product[];
  costHistory: CostHistoryPoint[];
};

type CostHistoryRow = {
  product_id: string;
  name: string;
  cost_price: number;
  recorded_at: string;
};

export async function loadInsightSources(db: DbClient): Promise<InsightSources> {
  const [sales, products, historyRows] = await Promise.all([
    listDailySales(db),
    listActiveProducts(db),
    db.getAllAsync<CostHistoryRow>(
      `SELECT h.product_id, p.name, h.cost_price, h.recorded_at
       FROM price_history h
       INNER JOIN products p ON p.id = h.product_id
       WHERE p.deleted_at IS NULL AND p.is_active = 1
       ORDER BY h.recorded_at ASC`,
    ),
  ]);

  return {
    sales,
    products,
    costHistory: historyRows.map((row) => ({
      productId: row.product_id,
      productName: row.name,
      costPesewas: row.cost_price,
      recordedAt: row.recorded_at,
    })),
  };
}
