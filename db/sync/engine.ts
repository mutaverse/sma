import type { DbClient } from '@/db/client';
import { pullTables } from '@/db/sync/apply';
import type { BackupRemote } from '@/db/sync/remote';
import { pushAllLocalRows, stampUserId } from '@/db/sync/snapshot';
import { getSettings, setBackupCursors } from '@/db/repositories/settings';
import { bumpPendingAttempts, listPendingSyncEvents, markPendingSynced } from '@/db/repositories/sync-queue';
import { humanizeBackupError } from '@/lib/backup-errors';
import { nowIso } from '@/lib/dates';

export type BackupResult = {
  pushed: number;
  pulled: number;
  skipped: boolean;
};

export async function runBackup(
  db: DbClient,
  remote: BackupRemote,
  options: { userId: string; forceSnapshot?: boolean },
): Promise<BackupResult> {
  const settings = await getSettings(db);
  if (!settings) {
    throw new Error('Name the shop before saving a backup.');
  }

  const preferRemote = settings.lastPulledAt == null;
  const pending = await listPendingSyncEvents(db);

  if (!preferRemote && pending.length === 0 && !options.forceSnapshot) {
    return { pushed: 0, pulled: 0, skipped: true };
  }

  try {
    let pulled = 0;

    if (preferRemote) {
      pulled += await pullTables(db, (table, since) => remote.listUpdatedSince(table, since), {
        force: true,
        since: null,
      });
      await setBackupCursors(db, { userId: options.userId, lastPulledAt: nowIso() });
    }

    await stampUserId(db, options.userId);
    const pushed = await pushAllLocalRows(db, remote);
    await markPendingSynced(db, nowIso());

    const afterPush = await getSettings(db);
    pulled += await pullTables(db, (table, since) => remote.listUpdatedSince(table, since), {
      force: false,
      since: afterPush?.lastPulledAt ?? null,
    });

    const done = nowIso();
    await setBackupCursors(db, {
      userId: options.userId,
      lastSyncedAt: done,
      lastPulledAt: done,
    });

    return { pushed, pulled, skipped: false };
  } catch (error) {
    const message = humanizeBackupError(error);
    await bumpPendingAttempts(db, message);
    throw new Error(message);
  }
}
