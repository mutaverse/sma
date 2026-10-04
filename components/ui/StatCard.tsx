import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  onPress?: () => void;
};

export function StatCard({ label, value, hint, accent = false, onPress }: StatCardProps) {
  const body = (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent ? styles.valueAccent : null]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}. ${hint ?? ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, styles.tappable, pressed ? styles.pressed : null]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  tappable: {
    minHeight: minTouchSize,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 38,
    color: colors.text,
  },
  valueAccent: {
    color: colors.primary,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
