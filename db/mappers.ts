import type { ProductUnit } from '@/constants/catalog';
import type {
  CategoryRecord,
  DailySaleRecord,
  PriceHistoryRecord,
  ProductRecord,
  PurchaseRecord,
  SettingsRecord,
  StockCountRecord,
  SyncQueueRecord,
} from '@/types/database';
import type {
  AppSettings,
  Category,
  DailySale,
  PriceHistory,
  Product,
  Purchase,
  StockCount,
  SyncQueueItem,
} from '@/types/domain';
import type { SyncOperation } from '@/constants/catalog';

export function mapProduct(row: ProductRecord): Product {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    normalizedName: row.normalized_name,
    categoryId: row.category_id,
    unit: row.unit as ProductUnit,
    currentStockThousandths: row.current_stock,
    currentCostPesewas: row.current_cost_price,
    currentSellingPesewas: row.current_selling_price,
    isActive: row.is_active === 1,
    countedAt: row.counted_at,
    lastViewedAt: row.last_viewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function mapCategory(row: CategoryRecord): Category {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function mapPurchase(row: PurchaseRecord): Purchase {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    quantityThousandths: row.quantity,
    totalCostPesewas: row.total_cost,
    unitCostPesewas: row.unit_cost,
    sellingPricePesewas: row.selling_price,
    purchaseDate: row.purchase_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function mapPriceHistory(row: PriceHistoryRecord): PriceHistory {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    purchaseId: row.purchase_id,
    costPesewas: row.cost_price,
    sellingPesewas: row.selling_price,
    recordedAt: row.recorded_at,
  };
}

export function mapDailySale(row: DailySaleRecord): DailySale {
  return {
    id: row.id,
    userId: row.user_id,
    saleDate: row.sale_date,
    totalPesewas: row.total_sales,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function mapStockCount(row: StockCountRecord): StockCount {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    quantityThousandths: row.quantity,
    countedAt: row.counted_at,
    createdAt: row.created_at,
  };
}

export function mapSettings(row: SettingsRecord): AppSettings {
  return {
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    currencyCode: row.currency_code,
    currencySymbol: row.currency_symbol,
    timezone: row.timezone,
    lastSyncedAt: row.last_synced_at,
    lastPulledAt: row.last_pulled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSyncQueueItem(row: SyncQueueRecord): SyncQueueItem {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation as SyncOperation,
    payload: row.payload,
    createdAt: row.created_at,
    attempts: row.attempts,
    lastError: row.last_error,
    syncedAt: row.synced_at,
  };
}
