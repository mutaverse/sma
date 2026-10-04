import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES } from '@/constants/catalog';
import { migrate } from '@/db/migrate';
import { createNodeSqliteClient } from '@/db/node-sqlite';
import {
  createProduct,
  hideProduct,
  importCsvProducts,
  listCatalog,
  listRecentProducts,
  listRecentlyViewedProducts,
  countActiveProducts,
  markProductViewed,
  searchProducts,
  unhideProduct,
} from '@/db/repositories/products';
import { CSV_TEMPLATE } from '@/constants/csv';

async function setup() {
  const db = createNodeSqliteClient();
  await migrate(db);
  return db;
}

describe('product search', () => {
  it('matches prefix, case, and word starts, and hides inactive products', async () => {
    const db = await setup();

    const milo = await createProduct(db, {
      name: 'Milo 400g',
      unit: 'pack',
      categoryId: null,
      sellingPricePesewas: 2800,
      costPricePesewas: 2350,
      openingStockThousandths: 24000,
    });
    await createProduct(db, {
      name: 'Cowbell tin',
      unit: 'piece',
      categoryId: null,
      sellingPricePesewas: 800,
      costPricePesewas: 0,
      openingStockThousandths: 0,
    });
    const hidden = await createProduct(db, {
      name: 'Milo sachet',
      unit: 'pack',
      categoryId: null,
      sellingPricePesewas: 250,
      costPricePesewas: 0,
      openingStockThousandths: 0,
    });
    await hideProduct(db, hidden.id);

    const byPrefix = await searchProducts(db, 'mi');
    expect(byPrefix.map((product) => product.name)).toEqual(['Milo 400g']);

    const byCase = await searchProducts(db, 'MILO');
    expect(byCase.map((product) => product.name)).toEqual(['Milo 400g']);

    const byWord = await searchProducts(db, '400');
    expect(byWord.map((product) => product.id)).toEqual([milo.id]);

    await markProductViewed(db, milo.id);
    const recent = await listRecentProducts(db, 10);
    expect(recent[0]?.id).toBe(milo.id);
    expect(recent.some((product) => product.id === hidden.id)).toBe(false);
  });

  it('lists only products that have been opened', async () => {
    const db = await setup();
    const milo = await createProduct(db, {
      name: 'Milo 400g',
      unit: 'pack',
      categoryId: null,
      sellingPricePesewas: 2800,
      costPricePesewas: 0,
      openingStockThousandths: 0,
    });
    await createProduct(db, {
      name: 'Cowbell tin',
      unit: 'piece',
      categoryId: null,
      sellingPricePesewas: 800,
      costPricePesewas: 0,
      openingStockThousandths: 0,
    });

    expect(await countActiveProducts(db)).toBe(2);
    expect(await listRecentlyViewedProducts(db)).toEqual([]);

    await markProductViewed(db, milo.id);
    const viewed = await listRecentlyViewedProducts(db);
    expect(viewed.map((product) => product.id)).toEqual([milo.id]);
  });
});

describe('stock catalog', () => {
  it('composes category, search, sort, and hidden', async () => {
    const db = await setup();
    const food = DEFAULT_CATEGORIES.find((category) => category.name === 'Food');
    if (!food) {
      throw new Error('Food category missing from seed');
    }

    const milo = await createProduct(db, {
      name: 'Milo 400g',
      unit: 'pack',
      categoryId: food.id,
      sellingPricePesewas: 2800,
      costPricePesewas: 2350,
      openingStockThousandths: 0,
    });
    await createProduct(db, {
      name: 'Cowbell tin',
      unit: 'piece',
      categoryId: null,
      sellingPricePesewas: 800,
      costPricePesewas: 0,
      openingStockThousandths: 0,
    });
    const hidden = await createProduct(db, {
      name: 'Milo sachet',
      unit: 'pack',
      categoryId: food.id,
      sellingPricePesewas: 250,
      costPricePesewas: 0,
      openingStockThousandths: 0,
    });
    await hideProduct(db, hidden.id);

    const foodOnly = await listCatalog(db, { category: food.id, sort: 'name' });
    expect(foodOnly.map((product) => product.name)).toEqual(['Milo 400g']);

    const uncategorized = await listCatalog(db, { category: 'uncategorized', sort: 'name' });
    expect(uncategorized.map((product) => product.name)).toEqual(['Cowbell tin']);

    const foodSearch = await listCatalog(db, { query: 'milo', category: food.id });
    expect(foodSearch.map((product) => product.id)).toEqual([milo.id]);

    const byName = await listCatalog(db, { sort: 'name' });
    expect(byName.map((product) => product.name)).toEqual(['Cowbell tin', 'Milo 400g']);

    const hiddenFood = await listCatalog(db, { scope: 'hidden', category: food.id, query: 'milo' });
    expect(hiddenFood.map((product) => product.id)).toEqual([hidden.id]);

    await unhideProduct(db, hidden.id);
    const afterUnhide = await listCatalog(db, { query: 'sachet' });
    expect(afterUnhide.map((product) => product.id)).toEqual([hidden.id]);
  });
});

describe('csv import', () => {
  it('creates products and reports skipped duplicates', async () => {
    const db = await setup();
    const first = await importCsvProducts(db, CSV_TEMPLATE);
    expect(first.imported).toBe(2);
    expect(first.failed).toHaveLength(0);

    const second = await importCsvProducts(db, CSV_TEMPLATE);
    expect(second.imported).toBe(0);
    expect(second.skipped).toHaveLength(2);

    const found = await searchProducts(db, 'milo');
    expect(found.map((product) => product.name)).toEqual(expect.arrayContaining(['Milo 400g', 'Milo 1kg']));
    expect(found).toHaveLength(2);
  });
});
