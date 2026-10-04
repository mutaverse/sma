import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useSyncStore, type SyncStatus } from '@/store/sync-store';

const copy: Record<SyncStatus, { label: string; hint: string }> = {
  offline: { label: 'Offline', hint: 'Works without internet' },
  local: { label: 'On this phone', hint: 'Backup not set up yet' },
  paused: { label: 'Backup paused', hint: 'Shop still works on this phone' },
  syncing: { label: 'Syncing…', hint: 'Saving a backup' },
  synced: { label: 'Synced', hint: 'Backup is up to date' },
  failed: { label: 'Sync failed', hint: 'Data is still on this phone' },
};

export function SyncStatusChip() {
  const status = useSyncStore((state) => state.status);
  const { label, hint } = copy[status];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${label}. ${hint}`}
      style={styles.chip}
    >
      <View style={[styles.dot, styles[status]]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  offline: {
    backgroundColor: colors.textSecondary,
  },
  local: {
    backgroundColor: colors.primary,
  },
  syncing: {
    backgroundColor: colors.accent,
  },
  synced: {
    backgroundColor: colors.primary,
  },
  failed: {
    backgroundColor: colors.error,
  },
  paused: {
    backgroundColor: colors.accent,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
});
