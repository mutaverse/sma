import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

type TextVariant = 'title' | 'section' | 'body' | 'label' | 'muted' | 'small' | 'metric';

type AppTextProps = TextProps & {
  variant?: TextVariant;
};

export function AppText({ variant = 'body', style, ...props }: AppTextProps) {
  return <Text style={[styles.base, styles[variant], style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    color: colors.foreground,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
  },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  muted: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
  small: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  metric: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
  },
});
