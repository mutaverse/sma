import { PRODUCT_UNITS, type ProductUnit } from '@/constants/catalog';
import { CSV_COLUMNS } from '@/constants/csv';
import { pesewasFromCedisString } from '@/lib/currency';
import { normalizeName } from '@/lib/normalize';
import { thousandthsFromQuantityString } from '@/lib/quantity';
import type { CreateProductInput } from '@/lib/validation';

export type CsvIssue = {
  row: number;
  name: string;
  reason: string;
};

export type ParsedProductRow = {
  row: number;
  input: CreateProductInput;
};

export type ParsedProductCsv = {
  products: ParsedProductRow[];
  skipped: CsvIssue[];
  failed: CsvIssue[];
};

const HEADER_ALIASES: Record<string, (typeof CSV_COLUMNS)[number]> = {
  name: 'name',
  unit: 'unit',
  category: 'category',
  selling_price: 'selling_price',
  sellingprice: 'selling_price',
  price: 'selling_price',
  cost_price: 'cost_price',
  costprice: 'cost_price',
  cost: 'cost_price',
  on_hand: 'on_hand',
  onhand: 'on_hand',
  stock: 'on_hand',
  quantity: 'on_hand',
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    if (char !== '\r') {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) {
    rows.push(row);
  }

  return rows;
}

function optionalPesewas(value: string, label: string): number {
  if (!value.trim()) {
    return 0;
  }

  const pesewas = pesewasFromCedisString(value);
  if (pesewas < 0) {
    throw new Error(`${label} cannot be negative.`);
  }

  return pesewas;
}

function optionalQuantity(value: string): number {
  if (!value.trim()) {
    return 0;
  }

  return thousandthsFromQuantityString(value);
}

function parseUnit(value: string): ProductUnit {
  const unit = value.trim().toLowerCase();
  if ((PRODUCT_UNITS as readonly string[]).includes(unit)) {
    return unit as ProductUnit;
  }

  throw new Error(`Unit must be one of: ${PRODUCT_UNITS.join(', ')}.`);
}

export function parseProductCsv(
  text: string,
  options: {
    categories: readonly { id: string; name: string }[];
    existingNormalizedNames: Set<string>;
  },
): ParsedProductCsv {
  const table = parseCsv(text);
  if (table.length === 0) {
    throw new Error('This file is empty. Add a header row and at least one product.');
  }

  const header = table[0].map(normalizeHeader);
  const indexByColumn = new Map<(typeof CSV_COLUMNS)[number], number>();

  header.forEach((cell, index) => {
    const canonical = HEADER_ALIASES[cell];
    if (canonical && !indexByColumn.has(canonical)) {
      indexByColumn.set(canonical, index);
    }
  });

  if (indexByColumn.get('name') === undefined || indexByColumn.get('unit') === undefined) {
    throw new Error('This CSV needs a name column and a unit column.');
  }

  const categoryByName = new Map(
    options.categories.map((category) => [normalizeName(category.name), category.id]),
  );
  const seen = new Set(options.existingNormalizedNames);
  const products: ParsedProductRow[] = [];
  const skipped: CsvIssue[] = [];
  const failed: CsvIssue[] = [];

  function cell(row: string[], column: (typeof CSV_COLUMNS)[number]): string {
    const index = indexByColumn.get(column);
    return index === undefined ? '' : (row[index] ?? '');
  }

  table.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;
    const name = cell(row, 'name').trim();

    try {
      if (!name) {
        throw new Error('Enter a product name.');
      }

      const normalized = normalizeName(name);
      if (seen.has(normalized)) {
        skipped.push({ row: rowNumber, name, reason: 'Already in the shop.' });
        return;
      }

      const categoryName = cell(row, 'category').trim();
      let categoryId: string | null = null;
      if (categoryName) {
        const match = categoryByName.get(normalizeName(categoryName));
        if (!match) {
          throw new Error(`Unknown category: ${categoryName}.`);
        }
        categoryId = match;
      }

      const input: CreateProductInput = {
        name,
        unit: parseUnit(cell(row, 'unit')),
        categoryId,
        sellingPricePesewas: optionalPesewas(cell(row, 'selling_price'), 'Selling price'),
        costPricePesewas: optionalPesewas(cell(row, 'cost_price'), 'Cost price'),
        openingStockThousandths: optionalQuantity(cell(row, 'on_hand')),
      };

      seen.add(normalized);
      products.push({ row: rowNumber, input });
    } catch (error) {
      failed.push({
        row: rowNumber,
        name: name || `Row ${rowNumber}`,
        reason: error instanceof Error ? error.message : 'We could not read this row.',
      });
    }
  });

  return { products, skipped, failed };
}
