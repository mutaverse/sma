import { describe, expect, it } from 'vitest';

import { migrate } from '@/db/migrate';
import { createNodeSqliteClient } from '@/db/node-sqlite';
import { getSettings, upsertSettings } from '@/db/repositories/settings';

describe('shop settings', () => {
  it('has no settings until the shop is named', async () => {
    const db = createNodeSqliteClient();
    await migrate(db);
    expect(await getSettings(db)).toBeNull();
  });

  it('persists the shop name across a second read', async () => {
    const db = createNodeSqliteClient();
    await migrate(db);

    await upsertSettings(db, {
      businessName: "Ama's Mart",
      currencyCode: 'GHS',
      currencySymbol: 'GH₵',
      timezone: 'Africa/Accra',
    });

    const stored = await getSettings(db);
    expect(stored?.businessName).toBe("Ama's Mart");
    expect(stored?.currencyCode).toBe('GHS');
    expect(stored?.timezone).toBe('Africa/Accra');
  });

  it('updates the name without creating a second shop row', async () => {
    const db = createNodeSqliteClient();
    await migrate(db);

    const first = await upsertSettings(db, {
      businessName: 'First Name',
      currencyCode: 'GHS',
      currencySymbol: 'GH₵',
      timezone: 'Africa/Accra',
    });
    const second = await upsertSettings(db, {
      businessName: 'Second Name',
      currencyCode: 'GHS',
      currencySymbol: 'GH₵',
      timezone: 'Africa/Accra',
    });

    expect(second.id).toBe(first.id);
    expect((await getSettings(db))?.businessName).toBe('Second Name');
  });

  it('saves the shop name even if the backup queue write fails', async () => {
    const db = createNodeSqliteClient();
    await migrate(db);

    const failing = {
      ...db,
      runAsync: async (sql: string, params?: (string | number | null)[]) => {
        if (sql.includes('INSERT INTO sync_queue')) {
          throw new Error('queue unavailable');
        }
        return db.runAsync(sql, params);
      },
    };

    const settings = await upsertSettings(failing, {
      businessName: "Ama's Mart",
      currencyCode: 'GHS',
      currencySymbol: 'GH₵',
      timezone: 'Africa/Accra',
    });

    expect(settings.businessName).toBe("Ama's Mart");
    expect((await getSettings(db))?.businessName).toBe("Ama's Mart");
  });
});
