import { describe, expect, it } from 'vitest';

import {
  addStock,
  calculateExpectedProfit,
  calculateMarginTenths,
  calculateProfitPerUnit,
  calculateUnitCost,
  calculateWeekdayPerformance,
  formatMarginTenths,
  subtractStock,
} from '@/lib/calculations';

describe('purchase math — Milo 400g example', () => {
  const quantity = 24000;
  const totalCost = 56400;
  const selling = 2800;

  it('matches the spec worksheet', () => {
    const unitCost = calculateUnitCost(totalCost, quantity);
    expect(unitCost).toBe(2350);
    expect(calculateProfitPerUnit(selling, unitCost)).toBe(450);
    expect(calculateMarginTenths(selling, unitCost)).toBe(161);
    expect(formatMarginTenths(161)).toBe('16.1%');
    expect(calculateExpectedProfit(quantity, selling, unitCost)).toBe(10800);
  });
});

describe('guards', () => {
  it('rejects zero quantity and zero selling price for margin', () => {
    expect(() => calculateUnitCost(100, 0)).toThrow(/greater than zero/);
    expect(() => calculateMarginTenths(0, 100)).toThrow(/greater than zero/);
  });

  it('rejects negative cost', () => {
    expect(() => calculateUnitCost(-1, 1000)).toThrow(/cannot be negative/);
  });

  it('adds stock and refuses a negative on-hand', () => {
    expect(addStock(24000, 24000)).toBe(48000);
    expect(() => addStock(1000, -2000)).toThrow(/below zero/);
  });

  it('subtracts stock and clamps on-hand at zero', () => {
    expect(subtractStock(24000, 24000)).toEqual({ next: 0, clamped: false });
    expect(subtractStock(18000, 24000)).toEqual({ next: 0, clamped: true });
    expect(subtractStock(48000, 24000)).toEqual({ next: 24000, clamped: false });
  });
});

describe('weekday performance', () => {
  it('averages by weekday, not a single best date', () => {
    const result = calculateWeekdayPerformance([
      { saleDate: '2026-09-07', totalPesewas: 10000 }, // Monday
      { saleDate: '2026-09-14', totalPesewas: 30000 }, // Monday
      { saleDate: '2026-09-08', totalPesewas: 50000 }, // Tuesday
    ]);

    const monday = result.find((row) => row.weekday === 1);
    const tuesday = result.find((row) => row.weekday === 2);
    expect(monday?.averagePesewas).toBe(20000);
    expect(tuesday?.averagePesewas).toBe(50000);
  });
});
