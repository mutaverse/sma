import {
  DEFAULT_CURRENCY_CODE,
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_TIMEZONE,
} from '@/constants/config';
import type { DbClient } from '@/db/client';
import { mapSettings } from '@/db/mappers';
import { enqueueSyncEvent } from '@/db/repositories/sync-queue';
import { nowIso } from '@/lib/dates';
import { upsertSettingsSchema, type UpsertSettingsInput } from '@/lib/validation';
import type { SettingsRecord } from '@/types/database';
import type { AppSettings } from '@/types/domain';

const SETTINGS_ID = '00000000-0000-4000-a000-000000000001';

export async function getSettings(db: DbClient): Promise<AppSettings | null> {
  const row = await db.getFirstAsync<SettingsRecord>('SELECT * FROM app_settings LIMIT 1');
  return row ? mapSettings(row) : null;
}

export async function upsertSettings(db: DbClient, input: UpsertSettingsInput): Promise<AppSettings> {
  const parsed = upsertSettingsSchema.parse(input);
  const existing = await getSettings(db);
  const timestamp = nowIso();
  const id = existing?.id ?? SETTINGS_ID;

  if (existing) {
    await db.runAsync(
      `UPDATE app_settings
       SET business_name = ?, currency_code = ?, currency_symbol = ?, timezone = ?, updated_at = ?
       WHERE id = ?`,
      [parsed.businessName, parsed.currencyCode, parsed.currencySymbol, parsed.timezone, timestamp, id],
    );
  } else {
    await db.runAsync(
      `INSERT INTO app_settings (
        id, user_id, business_name, currency_code, currency_symbol, timezone,
        last_synced_at, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, NULL, ?, ?)`,
      [
        id,
        parsed.businessName,
        parsed.currencyCode,
        parsed.currencySymbol,
        parsed.timezone,
        timestamp,
        timestamp,
      ],
    );
  }

  const settings: AppSettings = {
    id,
    userId: existing?.userId ?? null,
    businessName: parsed.businessName,
    currencyCode: parsed.currencyCode,
    currencySymbol: parsed.currencySymbol,
    timezone: parsed.timezone,
    lastSyncedAt: existing?.lastSyncedAt ?? null,
    lastPulledAt: existing?.lastPulledAt ?? null,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  try {
    await enqueueSyncEvent(db, {
      entityType: 'settings',
      entityId: id,
      operation: 'settings.upsert',
      payload: parsed,
    });
  } catch {
    // The shop name is local-first. Backup queue failures must not block first run.
  }

  return settings;
}

export async function ensureDefaultSettings(db: DbClient): Promise<AppSettings> {
  const existing = await getSettings(db);
  if (existing) {
    return existing;
  }

  return upsertSettings(db, {
    businessName: 'Shop',
    currencyCode: DEFAULT_CURRENCY_CODE,
    currencySymbol: DEFAULT_CURRENCY_SYMBOL,
    timezone: DEFAULT_TIMEZONE,
  });
}

export async function setBackupCursors(
  db: DbClient,
  input: {
    userId?: string | null;
    lastSyncedAt?: string | null;
    lastPulledAt?: string | null;
  },
): Promise<AppSettings | null> {
  const existing = await getSettings(db);
  if (!existing) {
    return null;
  }

  const userId = input.userId === undefined ? existing.userId : input.userId;
  const lastSyncedAt = input.lastSyncedAt === undefined ? existing.lastSyncedAt : input.lastSyncedAt;
  const lastPulledAt = input.lastPulledAt === undefined ? existing.lastPulledAt : input.lastPulledAt;

  await db.runAsync(
    `UPDATE app_settings
     SET user_id = ?, last_synced_at = ?, last_pulled_at = ?
     WHERE id = ?`,
    [userId, lastSyncedAt, lastPulledAt, existing.id],
  );

  return {
    ...existing,
    userId,
    lastSyncedAt,
    lastPulledAt,
  };
}
