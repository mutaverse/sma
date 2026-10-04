import {
  calculateAverageDailySales,
  calculateMarginTenths,
  calculateWeekdayPerformance,
  formatMarginTenths,
  weekdayName,
  type WeekdayAverage,
} from '@/lib/calculations';
import { addCalendarDays, isCalendarDate } from '@/lib/dates';
import type { DailySale, Product } from '@/types/domain';

export const WEEKDAY_MIN_DAYS = 14;
export const TRAILING_AVERAGE_DAYS = 30;
export const COST_CHANGE_HIGHLIGHT_TENTHS = 50;
export const TOP_MARGINS_LIMIT = 8;
export const COST_MOVERS_LIMIT = 10;

export type InsightPeriod = '7d' | '30d' | 'month' | 'year';

export type DateRange = {
  start: string;
  end: string;
};

export type TrendPoint = {
  key: string;
  label: string;
  totalPesewas: number;
};

export type ProductMargin = {
  productId: string;
  name: string;
  marginTenths: number;
};

export type CostHistoryPoint = {
  productId: string;
  productName: string;
  costPesewas: number;
  recordedAt: string;
};

export type CostMover = {
  productId: string;
  productName: string;
  previousCostPesewas: number;
  currentCostPesewas: number;
  changeTenths: number;
  recordedAt: string;
};

export function periodRange(period: InsightPeriod, today: string): DateRange {
  if (!isCalendarDate(today)) {
    throw new Error('Enter a valid date.');
  }

  if (period === '7d') {
    return { start: addCalendarDays(today, -6), end: today };
  }
  if (period === '30d') {
    return { start: addCalendarDays(today, -(TRAILING_AVERAGE_DAYS - 1)), end: today };
  }
  if (period === 'month') {
    return { start: `${today.slice(0, 7)}-01`, end: today };
  }
  return { start: `${today.slice(0, 4)}-01-01`, end: today };
}

export function periodTitle(period: InsightPeriod): string {
  if (period === '7d') {
    return 'Last 7 days';
  }
  if (period === '30d') {
    return 'Last 30 days';
  }
  if (period === 'month') {
    return 'This month';
  }
  return 'This year';
}

export function salesInRange(sales: readonly DailySale[], range: DateRange): DailySale[] {
  return sales.filter((sale) => sale.saleDate >= range.start && sale.saleDate <= range.end);
}

export function trailingAveragePesewas(
  sales: readonly DailySale[],
  today: string,
): number | null {
  const start = addCalendarDays(today, -(TRAILING_AVERAGE_DAYS - 1));
  const recorded = salesInRange(sales, { start, end: today }).filter(
    (sale) => sale.saleDate !== today,
  );
  return calculateAverageDailySales(recorded.map((sale) => sale.totalPesewas));
}

export function calculateVsAveragePercent(
  todayPesewas: number,
  averagePesewas: number,
): number | null {
  if (averagePesewas <= 0) {
    return null;
  }

  return Math.round(((todayPesewas - averagePesewas) * 100) / averagePesewas);
}

export function formatSignedPercent(percent: number): string {
  if (percent > 0) {
    return `+${percent}%`;
  }
  return `${percent}%`;
}

export function eachCalendarDate(start: string, end: string): string[] {
  if (start > end) {
    return [];
  }

  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return dates;
}

export function pickWeekdayExtremes(
  sales: readonly DailySale[],
  minDays: number = WEEKDAY_MIN_DAYS,
): { best: WeekdayAverage; lowest: WeekdayAverage } | null {
  if (sales.length < minDays) {
    return null;
  }

  const withData = calculateWeekdayPerformance(sales).filter((row) => row.sampleSize > 0);
  if (withData.length < 2) {
    return null;
  }

  let best = withData[0];
  let lowest = withData[0];
  for (const row of withData) {
    if (row.averagePesewas > best.averagePesewas) {
      best = row;
    }
    if (row.averagePesewas < lowest.averagePesewas) {
      lowest = row;
    }
  }

  if (best.weekday === lowest.weekday) {
    return null;
  }

  return { best, lowest };
}

export function weekdayLabel(weekday: number): string {
  return weekdayName(weekday);
}

function mondayOf(calendarDate: string): string {
  const [year, month, day] = calendarDate.split('-').map((part) => Number.parseInt(part, 10));
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addCalendarDays(calendarDate, offset);
}

function dayNumber(calendarDate: string): string {
  return String(Number.parseInt(calendarDate.slice(8, 10), 10));
}

