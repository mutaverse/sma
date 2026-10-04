export class CalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculationError';
  }
}

export function calculateUnitCost(totalCostPesewas: number, quantityThousandths: number): number {
  if (quantityThousandths <= 0) {
    throw new CalculationError('Quantity must be greater than zero.');
  }

  if (totalCostPesewas < 0) {
    throw new CalculationError('Total cost cannot be negative.');
  }

  return Math.round((totalCostPesewas * 1000) / quantityThousandths);
}

export function calculateProfitPerUnit(sellingPricePesewas: number, unitCostPesewas: number): number {
  return sellingPricePesewas - unitCostPesewas;
}

/** Tenths of a percent. 161 = 16.1%. */
export function calculateMarginTenths(sellingPricePesewas: number, unitCostPesewas: number): number {
  if (sellingPricePesewas <= 0) {
    throw new CalculationError('Selling price must be greater than zero to calculate margin.');
  }

  return Math.round(((sellingPricePesewas - unitCostPesewas) * 1000) / sellingPricePesewas);
}

export function formatMarginTenths(tenths: number): string {
  const sign = tenths < 0 ? '-' : '';
  const absolute = Math.abs(tenths);
  const whole = Math.floor(absolute / 10);
  const fraction = absolute % 10;
  return `${sign}${whole}.${fraction}%`;
}

export function calculateExpectedProfit(
  quantityThousandths: number,
  sellingPricePesewas: number,
  unitCostPesewas: number,
): number {
  if (quantityThousandths <= 0) {
    throw new CalculationError('Quantity must be greater than zero.');
  }

  return Math.round(((sellingPricePesewas - unitCostPesewas) * quantityThousandths) / 1000);
}

export function addStock(currentThousandths: number, incomingThousandths: number): number {
  const next = currentThousandths + incomingThousandths;

  if (next < 0) {
    throw new CalculationError('On-hand stock cannot go below zero.');
  }

  return next;
}

export function subtractStock(
  currentThousandths: number,
  outgoingThousandths: number,
): { next: number; clamped: boolean } {
  const next = currentThousandths - outgoingThousandths;
  if (next < 0) {
    return { next: 0, clamped: true };
  }

  return { next, clamped: false };
}

export function calculateAverageDailySales(salesPesewas: readonly number[]): number | null {
  if (salesPesewas.length === 0) {
    return null;
  }

  const total = salesPesewas.reduce((sum, value) => sum + value, 0);
  return Math.round(total / salesPesewas.length);
}

export type WeekdayAverage = {
  weekday: number;
  averagePesewas: number;
  sampleSize: number;
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? 'Unknown';
}

/** weekday is JS getUTCDay(): 0 Sunday … 6 Saturday. Dates are Accra calendar dates. */
export function calculateWeekdayPerformance(
  sales: readonly { saleDate: string; totalPesewas: number }[],
): WeekdayAverage[] {
  const buckets = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));

  for (const sale of sales) {
    const [year, month, day] = sale.saleDate.split('-').map((part) => Number.parseInt(part, 10));
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    buckets[weekday].total += sale.totalPesewas;
    buckets[weekday].count += 1;
  }

  return buckets.map((bucket, weekday) => ({
    weekday,
    averagePesewas: bucket.count === 0 ? 0 : Math.round(bucket.total / bucket.count),
    sampleSize: bucket.count,
  }));
}
