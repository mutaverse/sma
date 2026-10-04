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
        'This removes 24 pack from on hand.',
        'On hand will be 0 pack.',
        'Cost will go back to GH₵ 22.80.',
        'Selling price will go back to GH₵ 27.00.',
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
    ).toContain('already lower than this purchase');
  });
});
