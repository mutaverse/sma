import { describe, expect, it } from 'vitest';

import { CSV_TEMPLATE } from '@/constants/csv';
import { parseCsv, parseProductCsv } from '@/lib/csv';

const categories = [{ id: '7c2f1a90-4b6e-4d11-9f3a-000000000002', name: 'Food' }];

describe('parseCsv', () => {
  it('reads quoted commas', () => {
    const rows = parseCsv('name,unit\n"Milo, 400g",pack\n');
    expect(rows[1]).toEqual(['Milo, 400g', 'pack']);
  });
});

describe('parseProductCsv', () => {
  it('imports the template rows', () => {
    const parsed = parseProductCsv(CSV_TEMPLATE, {
      categories,
      existingNormalizedNames: new Set(),
    });

    expect(parsed.failed).toEqual([]);
    expect(parsed.products).toHaveLength(2);
    expect(parsed.products[0]?.input).toMatchObject({
      name: 'Milo 400g',
      unit: 'pack',
      sellingPricePesewas: 2800,
      costPricePesewas: 2350,
      openingStockThousandths: 24000,
    });
  });

  it('skips names already in the shop and fails unknown units', () => {
    const parsed = parseProductCsv(
      `name,unit,selling_price
Milo 400g,pack,28.00
Ghost,carton,1.00
`,
      {
        categories,
        existingNormalizedNames: new Set(['milo 400g']),
      },
    );

    expect(parsed.skipped[0]?.reason).toMatch(/already in the shop/i);
    expect(parsed.failed[0]?.reason).toMatch(/unit/i);
    expect(parsed.products).toHaveLength(0);
  });
});
