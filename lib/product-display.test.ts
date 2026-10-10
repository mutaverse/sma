import { describe, expect, it } from 'vitest';

import { describeUndoLatestPurchase } from '@/lib/product-display';

describe('undo copy', () => {
  it('says what stock and prices will revert to', () => {
    expect(
      describeUndoLatestPurchase(
        {
          unit: 'pack',
          quantityThousandths: 24000,
          nextStockThousandths: 0,
          nextCostPesewas: 2280,
          nextSellingPesewas: 2700,
          clampedToZero: false,
        },
        'GH₵',
      ),
    ).toBe(
      [
        'Remove 24 pack · stock → 0 pack.',
        'Prices → cost GH₵ 22.80 · selling GH₵ 27.00.',
      ].join('\n'),
    );
  });

  it('explains when on-hand is already lower than the purchase', () => {
    expect(
      describeUndoLatestPurchase(
        {
          unit: 'pack',
          quantityThousandths: 24000,
          nextStockThousandths: 0,
          nextCostPesewas: 2280,
          nextSellingPesewas: 2700,
          clampedToZero: true,
        },
        'GH₵',
      ),
    ).toContain('stock → 0 pack');
  });
});
