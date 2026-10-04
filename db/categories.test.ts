import { describe, expect, it } from 'vitest';

import { migrate } from '@/db/migrate';
import { createNodeSqliteClient } from '@/db/node-sqlite';
import {
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
} from '@/db/repositories/categories';
import { createProduct } from '@/db/repositories/products';

async function setup() {
  const db = createNodeSqliteClient();
  await migrate(db);
  return db;
}

describe('categories', () => {
  it('blocks duplicate names and rename clashes', async () => {
    const db = await setup();
    await expect(createCategory(db, 'Food')).rejects.toThrow(/already have a category/i);

    const custom = await createCategory(db, 'Bakery');
    await expect(renameCategory(db, custom.id, 'food')).rejects.toThrow(/already have a category/i);

    const renamed = await renameCategory(db, custom.id, 'Bread');
    expect(renamed.name).toBe('Bread');
  });

  it('deletes unused categories and refuses ones still in use', async () => {
    const db = await setup();
    const custom = await createCategory(db, 'Bakery');

    await createProduct(db, {
      name: 'Sugar bread',
      unit: 'piece',
      categoryId: custom.id,
      sellingPricePesewas: 500,
      costPricePesewas: 0,
      openingStockThousandths: 0,
    });

    await expect(deleteCategory(db, custom.id)).rejects.toThrow(/still used/i);

    const empty = await createCategory(db, 'Frozen');
    await deleteCategory(db, empty.id);
    const remaining = await listCategories(db);
    expect(remaining.some((category) => category.id === empty.id)).toBe(false);
    expect(remaining.some((category) => category.id === custom.id)).toBe(true);
  });
});
