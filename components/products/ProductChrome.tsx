import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type MetricBlockProps = {
  label: string;
  value: string;
  large?: boolean;
};

export function MetricBlock({ label, value, large = false }: MetricBlockProps) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <Text style={large ? styles.largeValue : styles.value}>{value}</Text>
    </View>
  );
}

type HistoryRowProps = {
  date: string;
  cost: string;
  selling: string;
};

export function HistoryRow({ date, cost, selling }: HistoryRowProps) {
  return (
    <View style={styles.history}>
      <Text style={styles.historyDate}>{date}</Text>
      <Text style={styles.historyMeta}>Cost {cost}</Text>
      <Text style={styles.historyMeta}>Selling {selling}</Text>
    </View>
  );
}

type PurchaseHistoryRowProps = {
  date: string;
  quantity: string;
  total: string;
  onUndo?: () => void;
};

export function PurchaseHistoryRow({ date, quantity, total, onUndo }: PurchaseHistoryRowProps) {
  return (
    <View style={styles.history}>
      <View style={styles.historyTop}>
        <Text style={styles.historyDate}>{date}</Text>
        {onUndo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Undo purchase from ${date}`}
            onPress={onUndo}
            hitSlop={8}
            style={({ pressed }) => [styles.undoHit, pressed ? styles.pressed : null]}
          >
            <Text style={styles.undoLabel}>Undo</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.historyMeta}>
        {quantity} · {total}
      </Text>
    </View>
  );
}

type FieldLabelProps = {
  label: string;
  children: ReactNode;
};

export function FieldLabel({ label, children }: FieldLabelProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export function WarningBanner({ message }: { message: string }) {
  return (
    <View style={styles.warning}>
      <Text style={styles.warningText}>{message}</Text>
    </View>
  );
}

export function ConfirmRow({
  confirmLabel,
  onConfirm,
  onCancel,
  disabled,
}: {
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.confirmRow}>
      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        disabled={disabled}
        style={({ pressed }) => [styles.cancel, pressed ? styles.pressed : null]}
      >
        <Text style={styles.cancelLabel}>Cancel</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onConfirm}
        disabled={disabled}
        style={({ pressed }) => [styles.confirm, pressed ? styles.pressed : null, disabled ? styles.disabled : null]}
      >
        <Text style={styles.confirmLabel}>{confirmLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 4,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
  },
  largeValue: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 38,
    color: colors.primary,
  },
  history: {
    gap: 2,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  historyDate: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    flex: 1,
  },
  historyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  undoHit: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  undoLabel: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.primary,
  },
  historyMeta: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  field: {
    gap: spacing.sm,
  },
  warning: {
    backgroundColor: colors.accentMuted,
    borderRadius: 12,
    padding: spacing.lg,
  },
  warningText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.accentText,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancel: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirm: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  cancelLabel: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  confirmLabel: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
