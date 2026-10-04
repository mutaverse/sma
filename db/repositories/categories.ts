import type { DbClient } from '@/db/client';
import { mapCategory } from '@/db/mappers';
import { enqueueSyncEvent } from '@/db/repositories/sync-queue';
import { nowIso } from '@/lib/dates';
import { createId } from '@/lib/id';
import type { CategoryRecord } from '@/types/database';
import type { Category } from '@/types/domain';

export async function listCategories(db: DbClient): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRecord>(
    `SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE`,
  );
  return rows.map(mapCategory);
}

async function requireUniqueCategoryName(db: DbClient, name: string, exceptId?: string): Promise<void> {
  const row = exceptId
    ? await db.getFirstAsync<CategoryRecord>(
        `SELECT * FROM categories
         WHERE deleted_at IS NULL AND id != ? AND lower(name) = lower(?)
         LIMIT 1`,
        [exceptId, name],
      )
    : await db.getFirstAsync<CategoryRecord>(
        `SELECT * FROM categories
         WHERE deleted_at IS NULL AND lower(name) = lower(?)
         LIMIT 1`,
        [name],
      );

  if (row) {
    throw new Error('You already have a category with that name.');
  }
}

export async function createCategory(db: DbClient, name: string): Promise<Category> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Enter a category name.');
  }

  await requireUniqueCategoryName(db, trimmed);

  const id = createId();
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO categories (id, user_id, name, created_at, updated_at, deleted_at)
       VALUES (?, NULL, ?, ?, ?, NULL)`,
      [id, trimmed, timestamp, timestamp],
    );
    await enqueueSyncEvent(db, {
      entityType: 'category',
      entityId: id,
      operation: 'category.upsert',
      payload: { id, name: trimmed },
    });
  });

  const row = await db.getFirstAsync<CategoryRecord>('SELECT * FROM categories WHERE id = ?', [id]);
  if (!row) {
    throw new Error('We could not save this category. Please try again.');
  }
  return mapCategory(row);
}

export async function renameCategory(db: DbClient, id: string, name: string): Promise<Category> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Enter a category name.');
  }

  await requireUniqueCategoryName(db, trimmed, id);
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `UPDATE categories SET name = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
      [trimmed, timestamp, id],
    );
    if (result.changes === 0) {
      throw new Error('We could not find that category.');
    }
    await enqueueSyncEvent(db, {
      entityType: 'category',
      entityId: id,
      operation: 'category.upsert',
      payload: { id, name: trimmed },
    });
  });

  const row = await db.getFirstAsync<CategoryRecord>('SELECT * FROM categories WHERE id = ?', [id]);
  if (!row) {
    throw new Error('We could not save this category. Please try again.');
  }
  return mapCategory(row);
}

export async function countProductsUsingCategory(db: DbClient, categoryId: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM products WHERE category_id = ? AND deleted_at IS NULL`,
    [categoryId],
  );
  return Number(row?.count ?? 0);
}

export async function listCategoryUsage(db: DbClient): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ category_id: string; count: number }>(
    `SELECT category_id, COUNT(*) AS count
     FROM products
     WHERE deleted_at IS NULL AND category_id IS NOT NULL
     GROUP BY category_id`,
  );
  return Object.fromEntries(rows.map((row) => [row.category_id, Number(row.count)]));
}

export async function deleteCategory(db: DbClient, id: string): Promise<void> {
  const used = await countProductsUsingCategory(db, id);
  if (used > 0) {
    throw new Error(
      used === 1
        ? 'This category is still used by 1 product.'
        : `This category is still used by ${used} products.`,
    );
  }

  const timestamp = nowIso();
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
      [timestamp, timestamp, id],
    );
    if (result.changes === 0) {
      throw new Error('We could not find that category.');
    }
    await enqueueSyncEvent(db, {
      entityType: 'category',
      entityId: id,
      operation: 'category.upsert',
      payload: { id, deleted: true },
    });
  });
}
