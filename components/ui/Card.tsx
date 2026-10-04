import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@/constants/colors';
import { radii, spacing } from '@/constants/layout';

type CardProps = ViewProps & {
  children: ReactNode;
};

export function Card({ children, style, ...rest }: CardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
});
