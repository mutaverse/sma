import type { DbClient } from '@/db/client';
import { listMomoRangeTotals } from '@/db/repositories/momo';
import type { DailyActivityPoint, DateRange } from '@/lib/insights';

export type InsightSources = {
  daily: DailyActivityPoint[];
};

type DailySaleTotalRow = {
  sale_date: string;
  total_sales: number;
};

export async function loadInsightSources(
  db: DbClient,
  range: DateRange,
): Promise<InsightSources> {
  const [sales, momo] = await Promise.all([
    db.getAllAsync<DailySaleTotalRow>(
      `SELECT sale_date, total_sales
       FROM daily_sales
       WHERE sale_date >= ? AND sale_date <= ? AND deleted_at IS NULL
       ORDER BY sale_date ASC`,
      [range.start, range.end],
    ),
    listMomoRangeTotals(db, range.start, range.end),
  ]);

  const byDate = new Map<string, DailyActivityPoint>();
  const getPoint = (date: string): DailyActivityPoint => {
    const existing = byDate.get(date);
    if (existing) return existing;
    const point: DailyActivityPoint = {
      date,
      salesPesewas: 0,
      cashInPesewas: 0,
      cashOutPesewas: 0,
      airtimePesewas: 0,
      commissionPesewas: 0,
    };
    byDate.set(date, point);
    return point;
  };

  for (const sale of sales) {
    getPoint(sale.sale_date).salesPesewas = Number(sale.total_sales);
  }
  for (const row of momo) {
    const point = getPoint(row.transactionDate);
    point.cashInPesewas = row.cashInPesewas;
    point.cashOutPesewas = row.cashOutPesewas;
    point.airtimePesewas = row.airtimePesewas;
    point.commissionPesewas = row.feePesewas;
  }

  return { daily: [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date)) };
}
