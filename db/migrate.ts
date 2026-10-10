import type { DbClient } from '@/db/client';
import { INITIAL_SCHEMA_SQL, seedDefaultCategories } from '@/db/migrations/001_initial';
import { addLastPulledAt } from '@/db/migrations/002_last_pulled_at';
import { addMomoTransactions } from '@/db/migrations/003_momo_transactions';
import { allowMomoAirtime } from '@/db/migrations/004_momo_airtime';
import { nowIso } from '@/lib/dates';

const MIGRATIONS = [
  {
    version: 1,
    name: '001_initial',
    up: async (db: DbClient) => {
      await db.execAsync(INITIAL_SCHEMA_SQL);
      await seedDefaultCategories(db, nowIso());
    },
  },
  {
    version: 2,
    name: '002_last_pulled_at',
    up: addLastPulledAt,
  },
  {
    version: 3,
    name: '003_momo_transactions',
    up: addMomoTransactions,
  },
  {
    version: 4,
    name: '004_momo_airtime',
    up: allowMomoAirtime,
  },
] as const;

export async function migrate(db: DbClient): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON');

  const hasMigrationsTable = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'`,
  );

  let currentVersion = 0;

  if (hasMigrationsTable) {
    const row = await db.getFirstAsync<{ version: number }>(
      'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations',
    );
    currentVersion = row?.version ?? 0;
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.runAsync('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        migration.version,
        nowIso(),
      ]);
    });
  }
}
