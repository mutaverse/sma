import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { DomainError, userMessage } from '@/lib/errors';
import { upsertDailySalesSchema } from '@/lib/validation';

describe('user facing errors', () => {
  it('keeps messages written for the shop', () => {
    expect(userMessage(new Error("Enter the day's sales."), 'Try again.')).toBe(
      "Enter the day's sales.",
    );
    expect(userMessage(new DomainError('We could not find that product.'), 'Try again.')).toBe(
      'We could not find that product.',
    );
    expect(userMessage(new z.ZodError([]), 'Try again.')).toBe('Try again.');
  });

  it('hides database and validation internals', () => {
    expect(
      userMessage(new Error('UNIQUE constraint failed: daily_sales.sale_date'), 'Please try again.'),
    ).toBe('Please try again.');
    expect(
      userMessage(new Error('database is locked'), 'Please try again.'),
    ).toBe('Please try again.');

    const parsed = upsertDailySalesSchema.safeParse({
      saleDate: '2026-02-31',
      totalSalesPesewas: 100,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(userMessage(parsed.error, 'Please try again.')).toBe('Enter a valid date.');
    }
  });
});
