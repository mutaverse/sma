import { useMemo } from 'react';
import * as SQLite from 'expo-sqlite';

import type { DbClient } from '@/db/client';

export const DATABASE_NAME = 'shop.db';

export function wrapExpoDatabase(db: SQLite.SQLiteDatabase): DbClient {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params = []) => {
      const result = await db.runAsync(sql, params);
      return {
        changes: result.changes,
        lastInsertRowId: Number(result.lastInsertRowId),
      };
    },
    getFirstAsync: (sql, params = []) => db.getFirstAsync(sql, params),
    getAllAsync: (sql, params = []) => db.getAllAsync(sql, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

export function useShopDatabase(): DbClient {
  const sqlite = SQLite.useSQLiteContext();
  return useMemo(() => wrapExpoDatabase(sqlite), [sqlite]);
}

export async function openShopDatabase(): Promise<DbClient> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  return wrapExpoDatabase(db);
}
