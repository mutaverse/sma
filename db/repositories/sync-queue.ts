import type { DbClient } from '@/db/client';
import { mapSyncQueueItem } from '@/db/mappers';
import { createId } from '@/lib/id';
import { nowIso } from '@/lib/dates';
import type { SyncOperation } from '@/constants/catalog';
import type { SyncQueueItem } from '@/types/domain';
import type { SyncQueueRecord } from '@/types/database';

export async function enqueueSyncEvent(
  db: DbClient,
  input: {
    entityType: string;
    entityId: string;
    operation: SyncOperation;
    payload: unknown;
  },
): Promise<SyncQueueItem> {
  const id = createId();
  const createdAt = nowIso();
  const payload = JSON.stringify(input.payload);

  await db.runAsync(
    `INSERT INTO sync_queue (
      id, entity_type, entity_id, operation, payload, created_at, attempts, last_error, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL)`,
    [id, input.entityType, input.entityId, input.operation, payload, createdAt],
  );

  return {
    id,
    entityType: input.entityType,
    entityId: input.entityId,
    operation: input.operation,
    payload,
    createdAt,
    attempts: 0,
    lastError: null,
    syncedAt: null,
  };
}

export async function listPendingSyncEvents(db: DbClient): Promise<SyncQueueItem[]> {
  const rows = await db.getAllAsync<SyncQueueRecord>(
    'SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC',
  );
  return rows.map(mapSyncQueueItem);
}

export async function markPendingSynced(db: DbClient, syncedAt: string): Promise<void> {
  await db.runAsync(
    'UPDATE sync_queue SET synced_at = ?, last_error = NULL WHERE synced_at IS NULL',
    [syncedAt],
  );
}

export async function bumpPendingAttempts(db: DbClient, error: string): Promise<void> {
  await db.runAsync(
    'UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE synced_at IS NULL',
    [error],
  );
}
