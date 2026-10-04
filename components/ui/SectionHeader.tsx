import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type SectionHeaderProps = {
  title: string;
  action?: ReactNode;
};

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
});
