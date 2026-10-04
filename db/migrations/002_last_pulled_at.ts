import type { DbClient } from '@/db/client';

export async function addLastPulledAt(db: DbClient): Promise<void> {
  await db.execAsync('ALTER TABLE app_settings ADD COLUMN last_pulled_at TEXT');
}
