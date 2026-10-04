import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type BadgeVariant = 'neutral' | 'accent' | 'success';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  neutral: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accent: {
    backgroundColor: colors.accentMuted,
  },
  success: {
    backgroundColor: colors.primaryMuted,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  neutralText: {
    color: colors.textSecondary,
  },
  accentText: {
    color: colors.accentText,
  },
  successText: {
    color: colors.primary,
  },
});
