import { describe, expect, it } from 'vitest';

import { calculateMomoCommission } from '@/lib/momo';

const cedis = (value: number) => Math.round(value * 100);

describe('MOMO commission', () => {
  it('takes 10% for airtime', () => {
    expect(calculateMomoCommission('airtime', cedis(10))).toBe(cedis(1));
    expect(calculateMomoCommission('airtime', cedis(25))).toBe(cedis(2.5));
  });

  it('uses 50-cedi bands for cash in below 1000', () => {
    expect(calculateMomoCommission('cash_in', cedis(50))).toBe(cedis(0.5));
    expect(calculateMomoCommission('cash_in', cedis(50.01))).toBe(cedis(1));
    expect(calculateMomoCommission('cash_in', cedis(150))).toBe(cedis(1.5));
    expect(calculateMomoCommission('cash_in', cedis(200))).toBe(cedis(2));
    expect(calculateMomoCommission('cash_in', cedis(999))).toBe(cedis(10));
  });

  it('takes 1% for cash in from 1000 upwards', () => {
    expect(calculateMomoCommission('cash_in', cedis(1000))).toBe(cedis(10));
    expect(calculateMomoCommission('cash_in', cedis(1250))).toBe(cedis(12.5));
  });

  it('takes 40% of the provider cash-out charge', () => {
    expect(calculateMomoCommission('cash_out', cedis(50))).toBe(cedis(0.2));
    expect(calculateMomoCommission('cash_out', cedis(100))).toBe(cedis(0.4));
    expect(calculateMomoCommission('cash_out', cedis(250))).toBe(cedis(1));
  });
});
