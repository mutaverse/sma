import type { DbClient } from '@/db/client';
import { getSettings } from '@/db/repositories/settings';
import { runBackup, type BackupResult } from '@/db/sync/engine';
import { createSupabaseRemote } from '@/db/sync/supabase-remote';
import { BACKUP_PAUSED, humanizeBackupError, isAuthFailure } from '@/lib/backup-errors';
import { getSupabaseClient, isBackupConfigured } from '@/lib/supabase';
import { useAppStore } from '@/store/app-store';
import { useSyncStore } from '@/store/sync-store';

export type BackupRun =
  | { ok: true; result: BackupResult }
  | { ok: true; skipped: true }
  | { ok: false; error: string };

const BACKOFF_MS = [0, 2_000, 8_000, 30_000, 120_000, 300_000];

let inFlight: Promise<BackupRun> | null = null;
let retryNotBefore = 0;
let failAttempts = 0;

export function requestBackup(db: DbClient, options?: { force?: boolean }): Promise<BackupRun> {
  if (inFlight) {
    return inFlight;
  }

  inFlight = runRequestedBackup(db, options?.force ?? false).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runRequestedBackup(db: DbClient, force: boolean): Promise<BackupRun> {
  const store = useSyncStore.getState();
  store.setConfigured(isBackupConfigured());

  if (!isBackupConfigured()) {
    return { ok: true, skipped: true };
  }

  if (!store.online && !force) {
    store.setStatus('offline');
    return { ok: true, skipped: true };
  }

  if (!force && Date.now() < retryNotBefore) {
    return { ok: true, skipped: true };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: true, skipped: true };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    if (store.status !== 'offline') {
      store.setStatus(store.email || (error && isAuthFailure(error)) ? 'paused' : 'local');
    }
    store.setBackupAccount({ email: store.email, userId: null });
    return { ok: true, skipped: true };
  }

  store.setBackupAccount({
    email: data.session.user.email ?? null,
    userId: data.session.user.id,
  });
  store.setStatus('syncing');
  store.setLastError(null);

  try {
    const remote = createSupabaseRemote(supabase, data.session.user.id);
    const result = await runBackup(db, remote, {
      userId: data.session.user.id,
      forceSnapshot: force,
    });
    const settings = await getSettings(db);
    if (settings) {
      useAppStore.getState().setSettings(settings);
      store.setLastSyncedAt(settings.lastSyncedAt);
    }
    store.setStatus(store.online ? 'synced' : 'offline');
    failAttempts = 0;
    retryNotBefore = 0;
    return { ok: true, result };
  } catch (caught) {
    failAttempts += 1;
    retryNotBefore = Date.now() + BACKOFF_MS[Math.min(failAttempts, BACKOFF_MS.length - 1)];
    const message = humanizeBackupError(caught);
    store.setLastError(message);
    if (isAuthFailure(caught) || message === BACKUP_PAUSED) {
      store.setStatus('paused');
      store.setBackupAccount({ email: store.email, userId: null });
    } else if (!store.online) {
      store.setStatus('offline');
    } else {
      store.setStatus('failed');
    }
    return { ok: false, error: message };
  }
}
