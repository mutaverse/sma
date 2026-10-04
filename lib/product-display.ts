import {
  calculateMarginTenths,
  calculateProfitPerUnit,
  formatMarginTenths,
} from '@/lib/calculations';
import { formatPesewas } from '@/lib/currency';
import { formatQuantity, formatThousandths } from '@/lib/quantity';
import type { Product } from '@/types/domain';

export function formatSellingPrice(product: Product, symbol: string): string {
  if (product.currentSellingPesewas <= 0) {
    return 'No price';
  }

  return formatPesewas(product.currentSellingPesewas, symbol);
}

export function productGlanceMetrics(product: Product, symbol: string) {
  const hasSelling = product.currentSellingPesewas > 0;
  const hasCost = product.currentCostPesewas > 0;
  const profit =
    hasSelling && hasCost
      ? calculateProfitPerUnit(product.currentSellingPesewas, product.currentCostPesewas)
      : null;
  const marginTenths =
    hasSelling && hasCost
      ? calculateMarginTenths(product.currentSellingPesewas, product.currentCostPesewas)
      : null;

  return {
    selling: hasSelling ? formatPesewas(product.currentSellingPesewas, symbol) : 'No selling price yet',
    cost: hasCost ? formatPesewas(product.currentCostPesewas, symbol) : 'No cost yet',
    profit: profit === null ? '—' : formatPesewas(profit, symbol),
    margin: marginTenths === null ? '—' : formatMarginTenths(marginTenths),
    marginTone: marginTenths === null ? null : marginTenths < 0 ? 'negative' : 'positive',
    stock: formatQuantity(product.currentStockThousandths, product.unit),
  };
}

export function describeUndoLatestPurchase(
  input: {
    unit: string;
    quantityThousandths: number;
    nextStockThousandths: number;
    nextCostPesewas: number;
    nextSellingPesewas: number;
    clampedToZero: boolean;
  },
  symbol: string,
): string {
  const removed = `${formatThousandths(input.quantityThousandths)} ${input.unit}`;
  const nextStock = formatQuantity(input.nextStockThousandths, input.unit);
  const cost =
    input.nextCostPesewas > 0 ? formatPesewas(input.nextCostPesewas, symbol) : 'no cost yet';
  const selling =
    input.nextSellingPesewas > 0
      ? formatPesewas(input.nextSellingPesewas, symbol)
      : 'no selling price yet';

  const lines = [
    input.clampedToZero
      ? `On hand is already lower than this purchase, so it will go to 0 ${input.unit}.`
      : `This removes ${removed} from on hand.`,
    `On hand will be ${nextStock}.`,
    `Cost will go back to ${cost}.`,
    `Selling price will go back to ${selling}.`,
  ];

  return lines.join('\n');
}
