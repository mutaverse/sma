import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type InputProps = TextInputProps & {
  label?: string;
};

export function Input({ label, style, ...rest }: InputProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.field, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  field: {
    minHeight: minTouchSize,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
});
