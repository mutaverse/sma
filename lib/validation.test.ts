import { describe, expect, it } from 'vitest';

import { createProductSchema, recordPurchaseSchema } from '@/lib/validation';

describe('validation', () => {
  it('blocks a purchase with zero selling price', () => {
    const result = recordPurchaseSchema.safeParse({
      productId: '11111111-1111-4111-8111-111111111111',
      quantityThousandths: 1000,
      totalCostPesewas: 100,
      sellingPricePesewas: 0,
      purchaseDate: '2026-09-15',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid purchase', () => {
    const result = recordPurchaseSchema.safeParse({
      productId: '11111111-1111-4111-8111-111111111111',
      quantityThousandths: 24000,
      totalCostPesewas: 56400,
      sellingPricePesewas: 2800,
      purchaseDate: '2026-09-15',
    });
    expect(result.success).toBe(true);
  });

  it('requires a product name', () => {
    const result = createProductSchema.safeParse({
      name: '   ',
      unit: 'pack',
      categoryId: null,
      sellingPricePesewas: 0,
      costPricePesewas: 0,
      openingStockThousandths: 0,
    });
    expect(result.success).toBe(false);
  });
});
