import {
  calculateExpectedProfit,
  calculateMarginTenths,
  calculateProfitPerUnit,
  calculateUnitCost,
} from '@/lib/calculations';
import { pesewasFromCedisString } from '@/lib/currency';
import { thousandthsFromQuantityString } from '@/lib/quantity';

export type PurchasePreview = {
  quantityThousandths: number;
  totalCostPesewas: number;
  sellingPricePesewas: number;
  unitCostPesewas: number;
  profitPesewas: number;
  marginTenths: number;
  expectedProfitPesewas: number;
};

export function previewPurchase(
  quantity: string,
  totalCost: string,
  sellingPrice: string,
): PurchasePreview {
  const quantityThousandths = thousandthsFromQuantityString(quantity);
  if (quantityThousandths <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  const totalCostPesewas = pesewasFromCedisString(totalCost);
  if (totalCostPesewas < 0) {
    throw new Error('Total cost cannot be negative.');
  }

  const sellingPricePesewas = pesewasFromCedisString(sellingPrice);
  if (sellingPricePesewas <= 0) {
    throw new Error('Selling price must be greater than zero.');
  }

  const unitCostPesewas = calculateUnitCost(totalCostPesewas, quantityThousandths);
  const profitPesewas = calculateProfitPerUnit(sellingPricePesewas, unitCostPesewas);
  const marginTenths = calculateMarginTenths(sellingPricePesewas, unitCostPesewas);
  const expectedProfitPesewas = calculateExpectedProfit(
    quantityThousandths,
    sellingPricePesewas,
    unitCostPesewas,
  );

  return {
    quantityThousandths,
    totalCostPesewas,
    sellingPricePesewas,
    unitCostPesewas,
    profitPesewas,
    marginTenths,
    expectedProfitPesewas,
  };
}

export function tryPreviewPurchase(
  quantity: string,
  totalCost: string,
  sellingPrice: string,
): PurchasePreview | null {
  if (!quantity.trim() || !totalCost.trim() || !sellingPrice.trim()) {
    return null;
  }

  try {
    return previewPurchase(quantity, totalCost, sellingPrice);
  } catch {
    return null;
  }
}
