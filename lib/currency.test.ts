import { describe, expect, it } from 'vitest';

import { cedisStringFromPesewas, formatPesewas, pesewasFromCedisInput, pesewasFromCedisString } from '@/lib/currency';

describe('pesewasFromCedisString', () => {
  it('parses whole cedis', () => {
    expect(pesewasFromCedisString('28')).toBe(2800);
    expect(pesewasFromCedisString('564')).toBe(56400);
  });

  it('parses pesewas without floats', () => {
    expect(pesewasFromCedisString('23.50')).toBe(2350);
    expect(pesewasFromCedisString('8,420.00')).toBe(842000);
  });

  it('rejects more than two decimal places', () => {
    expect(() => pesewasFromCedisString('28.555')).toThrow(/two decimal/);
  });

  it('rejects empty and junk', () => {
    expect(() => pesewasFromCedisString('')).toThrow();
    expect(() => pesewasFromCedisString('abc')).toThrow();
  });
});

describe('formatPesewas', () => {
  it('formats with the GH₵ symbol and grouping', () => {
    expect(formatPesewas(2800)).toBe('GH₵ 28.00');
    expect(formatPesewas(842000)).toBe('GH₵ 8,420.00');
    expect(formatPesewas(0)).toBe('GH₵ 0.00');
  });
});

describe('cedisStringFromPesewas', () => {
  it('drops trailing zeros for form fields', () => {
    expect(cedisStringFromPesewas(2800)).toBe('28');
    expect(cedisStringFromPesewas(2350)).toBe('23.50');
  });
});

describe('pesewasFromCedisInput', () => {
  it('returns null for empty, junk, or negative amounts', () => {
    expect(pesewasFromCedisInput('')).toBeNull();
    expect(pesewasFromCedisInput('abc')).toBeNull();
    expect(pesewasFromCedisInput('-10')).toBeNull();
  });

  it('accepts zero and whole cedis', () => {
    expect(pesewasFromCedisInput('0')).toBe(0);
    expect(pesewasFromCedisInput('420')).toBe(42000);
  });
});
