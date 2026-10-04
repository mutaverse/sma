import { describe, expect, it } from 'vitest';

import { calculateWeekdayPerformance } from '@/lib/calculations';
import {
  buildTrend,
  calculateVsAveragePercent,
  detectCostMovers,
  formatCostChange,
  formatSignedPercent,
  isHighlightedCostChange,
  periodRange,
  pickWeekdayExtremes,
  rankProductMargins,
  salesInRange,
  trailingAveragePesewas,
  WEEKDAY_MIN_DAYS,
} from '@/lib/insights';
import type { DailySale, Product } from '@/types/domain';

const TODAY = '2026-09-16';

const WEEKDAY_SALES = [50000, 40000, 30000, 45000, 42000, 55000, 80000];

function sale(saleDate: string, totalPesewas: number): DailySale {
  return {
    id: saleDate,
    userId: null,
    saleDate,
    totalPesewas,
    createdAt: `${saleDate}T12:00:00.000Z`,
    updatedAt: `${saleDate}T12:00:00.000Z`,
    deletedAt: null,
  };
}

function amountForDate(calendarDate: string): number {
  const [year, month, day] = calendarDate.split('-').map((part) => Number.parseInt(part, 10));
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAY_SALES[weekday] ?? 0;
}

function daysFrom(start: string, count: number): DailySale[] {
  const sales: DailySale[] = [];
  let cursor = start;
  for (let index = 0; index < count; index += 1) {
    sales.push(sale(cursor, amountForDate(cursor)));
    const [year, month, day] = cursor.split('-').map((part) => Number.parseInt(part, 10));
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    const y = next.getUTCFullYear();
    const m = String(next.getUTCMonth() + 1).padStart(2, '0');
    const d = String(next.getUTCDate()).padStart(2, '0');
    cursor = `${y}-${m}-${d}`;
  }
  return sales;
}

const TWENTY_ONE_DAYS = daysFrom('2026-08-27', 21);

describe('insight periods', () => {
  it('uses Accra calendar windows that include today', () => {
    expect(periodRange('7d', TODAY)).toEqual({ start: '2026-09-10', end: TODAY });
    expect(periodRange('30d', TODAY)).toEqual({ start: '2026-08-18', end: TODAY });
    expect(periodRange('month', TODAY)).toEqual({ start: '2026-09-01', end: TODAY });
    expect(periodRange('year', TODAY)).toEqual({ start: '2026-01-01', end: TODAY });
  });
});

describe('weekday extremes', () => {
  it('picks Saturday and Tuesday from 21 days of averages, not a single date', () => {
    expect(TWENTY_ONE_DAYS).toHaveLength(21);
    const extremes = pickWeekdayExtremes(TWENTY_ONE_DAYS);
    expect(extremes?.best.weekday).toBe(6);
    expect(extremes?.best.averagePesewas).toBe(80000);
    expect(extremes?.lowest.weekday).toBe(2);
    expect(extremes?.lowest.averagePesewas).toBe(30000);

    const tuesdays = calculateWeekdayPerformance(TWENTY_ONE_DAYS).find((row) => row.weekday === 2);
    expect(tuesdays?.sampleSize).toBeGreaterThan(1);
  });

  it('hides best/worst until there are enough recorded days', () => {
    expect(pickWeekdayExtremes(TWENTY_ONE_DAYS.slice(0, WEEKDAY_MIN_DAYS - 1))).toBeNull();
    expect(pickWeekdayExtremes(TWENTY_ONE_DAYS.slice(0, 5))).toBeNull();
  });
});

describe('trailing average and vs average', () => {
  it('averages the last 30 recorded days except today', () => {
    const average = trailingAveragePesewas(TWENTY_ONE_DAYS, TODAY);
    const withoutToday = TWENTY_ONE_DAYS.filter((row) => row.saleDate !== TODAY);
    const expected = Math.round(
      withoutToday.reduce((sum, row) => sum + row.totalPesewas, 0) / withoutToday.length,
    );
    expect(average).toBe(expected);

    const today = TWENTY_ONE_DAYS.find((row) => row.saleDate === TODAY);
    expect(calculateVsAveragePercent(today?.totalPesewas ?? 0, average ?? 0)).not.toBeNull();
    expect(formatSignedPercent(20)).toBe('+20%');
    expect(formatSignedPercent(-5)).toBe('-5%');
  });
});

describe('trends', () => {
  it('draws a bar per day for 7 days, including zeros', () => {
    const range = periodRange('7d', TODAY);
    const points = buildTrend('7d', range, salesInRange(TWENTY_ONE_DAYS, range));
    expect(points).toHaveLength(7);
    expect(points[0]?.key).toBe('2026-09-10');
    expect(points[6]?.key).toBe(TODAY);
  });

  it('buckets a year into months', () => {
    const range = periodRange('year', TODAY);
    const points = buildTrend('year', range, TWENTY_ONE_DAYS);
    expect(points).toHaveLength(9);
    expect(points[7]?.key).toBe('2026-08');
    expect(points[8]?.key).toBe('2026-09');
  });
});

describe('margins and cost movers', () => {
  it('ranks active products by margin', () => {
    const products = [
      product('a', 'Product A', 10000, 6900),
      product('b', 'Product B', 10000, 7300),
      product('c', 'No cost', 10000, 0),
    ];
    expect(rankProductMargins(products).map((row) => row.name)).toEqual(['Product A', 'Product B']);
    expect(rankProductMargins(products)[0]?.marginTenths).toBe(310);
  });

  it('keeps the last 10 cost changes and highlights 5% moves', () => {
    const movers = detectCostMovers(
      [
        { id: 'milo', name: 'Milo 400g', currentCostPesewas: 2350 },
        { id: 'milk', name: 'Peak Milk', currentCostPesewas: 2200 },
      ],
      [
        { productId: 'milo', productName: 'Milo 400g', costPesewas: 2280, recordedAt: '2026-08-01' },
        { productId: 'milo', productName: 'Milo 400g', costPesewas: 2350, recordedAt: '2026-09-15' },
        { productId: 'milk', productName: 'Peak Milk', costPesewas: 2000, recordedAt: '2026-08-02' },
        { productId: 'milk', productName: 'Peak Milk', costPesewas: 2200, recordedAt: '2026-09-16' },
      ],
    );

    expect(movers[0]?.productName).toBe('Peak Milk');
    expect(movers[0]?.changeTenths).toBe(100);
    expect(isHighlightedCostChange(movers[0]?.changeTenths ?? 0)).toBe(true);
    expect(formatCostChange(31)).toBe('+3.1%');
    expect(isHighlightedCostChange(31)).toBe(false);
  });
});

function product(
  id: string,
  name: string,
  selling: number,
  cost: number,
): Product {
  return {
    id,
    userId: null,
    name,
    normalizedName: name.toLowerCase(),
    categoryId: null,
    unit: 'pack',
    currentStockThousandths: 0,
    currentCostPesewas: cost,
    currentSellingPesewas: selling,
    isActive: true,
    countedAt: null,
    lastViewedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    deletedAt: null,
  };
}
