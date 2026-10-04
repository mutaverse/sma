import type { DbClient, SqlValue } from '@/db/client';
import { mapProduct } from '@/db/mappers';
import { listCategories } from '@/db/repositories/categories';
import { enqueueSyncEvent } from '@/db/repositories/sync-queue';
import { parseProductCsv, type CsvIssue } from '@/lib/csv';
import { DomainError, userMessage } from '@/lib/errors';
import { nowIso } from '@/lib/dates';
import { createId } from '@/lib/id';
import { normalizeName } from '@/lib/normalize';
import { createProductSchema, type CreateProductInput } from '@/lib/validation';
import type { ProductRecord } from '@/types/database';
import type { Product } from '@/types/domain';

export type CatalogScope = 'active' | 'hidden';
export type CategoryFilter = 'all' | 'uncategorized' | (string & {});
export type CatalogSort = 'recent' | 'name';

export type CatalogOptions = {
  query?: string;
  scope?: CatalogScope;
  category?: CategoryFilter;
  sort?: CatalogSort;
  limit?: number;
  viewedOnly?: boolean;
};

export async function getProduct(db: DbClient, id: string): Promise<Product | null> {
  const row = await db.getFirstAsync<ProductRecord>(
    'SELECT * FROM products WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  return row ? mapProduct(row) : null;
}

export async function requireProduct(db: DbClient, id: string): Promise<Product> {
  const product = await getProduct(db, id);
  if (!product) {
    throw new DomainError('We could not find that product.');
  }
  return product;
}

export async function findActiveByNormalizedName(
  db: DbClient,
  normalized: string,
): Promise<Product | null> {
  const row = await db.getFirstAsync<ProductRecord>(
    `SELECT * FROM products
     WHERE normalized_name = ? AND is_active = 1 AND deleted_at IS NULL
     LIMIT 1`,
    [normalized],
  );
  return row ? mapProduct(row) : null;
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

export async function listCatalog(db: DbClient, options: CatalogOptions = {}): Promise<Product[]> {
  const scope = options.scope ?? 'active';
  const category = options.category ?? 'all';
  const sort = options.sort ?? 'recent';
  const normalized = normalizeName(options.query ?? '');
  const clauses = ['deleted_at IS NULL', 'is_active = ?'];
  const params: SqlValue[] = [scope === 'hidden' ? 0 : 1];

  if (category === 'uncategorized') {
    clauses.push('category_id IS NULL');
  } else if (category !== 'all') {
    clauses.push('category_id = ?');
    params.push(category);
  }

  if (options.viewedOnly) {
    clauses.push('last_viewed_at IS NOT NULL');
  }

  if (normalized) {
    const escaped = escapeLike(normalized);
    clauses.push(
      `(normalized_name = ? OR normalized_name LIKE ? ESCAPE '\\' OR normalized_name LIKE ? ESCAPE '\\')`,
    );
    params.push(normalized, `${escaped}%`, `% ${escaped}%`);
  }

  let orderBy =
    sort === 'name' ? 'name COLLATE NOCASE' : 'last_viewed_at DESC, name COLLATE NOCASE';

  if (normalized) {
    const escaped = escapeLike(normalized);
    orderBy = `CASE WHEN normalized_name = ? THEN 0 WHEN normalized_name LIKE ? ESCAPE '\\' THEN 1 ELSE 2 END, ${orderBy}`;
    params.push(normalized, `${escaped}%`);
  }

  let sql = `SELECT * FROM products WHERE ${clauses.join(' AND ')} ORDER BY ${orderBy}`;
  if (options.limit !== undefined) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  const rows = await db.getAllAsync<ProductRecord>(sql, params);
  return rows.map(mapProduct);
}

export async function listActiveProducts(db: DbClient): Promise<Product[]> {
  return listCatalog(db, { scope: 'active', sort: 'recent' });
}

export async function listRecentProducts(db: DbClient, limit = 20): Promise<Product[]> {
  return listCatalog(db, { scope: 'active', sort: 'recent', limit });
}

export async function listRecentlyViewedProducts(db: DbClient, limit = 8): Promise<Product[]> {
  return listCatalog(db, { scope: 'active', sort: 'recent', viewedOnly: true, limit });
}

export async function countActiveProducts(db: DbClient): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM products WHERE is_active = 1 AND deleted_at IS NULL',
  );
  return Number(row?.n ?? 0);
}

