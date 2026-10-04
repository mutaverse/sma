import type { SupabaseClient } from '@supabase/supabase-js';

import type { BackupRemote, RemoteRow } from '@/db/sync/remote';

export function createSupabaseRemote(client: SupabaseClient, userId: string): BackupRemote {
  return {
    upsert: async (table, row) => {
      const { error } = await client.from(table).upsert(
        { ...row, user_id: userId },
        { onConflict: 'user_id,id' },
      );
      if (error) {
        throw error;
      }
    },
    listUpdatedSince: async (table, sinceIso) => {
      let query = client.from(table).select('*').eq('user_id', userId);
      if (sinceIso) {
        query = query.gt('updated_at', sinceIso);
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return (data ?? []) as RemoteRow[];
    },
  };
}
