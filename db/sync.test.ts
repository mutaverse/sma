import { describe, expect, it } from 'vitest';

import { BACKUP_PAUSED, BACKUP_STILL_ON_PHONE } from '@/constants/backup';
import { migrate } from '@/db/migrate';
import { createNodeSqliteClient } from '@/db/node-sqlite';
import { createProduct, listActiveProducts, searchProducts } from '@/db/repositories/products';
import { getDailySale, upsertDailySales } from '@/db/repositories/sales';
import { getSettings, upsertSettings } from '@/db/repositories/settings';
import { listPendingSyncEvents } from '@/db/repositories/sync-queue';
import { runBackup } from '@/db/sync/engine';
import { createFlakyRemote, createThrowingRemote, MemoryCloud } from '@/db/sync/remote';

const OWNER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

async function openShop(name: string) {
  const db = createNodeSqliteClient();
  await migrate(db);
  await upsertSettings(db, {
    businessName: name,
    currencyCode: 'GHS',
    currencySymbol: 'GH₵',
    timezone: 'Africa/Accra',
  });
  return db;
}

async function stockMilo(db: ReturnType<typeof createNodeSqliteClient>) {
  return createProduct(db, {
    name: 'Milo 400g',
    unit: 'pack',
    categoryId: null,
    sellingPricePesewas: 2800,
    costPricePesewas: 2350,
    openingStockThousandths: 24000,
  });
}

describe('cloud backup engine', () => {
  it('uploads once when the same workday is synced twice', async () => {
    const db = await openShop("Ama's Mart");
    await stockMilo(db);
    await upsertDailySales(db, { saleDate: '2026-09-16', totalSalesPesewas: 42000 });

    const cloud = new MemoryCloud();
    const remote = cloud.remote(OWNER_A);

    await runBackup(db, remote, { userId: OWNER_A });
    const second = await runBackup(db, remote, { userId: OWNER_A, forceSnapshot: true });

    expect(second.skipped).toBe(false);
    expect(cloud.count('products', OWNER_A)).toBe(1);
    expect(cloud.count('daily_sales', OWNER_A)).toBe(1);
    expect(await listPendingSyncEvents(db)).toEqual([]);
    expect((await getSettings(db))?.userId).toBe(OWNER_A);
  });

  it('skips a quiet second pass after the queue is empty', async () => {
    const db = await openShop("Ama's Mart");
    await stockMilo(db);
    const remote = new MemoryCloud().remote(OWNER_A);

    await runBackup(db, remote, { userId: OWNER_A });
    const again = await runBackup(db, remote, { userId: OWNER_A });

    expect(again).toEqual({ pushed: 0, pulled: 0, skipped: true });
  });

  it('restores the shop onto a new phone after sign-in', async () => {
    const original = await openShop("Ama's Mart");
    const milo = await stockMilo(original);
    await upsertDailySales(original, { saleDate: '2026-09-16', totalSalesPesewas: 42000 });

    const cloud = new MemoryCloud();
    await runBackup(original, cloud.remote(OWNER_A), { userId: OWNER_A });

    const restored = await openShop('Temporary name');
    await runBackup(restored, cloud.remote(OWNER_A), { userId: OWNER_A });

    expect((await getSettings(restored))?.businessName).toBe("Ama's Mart");
    const products = await listActiveProducts(restored);
    expect(products.map((product) => product.name)).toContain('Milo 400g');
    expect(products.find((product) => product.id === milo.id)?.currentSellingPesewas).toBe(2800);
    expect((await getDailySale(restored, '2026-09-16'))?.totalPesewas).toBe(42000);
  });

  it('hides one owner’s rows from another owner', async () => {
    const ownerA = await openShop("Ama's Mart");
    await stockMilo(ownerA);

    const cloud = new MemoryCloud();
    await runBackup(ownerA, cloud.remote(OWNER_A), { userId: OWNER_A });

    const ownerB = await openShop("Kojo's Store");
    await runBackup(ownerB, cloud.remote(OWNER_B), { userId: OWNER_B });

    expect(cloud.count('products', OWNER_A)).toBe(1);
    expect(cloud.count('products', OWNER_B)).toBe(0);
    expect(await listActiveProducts(ownerB)).toEqual([]);
    expect(await searchProducts(ownerB, 'milo')).toEqual([]);
  });

  it('keeps the shop usable when the cloud is unreachable', async () => {
    const db = await openShop("Ama's Mart");
    await stockMilo(db);

    await expect(runBackup(db, createThrowingRemote('Failed to fetch'), { userId: OWNER_A })).rejects.toThrow(
      BACKUP_STILL_ON_PHONE,
    );

    expect((await searchProducts(db, 'milo'))[0]?.name).toBe('Milo 400g');
    const pending = await listPendingSyncEvents(db);
    expect(pending.length).toBeGreaterThan(0);
    expect(pending[0]?.attempts).toBe(1);
    expect(pending[0]?.lastError).toBe(BACKUP_STILL_ON_PHONE);
    expect(pending[0]?.lastError).not.toMatch(/jwt/i);
  });

  it('never writes JWT expired onto the queue', async () => {
    const db = await openShop("Ama's Mart");
    await stockMilo(db);

    await expect(runBackup(db, createThrowingRemote('JWT expired'), { userId: OWNER_A })).rejects.toThrow(
      BACKUP_PAUSED,
    );

    const pending = await listPendingSyncEvents(db);
    expect(pending[0]?.lastError).toBe(BACKUP_PAUSED);
    expect(pending[0]?.lastError).not.toMatch(/jwt/i);
  });

  it('retries a failed backup without duplicating products', async () => {
    const db = await openShop("Ama's Mart");
    await stockMilo(db);

    const cloud = new MemoryCloud();
    const flaky = createFlakyRemote(cloud.remote(OWNER_A), {
      remaining: 1,
      message: 'Failed to fetch',
    });

    await expect(runBackup(db, flaky, { userId: OWNER_A })).rejects.toThrow(BACKUP_STILL_ON_PHONE);
    await runBackup(db, flaky, { userId: OWNER_A });

    expect(cloud.count('products', OWNER_A)).toBe(1);
    expect(await listPendingSyncEvents(db)).toEqual([]);
  });
});
