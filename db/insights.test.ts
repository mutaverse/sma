import { describe, expect, it } from 'vitest';

import { migrate } from '@/db/migrate';
import { createNodeSqliteClient } from '@/db/node-sqlite';
import { loadInsightSources } from '@/db/repositories/insights';
import { createProduct } from '@/db/repositories/products';
import { recordPurchase } from '@/db/repositories/purchases';
import { upsertDailySales } from '@/db/repositories/sales';
import {
  pickWeekdayExtremes,
  rankProductMargins,
  detectCostMovers,
  trailingAveragePesewas,
  periodRange,
  salesInRange,
  periodTotals,
} from '@/lib/insights';

const TODAY = '2026-09-16';
const WEEKDAY_SALES = [50000, 40000, 30000, 45000, 42000, 55000, 80000];

function amountForDate(calendarDate: string): number {
  const [year, month, day] = calendarDate.split('-').map((part) => Number.parseInt(part, 10));
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAY_SALES[weekday] ?? 0;
}

function nextDate(calendarDate: string): string {
  const [year, month, day] = calendarDate.split('-').map((part) => Number.parseInt(part, 10));
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('insights dashboard sources', () => {
  it('matches weekday averages, month totals, margins, and cost movers on a 21-day fixture', async () => {
    const db = createNodeSqliteClient();
    await migrate(db);

    let cursor = '2026-08-27';
    for (let index = 0; index < 21; index += 1) {
      await upsertDailySales(db, {
        saleDate: cursor,
        totalSalesPesewas: amountForDate(cursor),
      });
      cursor = nextDate(cursor);
    }

    const highMargin = await createProduct(db, {
      name: 'Product A',
      unit: 'pack',
      categoryId: null,
      sellingPricePesewas: 10000,
      costPricePesewas: 6900,
      openingStockThousandths: 0,
    });
    await createProduct(db, {
      name: 'Product B',
      unit: 'piece',
      categoryId: null,
      sellingPricePesewas: 10000,
      costPricePesewas: 7300,
      openingStockThousandths: 0,
    });
    const milo = await createProduct(db, {
      name: 'Milo 400g',
      unit: 'pack',
      categoryId: null,
      sellingPricePesewas: 2800,
      costPricePesewas: 2280,
      openingStockThousandths: 0,
    });
    await recordPurchase(db, {
      productId: milo.id,
      quantityThousandths: 24000,
      totalCostPesewas: 56400,
      sellingPricePesewas: 2800,
      purchaseDate: '2026-09-15',
    });

    const sources = await loadInsightSources(db);
    expect(sources.sales).toHaveLength(21);

    const extremes = pickWeekdayExtremes(sources.sales);
    expect(extremes?.best.weekday).toBe(6);
    expect(extremes?.lowest.weekday).toBe(2);

    const month = salesInRange(sources.sales, periodRange('month', TODAY));
    expect(periodTotals(month).recordedDays).toBe(16);
    expect(periodTotals(month).totalPesewas).toBe(
      month.reduce((sum, sale) => sum + sale.totalPesewas, 0),
    );

    expect(trailingAveragePesewas(sources.sales, TODAY)).not.toBeNull();

    const margins = rankProductMargins(sources.products);
    expect(margins[0]?.name).toBe(highMargin.name);
    expect(margins.map((row) => row.name).slice(0, 2)).toEqual(['Product A', 'Product B']);

    const movers = detectCostMovers(sources.products, sources.costHistory);
    const miloMove = movers.find((row) => row.productName === 'Milo 400g');
    expect(miloMove?.previousCostPesewas).toBe(2280);
    expect(miloMove?.currentCostPesewas).toBe(2350);
  });
});
