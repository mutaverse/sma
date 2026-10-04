import type { ProductUnit, SyncOperation } from '@/constants/catalog';

export type Product = {
  id: string;
  userId: string | null;
  name: string;
  normalizedName: string;
  categoryId: string | null;
  unit: ProductUnit;
  currentStockThousandths: number;
  currentCostPesewas: number;
  currentSellingPesewas: number;
  isActive: boolean;
  countedAt: string | null;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Category = {
  id: string;
  userId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Purchase = {
  id: string;
  userId: string | null;
  productId: string;
  quantityThousandths: number;
  totalCostPesewas: number;
  unitCostPesewas: number;
  sellingPricePesewas: number;
  purchaseDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type PriceHistory = {
  id: string;
  userId: string | null;
  productId: string;
  purchaseId: string | null;
  costPesewas: number;
  sellingPesewas: number;
  recordedAt: string;
};

export type DailySale = {
  id: string;
  userId: string | null;
  saleDate: string;
  totalPesewas: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type StockCount = {
  id: string;
  userId: string | null;
  productId: string;
  quantityThousandths: number;
  countedAt: string;
  createdAt: string;
};

export type AppSettings = {
  id: string;
  userId: string | null;
  businessName: string;
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  lastSyncedAt: string | null;
  lastPulledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SyncQueueItem = {
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: string;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  syncedAt: string | null;
};
