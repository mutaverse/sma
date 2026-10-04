export type ProductRecord = {
  id: string;
  user_id: string | null;
  name: string;
  normalized_name: string;
  category_id: string | null;
  unit: string;
  current_stock: number;
  current_cost_price: number;
  current_selling_price: number;
  is_active: number;
  counted_at: string | null;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CategoryRecord = {
  id: string;
  user_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PurchaseRecord = {
  id: string;
  user_id: string | null;
  product_id: string;
  quantity: number;
  total_cost: number;
  unit_cost: number;
  selling_price: number;
  purchase_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PriceHistoryRecord = {
  id: string;
  user_id: string | null;
  product_id: string;
  purchase_id: string | null;
  cost_price: number;
  selling_price: number;
  recorded_at: string;
  created_at: string;
  updated_at: string;
};

export type DailySaleRecord = {
  id: string;
  user_id: string | null;
  sale_date: string;
  total_sales: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StockCountRecord = {
  id: string;
  user_id: string | null;
  product_id: string;
  quantity: number;
  counted_at: string;
  created_at: string;
  updated_at: string;
};

export type SettingsRecord = {
  id: string;
  user_id: string | null;
  business_name: string;
  currency_code: string;
  currency_symbol: string;
  timezone: string;
  last_synced_at: string | null;
  last_pulled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SyncQueueRecord = {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: string;
  created_at: string;
  attempts: number;
  last_error: string | null;
  synced_at: string | null;
};
