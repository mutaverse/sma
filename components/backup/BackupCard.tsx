import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SyncStatusChip } from '@/components/ui/SyncStatusChip';
import {
  BACKUP_NEEDS_INTERNET_ONCE,
  BACKUP_NOT_CONFIGURED,
  BACKUP_STILL_ON_PHONE,
} from '@/constants/backup';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { requestBackup } from '@/lib/backup-runner';
import { saveBackupAccount, stopBackupAccount } from '@/lib/backup-session';
import { formatRelativeTime } from '@/lib/dates';
import { userMessage } from '@/lib/errors';
import { isBackupConfigured } from '@/lib/supabase';
import { useAppStore } from '@/store/app-store';
import { useSyncStore } from '@/store/sync-store';

export function BackupCard() {
  const db = useShopDatabase();
  const settings = useAppStore((state) => state.settings);
  const status = useSyncStore((state) => state.status);
  const configured = isBackupConfigured();
  const online = useSyncStore((state) => state.online);
  const email = useSyncStore((state) => state.email);
  const userId = useSyncStore((state) => state.userId);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt) ?? settings?.lastSyncedAt ?? null;
  const lastError = useSyncStore((state) => state.lastError);

  const [emailInput, setEmailInput] = useState(email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (email) {
      setEmailInput(email);
    }
  }, [email]);

  const signedIn = Boolean(userId);
  const trimmedEmail = emailInput.trim();
  const canSubmit = Boolean(trimmedEmail && password) && !busy && online;

  async function handleSaveBackup() {
    if (!canSubmit) {
      return;
    }

    setBusy(true);
    setFormError(null);

    try {
      await saveBackupAccount(trimmedEmail, password);
      setPassword('');
      const result = await requestBackup(db, { force: true });
      if (!result.ok) {
        setFormError(result.error);
      }
    } catch (caught) {
      setFormError(userMessage(caught, BACKUP_STILL_ON_PHONE));
    } finally {
      setBusy(false);
    }
  }

  async function handleBackupNow() {
    setBusy(true);
    setFormError(null);
    try {
      const result = await requestBackup(db, { force: true });
      if (!result.ok) {
        setFormError(result.error);
      }
    } catch (caught) {
      setFormError(userMessage(caught, BACKUP_STILL_ON_PHONE));
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    setFormError(null);
    try {
      await stopBackupAccount();
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SectionHeader title="Backup" action={<SyncStatusChip />} />
      {!configured ? (
        <Text style={styles.body}>{BACKUP_NOT_CONFIGURED}</Text>
      ) : signedIn ? (
        <SignedInBackup
          email={email ?? trimmedEmail}
          lastSyncedAt={lastSyncedAt}
          lastError={formError ?? lastError}
          status={status}
          busy={busy}
          online={online}
          onBackupNow={() => {
            void handleBackupNow();
          }}
          onStop={() => {
            void handleStop();
          }}
        />
      ) : (
        <SignInBackup
          email={emailInput}
          password={password}
          busy={busy}
          online={online}
          canSubmit={canSubmit}
          error={formError ?? lastError}
          onChangeEmail={setEmailInput}
          onChangePassword={setPassword}
          onSubmit={() => {
            void handleSaveBackup();
          }}
        />
      )}
    </>
  );
}

function SignInBackup({
  email,
  password,
  busy,
  online,
  canSubmit,
  error,
  onChangeEmail,
  onChangePassword,
  onSubmit,
}: {
  email: string;
  password: string;
  busy: boolean;
  online: boolean;
  canSubmit: boolean;
  error: string | null;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.body}>
        Your shop data lives on this phone first. Sign in to save a copy in the cloud so a new phone
        can restore it.
      </Text>
      <Text style={styles.body}>{BACKUP_NEEDS_INTERNET_ONCE}</Text>
      {!online ? (
        <Text style={styles.error}>Connect to the internet this once to save a backup.</Text>
      ) : null}
      <Input
        label="Email"
        value={email}
        onChangeText={onChangeEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={onChangePassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        autoComplete="password"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={busy ? 'Saving backup…' : 'Save a backup'}
        onPress={onSubmit}
        disabled={!canSubmit}
      />
    </View>
  );
}

function SignedInBackup({
  email,
  lastSyncedAt,
  lastError,
  status,
  busy,
  online,
  onBackupNow,
  onStop,
}: {
  email: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  status: string;
  busy: boolean;
  online: boolean;
  onBackupNow: () => void;
  onStop: () => void;
}) {
  const syncedLabel = lastSyncedAt ? formatRelativeTime(lastSyncedAt) : 'Not yet';

  return (
    <View style={styles.block}>
      <Text style={styles.body}>Backups save when this phone is online. The shop still works if they pause.</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Signed in</Text>
        <Text style={styles.value}>{email}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Last synced</Text>
        <Text style={styles.value}>{syncedLabel}</Text>
      </View>
      <Badge
        label={status === 'offline' ? 'No internet' : status === 'paused' ? 'Backup paused' : 'Cloud backup on'}
        variant={status === 'synced' ? 'success' : 'neutral'}
      />
      {lastError && status !== 'synced' ? <Text style={styles.error}>{lastError}</Text> : null}
      <Button
        label={busy ? 'Saving…' : status === 'failed' || status === 'paused' ? 'Try again' : 'Back up now'}
        onPress={onBackupNow}
        disabled={busy || !online}
      />
      <Button label="Stop using this backup" variant="secondary" onPress={onStop} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.md,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
});
