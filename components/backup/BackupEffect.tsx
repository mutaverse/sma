import { useEffect } from 'react';

import { useShopDatabase } from '@/db/database';
import { requestBackup } from '@/lib/backup-runner';
import { hydrateBackupSession } from '@/lib/backup-session';
import { isBackupConfigured } from '@/lib/supabase';
import { useAppStore } from '@/store/app-store';
import { useSyncStore } from '@/store/sync-store';

export function BackupEffect() {
  const db = useShopDatabase();
  const userId = useSyncStore((state) => state.userId);
  const online = useSyncStore((state) => state.online);
  const reconnectAt = useSyncStore((state) => state.reconnectAt);

  useEffect(() => {
    const store = useSyncStore.getState();
    store.setConfigured(isBackupConfigured());
    const lastSyncedAt = useAppStore.getState().settings?.lastSyncedAt ?? null;
    if (lastSyncedAt) {
      store.setLastSyncedAt(lastSyncedAt);
    }

    void hydrateBackupSession().then((session) => {
      if (session && useSyncStore.getState().online) {
        void requestBackup(db);
      }
    });
  }, [db]);

  useEffect(() => {
    if (!userId || !online) {
      return;
    }
    void requestBackup(db);
  }, [db, userId, online, reconnectAt]);

  useEffect(() => {
    if (!userId || !online) {
      return;
    }

    const timer = setInterval(() => {
      void requestBackup(db);
    }, 45_000);

    return () => clearInterval(timer);
  }, [db, userId, online]);

  return null;
}
