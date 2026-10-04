export const REMOTE_TABLES = [
  'app_settings',
  'categories',
  'products',
  'purchases',
  'price_history',
  'daily_sales',
  'stock_counts',
] as const;

export type RemoteTable = (typeof REMOTE_TABLES)[number];

export const PUSH_ORDER: readonly RemoteTable[] = REMOTE_TABLES;

export const PULL_ORDER: readonly RemoteTable[] = REMOTE_TABLES;

export const TABLE_COLUMNS: Record<RemoteTable, readonly string[]> = {
  app_settings: [
    'id',
    'user_id',
    'business_name',
    'currency_code',
    'currency_symbol',
    'timezone',
    'last_synced_at',
    'created_at',
    'updated_at',
  ],
  categories: ['id', 'user_id', 'name', 'created_at', 'updated_at', 'deleted_at'],
  products: [
    'id',
    'user_id',
    'name',
    'normalized_name',
    'category_id',
    'unit',
    'current_stock',
    'current_cost_price',
    'current_selling_price',
    'is_active',
    'counted_at',
    'last_viewed_at',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  purchases: [
    'id',
    'user_id',
    'product_id',
    'quantity',
    'total_cost',
    'unit_cost',
    'selling_price',
    'purchase_date',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  price_history: [
    'id',
    'user_id',
    'product_id',
    'purchase_id',
    'cost_price',
    'selling_price',
    'recorded_at',
    'created_at',
    'updated_at',
  ],
  daily_sales: [
    'id',
    'user_id',
    'sale_date',
    'total_sales',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  stock_counts: [
    'id',
    'user_id',
    'product_id',
    'quantity',
    'counted_at',
    'created_at',
    'updated_at',
  ],
};

export const LWW_TABLES = new Set<RemoteTable>([
  'app_settings',
  'categories',
  'products',
  'purchases',
  'daily_sales',
]);

export const INSERT_IGNORE_TABLES = new Set<RemoteTable>(['price_history', 'stock_counts']);

export const INTEGER_COLUMNS = new Set([
  'current_stock',
  'current_cost_price',
  'current_selling_price',
  'is_active',
  'quantity',
  'total_cost',
  'unit_cost',
  'selling_price',
  'cost_price',
  'total_sales',
]);

export const SETTINGS_LOCAL_ONLY_COLUMNS = ['last_pulled_at'] as const;
