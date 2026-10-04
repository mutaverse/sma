import type { RemoteTable } from '@/db/sync/tables';

export type RemoteRow = Record<string, string | number | null>;

export type BackupRemote = {
  upsert: (table: RemoteTable, row: RemoteRow) => Promise<void>;
  listUpdatedSince: (table: RemoteTable, sinceIso: string | null) => Promise<RemoteRow[]>;
};

export class MemoryCloud {
  private readonly rows = new Map<string, RemoteRow>();

  remote(userId: string): BackupRemote {
    return {
      upsert: async (table, row) => {
        const id = String(row.id ?? '');
        this.rows.set(storageKey(table, userId, id), { ...row, user_id: userId });
      },
      listUpdatedSince: async (table, sinceIso) => {
        const prefix = `${table}:${userId}:`;
        const matches: RemoteRow[] = [];
        for (const [key, row] of this.rows) {
          if (!key.startsWith(prefix)) {
            continue;
          }
          if (sinceIso && String(row.updated_at ?? '') <= sinceIso) {
            continue;
          }
          matches.push({ ...row });
        }
        return matches;
      },
    };
  }

  count(table: RemoteTable, userId: string): number {
    const prefix = `${table}:${userId}:`;
    let total = 0;
    for (const key of this.rows.keys()) {
      if (key.startsWith(prefix)) {
        total += 1;
      }
    }
    return total;
  }
}

export function createThrowingRemote(message: string): BackupRemote {
  return {
    upsert: async () => {
      throw new Error(message);
    },
    listUpdatedSince: async () => {
      throw new Error(message);
    },
  };
}

export function createFlakyRemote(
  inner: BackupRemote,
  failures: { remaining: number; message: string },
): BackupRemote {
  return {
    upsert: async (table, row) => {
      if (failures.remaining > 0) {
        failures.remaining -= 1;
        throw new Error(failures.message);
      }
      return inner.upsert(table, row);
    },
    listUpdatedSince: (table, sinceIso) => inner.listUpdatedSince(table, sinceIso),
  };
}

function storageKey(table: RemoteTable, userId: string, id: string): string {
  return `${table}:${userId}:${id}`;
}
