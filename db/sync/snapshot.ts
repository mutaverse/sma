import type { DbClient } from '@/db/client';
import type { BackupRemote, RemoteRow } from '@/db/sync/remote';
import { PUSH_ORDER, TABLE_COLUMNS, type RemoteTable } from '@/db/sync/tables';

const STAMP_TABLES: readonly RemoteTable[] = PUSH_ORDER;

export async function stampUserId(db: DbClient, userId: string): Promise<void> {
  for (const table of STAMP_TABLES) {
    await db.runAsync(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`, [userId]);
  }
}

export async function pushAllLocalRows(db: DbClient, remote: BackupRemote): Promise<number> {
  let pushed = 0;
  for (const table of PUSH_ORDER) {
    const rows = await db.getAllAsync<RemoteRow>(`SELECT * FROM ${table}`);
    for (const row of rows) {
      const payload: RemoteRow = {};
      for (const column of TABLE_COLUMNS[table]) {
        payload[column] = row[column] ?? null;
      }
      await remote.upsert(table, payload);
      pushed += 1;
    }
  }
  return pushed;
}
