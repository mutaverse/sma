import { DEFAULT_CURRENCY_SYMBOL } from '@/constants/config';

const CEDIS_PATTERN = /^-?\d+(\.\d{1,2})?$/;

export function pesewasFromCedisString(input: string): number {
  const trimmed = input.trim().replace(/,/g, '');

  if (!CEDIS_PATTERN.test(trimmed)) {
    throw new Error('Enter a valid amount in cedis, up to two decimal places.');
  }

  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ''] = unsigned.split('.');
  const pesewas = Number.parseInt(wholePart, 10) * 100 + Number.parseInt(fractionPart.padEnd(2, '0'), 10);

  return negative ? -pesewas : pesewas;
}

export function formatPesewas(
  pesewas: number,
  symbol: string = DEFAULT_CURRENCY_SYMBOL,
): string {
  const sign = pesewas < 0 ? '-' : '';
  const absolute = Math.abs(pesewas);
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  const grouped = whole.toLocaleString('en-GH');

  return `${sign}${symbol} ${grouped}.${fraction.toString().padStart(2, '0')}`;
}

export function cedisStringFromPesewas(pesewas: number): string {
  const sign = pesewas < 0 ? '-' : '';
  const absolute = Math.abs(pesewas);
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;

  if (fraction === 0) {
    return `${sign}${whole}`;
  }

  return `${sign}${whole}.${fraction.toString().padStart(2, '0')}`;
}

export function pesewasFromCedisInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const pesewas = pesewasFromCedisString(trimmed);
    return pesewas < 0 ? null : pesewas;
  } catch {
    return null;
  }
}