function monthShort(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map((part) => Number.parseInt(part, 10));
  return new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

function weekdayShort(calendarDate: string): string {
  const [year, month, day] = calendarDate.split('-').map((part) => Number.parseInt(part, 10));
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function buildTrend(
  period: InsightPeriod,
  range: DateRange,
  sales: readonly DailySale[],
): TrendPoint[] {
  const totals = new Map<string, number>();
  for (const sale of salesInRange(sales, range)) {
    totals.set(sale.saleDate, sale.totalPesewas);
  }

  if (period === 'year') {
    const year = range.end.slice(0, 4);
    const lastMonth = Number.parseInt(range.end.slice(5, 7), 10);
    const points: TrendPoint[] = [];
    for (let month = 1; month <= lastMonth; month += 1) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const totalPesewas = salesInRange(sales, range)
        .filter((sale) => sale.saleDate.startsWith(key))
        .reduce((sum, sale) => sum + sale.totalPesewas, 0);
      points.push({ key, label: monthShort(key), totalPesewas });
    }
    return points;
  }

  if (period === '30d') {
    const points: TrendPoint[] = [];
    let cursor = mondayOf(range.start);
    const lastMonday = mondayOf(range.end);
    while (cursor <= lastMonday) {
      const weekEnd = addCalendarDays(cursor, 6);
      const start = cursor < range.start ? range.start : cursor;
      const end = weekEnd > range.end ? range.end : weekEnd;
      const totalPesewas = salesInRange(sales, { start, end }).reduce(
        (sum, sale) => sum + sale.totalPesewas,
        0,
      );
      points.push({ key: cursor, label: dayNumber(cursor), totalPesewas });
      cursor = addCalendarDays(cursor, 7);
    }
    return points;
  }

  return eachCalendarDate(range.start, range.end).map((date) => ({
    key: date,
    label: period === '7d' ? weekdayShort(date) : dayNumber(date),
    totalPesewas: totals.get(date) ?? 0,
  }));
}

export function periodTotals(sales: readonly DailySale[]): {
  totalPesewas: number;
  averagePesewas: number | null;
  recordedDays: number;
} {
  const recordedDays = sales.length;
  const totalPesewas = sales.reduce((sum, sale) => sum + sale.totalPesewas, 0);
  return {
    totalPesewas,
    averagePesewas: calculateAverageDailySales(sales.map((sale) => sale.totalPesewas)),
    recordedDays,
  };
}

export function rankProductMargins(
  products: readonly Product[],
  limit: number = TOP_MARGINS_LIMIT,
): ProductMargin[] {
  return products
    .filter((product) => product.currentSellingPesewas > 0 && product.currentCostPesewas > 0)
    .map((product) => ({
      productId: product.id,
      name: product.name,
      marginTenths: calculateMarginTenths(
        product.currentSellingPesewas,
        product.currentCostPesewas,
      ),
    }))
    .sort((left, right) => right.marginTenths - left.marginTenths)
    .slice(0, limit);
}

export function detectCostMovers(
  products: readonly { id: string; name: string; currentCostPesewas: number }[],
  history: readonly CostHistoryPoint[],
  limit: number = COST_MOVERS_LIMIT,
): CostMover[] {
  const movers: CostMover[] = [];

  for (const product of products) {
    if (product.currentCostPesewas <= 0) {
      continue;
    }

    const rows = history.filter((point) => point.productId === product.id);
    const previous = [...rows]
      .filter((point) => point.costPesewas > 0 && point.costPesewas !== product.currentCostPesewas)
      .sort((left, right) => (left.recordedAt < right.recordedAt ? 1 : -1))[0];

    if (!previous) {
      continue;
    }

    const currentEvent = [...rows]
      .filter((point) => point.costPesewas === product.currentCostPesewas)
      .sort((left, right) => (left.recordedAt < right.recordedAt ? 1 : -1))[0];

    movers.push({
      productId: product.id,
      productName: product.name,
      previousCostPesewas: previous.costPesewas,
      currentCostPesewas: product.currentCostPesewas,
      changeTenths: Math.round(
        ((product.currentCostPesewas - previous.costPesewas) * 1000) / previous.costPesewas,
      ),
      recordedAt: currentEvent?.recordedAt ?? previous.recordedAt,
    });
  }

  return movers
    .sort((left, right) => (left.recordedAt < right.recordedAt ? 1 : -1))
    .slice(0, limit);
}

export function formatCostChange(changeTenths: number): string {
  const formatted = formatMarginTenths(changeTenths);
  if (changeTenths > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

export function isHighlightedCostChange(changeTenths: number): boolean {
  return Math.abs(changeTenths) >= COST_CHANGE_HIGHLIGHT_TENTHS;
}
