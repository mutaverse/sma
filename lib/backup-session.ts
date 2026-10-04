import type { Session } from '@supabase/supabase-js';

import { BACKUP_NOT_CONFIGURED } from '@/constants/backup';
import { humanizeBackupError, isAuthFailure } from '@/lib/backup-errors';
import { getSupabaseClient, isBackupConfigured } from '@/lib/supabase';
import { useSyncStore } from '@/store/sync-store';

export async function hydrateBackupSession(): Promise<Session | null> {
  const store = useSyncStore.getState();
  store.setConfigured(isBackupConfigured());

  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    if (store.status !== 'offline') {
      if (store.email || (error && isAuthFailure(error))) {
        store.setStatus('paused');
      } else if (!store.userId) {
        store.setStatus('local');
      }
    }
    if (!data.session) {
      store.setBackupAccount({ email: store.email, userId: null });
    }
    return null;
  }

  applySession(data.session);
  return data.session;
}

export async function saveBackupAccount(email: string, password: string): Promise<Session> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error(BACKUP_NOT_CONFIGURED);
  }

  const trimmedEmail = email.trim().toLowerCase();
  const signIn = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
  if (signIn.data.session) {
    applySession(signIn.data.session);
    return signIn.data.session;
  }

  if (signIn.error && !isInvalidLogin(signIn.error)) {
    throw new Error(humanizeBackupError(signIn.error));
  }

  const signUp = await supabase.auth.signUp({ email: trimmedEmail, password });
  if (signUp.error) {
    throw new Error(humanizeBackupError(signUp.error));
  }

  if (!signUp.data.session) {
    throw new Error('Check your email to finish. Your shop data is still on this phone.');
  }

  applySession(signUp.data.session);
  return signUp.data.session;
}

export async function stopBackupAccount(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase?.auth.signOut();
  const store = useSyncStore.getState();
  store.setBackupAccount({ email: null, userId: null });
  store.setLastError(null);
  if (store.status !== 'offline') {
    store.setStatus('local');
  }
}

function applySession(session: Session): void {
  useSyncStore.getState().setBackupAccount({
    email: session.user.email ?? null,
    userId: session.user.id,
  });
}

function isInvalidLogin(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? '';
  const message = (error.message ?? '').toLowerCase();
  return code === 'invalid_credentials' || message.includes('invalid login') || message.includes('invalid email or password');
}
