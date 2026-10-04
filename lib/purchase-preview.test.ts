import { describe, expect, it } from 'vitest';

import { formatMarginTenths } from '@/lib/calculations';
import { formatPesewas } from '@/lib/currency';
import { previewPurchase } from '@/lib/purchase-preview';
import { formatThousandths } from '@/lib/quantity';

describe('purchase preview — Milo 400g worksheet', () => {
  it('matches spec §11 from the form strings', () => {
    const preview = previewPurchase('24', '564', '28');

    expect(preview.quantityThousandths).toBe(24000);
    expect(preview.totalCostPesewas).toBe(56400);
    expect(preview.sellingPricePesewas).toBe(2800);
    expect(preview.unitCostPesewas).toBe(2350);
    expect(preview.profitPesewas).toBe(450);
    expect(preview.marginTenths).toBe(161);
    expect(preview.expectedProfitPesewas).toBe(10800);

    expect(formatPesewas(preview.unitCostPesewas)).toBe('GH₵ 23.50');
    expect(formatPesewas(preview.profitPesewas)).toBe('GH₵ 4.50');
    expect(formatMarginTenths(preview.marginTenths)).toBe('16.1%');
    expect(formatPesewas(preview.expectedProfitPesewas)).toBe('GH₵ 108.00');
    expect(formatThousandths(preview.quantityThousandths)).toBe('24');
  });

  it('rejects zero quantity and zero selling price', () => {
    expect(() => previewPurchase('0', '564', '28')).toThrow(/greater than zero/);
    expect(() => previewPurchase('24', '564', '0')).toThrow(/greater than zero/);
  });
});
