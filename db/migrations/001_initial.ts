import { DEFAULT_CATEGORIES } from '@/constants/catalog';
import type { DbClient } from '@/db/client';

export const INITIAL_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE app_settings (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  business_name TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'GHS',
  currency_symbol TEXT NOT NULL DEFAULT 'GH₵',
  timezone TEXT NOT NULL DEFAULT 'Africa/Accra',
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE products (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category_id TEXT,
  unit TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  current_cost_price INTEGER NOT NULL DEFAULT 0,
  current_selling_price INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  counted_at TEXT,
  last_viewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX idx_products_normalized_name ON products (normalized_name);
CREATE INDEX idx_products_active ON products (is_active);

CREATE TABLE purchases (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  total_cost INTEGER NOT NULL,
  unit_cost INTEGER NOT NULL,
  selling_price INTEGER NOT NULL,
  purchase_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_purchases_product_date ON purchases (product_id, purchase_date, created_at);

CREATE TABLE price_history (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  product_id TEXT NOT NULL,
  purchase_id TEXT,
  cost_price INTEGER NOT NULL,
  selling_price INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (purchase_id) REFERENCES purchases(id)
);

CREATE INDEX idx_price_history_product ON price_history (product_id, recorded_at);

CREATE TABLE daily_sales (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  sale_date TEXT NOT NULL,
  total_sales INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (sale_date)
);

CREATE TABLE stock_counts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  counted_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  synced_at TEXT
);

CREATE INDEX idx_sync_queue_pending ON sync_queue (synced_at, created_at);
`;

export async function seedDefaultCategories(db: DbClient, nowIso: string): Promise<void> {
  for (const category of DEFAULT_CATEGORIES) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (id, user_id, name, created_at, updated_at, deleted_at)
       VALUES (?, NULL, ?, ?, ?, NULL)`,
      [category.id, category.name, nowIso, nowIso],
    );
  }
}
