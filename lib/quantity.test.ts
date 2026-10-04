import { describe, expect, it } from 'vitest';

import { formatQuantity, formatThousandths, thousandthsFromQuantityString } from '@/lib/quantity';

describe('quantity', () => {
  it('parses whole and decimal quantities', () => {
    expect(thousandthsFromQuantityString('24')).toBe(24000);
    expect(thousandthsFromQuantityString('1.5')).toBe(1500);
    expect(thousandthsFromQuantityString('0.001')).toBe(1);
  });

  it('rejects zero, negative, and extra decimals', () => {
    expect(thousandthsFromQuantityString('0')).toBe(0);
    expect(() => thousandthsFromQuantityString('-1')).toThrow();
    expect(() => thousandthsFromQuantityString('1.2345')).toThrow();
  });

  it('formats with the product unit', () => {
    expect(formatThousandths(24000)).toBe('24');
    expect(formatThousandths(1500)).toBe('1.5');
    expect(formatQuantity(24000, 'pack')).toBe('24 pack');
  });
});
