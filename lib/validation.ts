import { z } from 'zod';

import { PRODUCT_UNITS } from '@/constants/catalog';
import { isCalendarDate } from '@/lib/dates';

const uuid = z.uuid();

export const calendarDateSchema = z.string().refine(isCalendarDate, {
  message: 'Enter a valid date.',
});

export const productUnitSchema = z.enum(PRODUCT_UNITS);

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Enter a product name.'),
  unit: productUnitSchema,
  categoryId: uuid.nullable(),
  sellingPricePesewas: z.number().int().nonnegative(),
  costPricePesewas: z.number().int().nonnegative(),
  openingStockThousandths: z.number().int().nonnegative(),
});

export const recordPurchaseSchema = z.object({
  productId: uuid,
  quantityThousandths: z.number().int().positive('Quantity must be greater than zero.'),
  totalCostPesewas: z.number().int().nonnegative('Total cost cannot be negative.'),
  sellingPricePesewas: z.number().int().positive('Selling price must be greater than zero.'),
  purchaseDate: calendarDateSchema,
});

export const recordStockCountSchema = z.object({
  productId: uuid,
  quantityThousandths: z.number().int().nonnegative(),
  countedAt: z.string().min(1),
});

export const upsertDailySalesSchema = z.object({
  saleDate: calendarDateSchema,
  totalSalesPesewas: z.number().int().nonnegative('Sales cannot be negative.'),
});

export const upsertSettingsSchema = z.object({
  businessName: z.string().trim().min(1, 'Enter the shop name.'),
  currencyCode: z.string().min(1),
  currencySymbol: z.string().min(1),
  timezone: z.string().min(1),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type RecordPurchaseInput = z.infer<typeof recordPurchaseSchema>;
export type RecordStockCountInput = z.infer<typeof recordStockCountSchema>;
export type UpsertDailySalesInput = z.infer<typeof upsertDailySalesSchema>;
export type UpsertSettingsInput = z.infer<typeof upsertSettingsSchema>;
