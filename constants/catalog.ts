export const PRODUCT_UNITS = [
  'piece',
  'bottle',
  'pack',
  'bag',
  'box',
  'kg',
  'litre',
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const MOMO_PROVIDERS = ['MTN', 'Telecel', 'AirtelTigo'] as const;
export type MomoProvider = (typeof MOMO_PROVIDERS)[number];

export const MOMO_TRANSACTION_TYPES = ['cash_in', 'cash_out', 'airtime'] as const;
export type MomoTransactionType = (typeof MOMO_TRANSACTION_TYPES)[number];

export const SYNC_OPERATIONS = [
  'product.upsert',
  'category.upsert',
  'purchase.recorded',
  'purchase.undone',
  'sale.upsert',
  'stock.count_set',
  'settings.upsert',
  'momo.upsert',
] as const;

export type SyncOperation = (typeof SYNC_OPERATIONS)[number];

export const DEFAULT_CATEGORIES = [
  { id: '7c2f1a90-4b6e-4d11-9f3a-000000000001', name: 'Drinks' },
  { id: '7c2f1a90-4b6e-4d11-9f3a-000000000002', name: 'Food' },
  { id: '7c2f1a90-4b6e-4d11-9f3a-000000000003', name: 'Toiletries' },
  { id: '7c2f1a90-4b6e-4d11-9f3a-000000000004', name: 'Household' },
  { id: '7c2f1a90-4b6e-4d11-9f3a-000000000005', name: 'Snacks' },
  { id: '7c2f1a90-4b6e-4d11-9f3a-000000000006', name: 'Baby Products' },
] as const;