export async function searchProducts(db: DbClient, query: string, limit = 50): Promise<Product[]> {
  const normalized = normalizeName(query);
  if (!normalized) {
    return listRecentProducts(db, limit);
  }

  return listCatalog(db, { query: normalized, scope: 'active', sort: 'recent', limit });
}

export async function createProduct(db: DbClient, input: CreateProductInput): Promise<Product> {
  const parsed = createProductSchema.parse(input);
  const id = createId();
  const timestamp = nowIso();
  const normalized = normalizeName(parsed.name);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO products (
        id, user_id, name, normalized_name, category_id, unit,
        current_stock, current_cost_price, current_selling_price, is_active,
        counted_at, last_viewed_at, created_at, updated_at, deleted_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 1, ?, NULL, ?, ?, NULL)`,
      [
        id,
        parsed.name.trim(),
        normalized,
        parsed.categoryId,
        parsed.unit,
        parsed.openingStockThousandths,
        parsed.costPricePesewas,
        parsed.sellingPricePesewas,
        parsed.openingStockThousandths > 0 ? timestamp : null,
        timestamp,
        timestamp,
      ],
    );

    if (parsed.openingStockThousandths > 0) {
      await db.runAsync(
        `INSERT INTO stock_counts (
          id, user_id, product_id, quantity, counted_at, created_at, updated_at
        ) VALUES (?, NULL, ?, ?, ?, ?, ?)`,
        [createId(), id, parsed.openingStockThousandths, timestamp, timestamp, timestamp],
      );
    }

    if (parsed.costPricePesewas > 0 || parsed.sellingPricePesewas > 0) {
      await db.runAsync(
        `INSERT INTO price_history (
          id, user_id, product_id, purchase_id, cost_price, selling_price, recorded_at, created_at, updated_at
        ) VALUES (?, NULL, ?, NULL, ?, ?, ?, ?, ?)`,
        [createId(), id, parsed.costPricePesewas, parsed.sellingPricePesewas, timestamp, timestamp, timestamp],
      );
    }

    await enqueueSyncEvent(db, {
      entityType: 'product',
      entityId: id,
      operation: 'product.upsert',
      payload: { id, name: parsed.name.trim(), unit: parsed.unit },
    });
  });

  return requireProduct(db, id);
}

export async function markProductViewed(db: DbClient, productId: string): Promise<void> {
  await db.runAsync('UPDATE products SET last_viewed_at = ? WHERE id = ? AND deleted_at IS NULL', [
    nowIso(),
    productId,
  ]);
}

async function setProductActive(db: DbClient, productId: string, isActive: boolean): Promise<void> {
  const timestamp = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE products SET is_active = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      [isActive ? 1 : 0, timestamp, productId],
    );
    await enqueueSyncEvent(db, {
      entityType: 'product',
      entityId: productId,
      operation: 'product.upsert',
      payload: { id: productId, isActive },
    });
  });
}

export async function hideProduct(db: DbClient, productId: string): Promise<void> {
  await setProductActive(db, productId, false);
}

export async function unhideProduct(db: DbClient, productId: string): Promise<void> {
  await setProductActive(db, productId, true);
}

export type ProductImportSummary = {
  imported: number;
  skipped: CsvIssue[];
  failed: CsvIssue[];
};

export async function importCsvProducts(db: DbClient, text: string): Promise<ProductImportSummary> {
  const categories = await listCategories(db);
  const existing = await listActiveProducts(db);
  const parsed = parseProductCsv(text, {
    categories,
    existingNormalizedNames: new Set(existing.map((product) => product.normalizedName)),
  });

  const failed = [...parsed.failed];
  let imported = 0;

  for (const row of parsed.products) {
    try {
      await createProduct(db, row.input);
      imported += 1;
    } catch (error) {
      failed.push({
        row: row.row,
        name: row.input.name,
        reason: userMessage(error, 'We could not save this product.'),
      });
    }
  }

  return { imported, skipped: parsed.skipped, failed };
}
