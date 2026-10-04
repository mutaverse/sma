const QUANTITY_PATTERN = /^\d+(\.\d{1,3})?$/;

export function thousandthsFromQuantityString(input: string): number {
  const trimmed = input.trim();

  if (!QUANTITY_PATTERN.test(trimmed)) {
    throw new Error('Enter a quantity of at least 0.001, up to three decimal places.');
  }

  const [wholePart, fractionPart = ''] = trimmed.split('.');
  return Number.parseInt(wholePart, 10) * 1000 + Number.parseInt(fractionPart.padEnd(3, '0'), 10);
}

export function formatThousandths(thousandths: number): string {
  if (thousandths < 0) {
    throw new Error('Quantity cannot be negative.');
  }

  const whole = Math.floor(thousandths / 1000);
  const fraction = thousandths % 1000;

  if (fraction === 0) {
    return String(whole);
  }

  return `${whole}.${fraction.toString().padStart(3, '0').replace(/0+$/, '')}`;
}

export function formatQuantity(thousandths: number, unit: string): string {
  return `${formatThousandths(thousandths)} ${unit}`;
}
